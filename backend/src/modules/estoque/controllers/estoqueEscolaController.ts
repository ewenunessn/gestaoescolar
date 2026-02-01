// Controller de estoque escolar para PostgreSQL
import { Request, Response } from "express";
import { z } from 'zod';
import {
  estoqueMovimentacaoSchema,
  estoqueAtualizacaoLoteSchema,
  idSchema
} from '../../../schemas';
/**
 * Extrai o tenant ID da requisição
 * IMPORTANTE: Prioriza o header X-Tenant-ID (enviado pelo frontend) sobre o tenant do usuário
 * O tenant do usuário é apenas para autenticação, não para filtrar dados
 */
function getTenantIdFromUser(req: Request): string | null {
  // 1. PRIORIDADE: header X-Tenant-ID (enviado pelo frontend para indicar qual tenant está sendo usado)
  const tenantFromHeader = req.headers['x-tenant-id'] as string;
  if (tenantFromHeader) {
    console.log(`📋 Tenant extraído do header X-Tenant-ID: ${tenantFromHeader}`);
    return tenantFromHeader;
  }

  // 2. Fallback: tenant do middleware (extraído do token JWT ou subdomínio)
  const tenantFromMiddleware = (req as any).tenant?.id;
  if (tenantFromMiddleware) {
    console.log(`🔐 Tenant extraído do middleware: ${tenantFromMiddleware}`);
    return tenantFromMiddleware;
  }

  console.log('⚠️  Nenhum tenant encontrado na requisição');
  return null;
}
import { 
  tenantInventoryValidator, 
  handleTenantInventoryError,
  TenantOwnershipError,
  TenantContextMissingError,
  TenantInventoryNotFoundError,
  TenantInventoryConflictError,
  TenantInventoryInsufficientStockError,
  logTenantInventoryOperation
} from '../../../services/tenantInventoryValidator';
import {
  cacheTenantEstoqueEscola,
  cacheTenantEstoqueResumo,
  cacheTenantEstoqueProduto,
  cacheTenantEstoqueLotes,
  invalidateTenantCacheOnEstoqueChange,
  withTenantCache,
  getTenantIdFromRequest
} from '../../../utils/tenantInventoryCache';
const db = require("../../../database");

export async function listarEstoqueEscola(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    // Extrair tenant do usuário logado (do token JWT via middleware)
    const tenantId = (req as any).tenant?.id || req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se a escola pertence ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));

    // CACHE DESABILITADO - sempre buscar dados atualizados do banco
    // const cachedData = await cacheTenantEstoqueEscola.get(parseInt(escola_id));
    // if (cachedData) {
    //   console.log(`🎯 Cache hit for tenant ${tenantId} school ${escola_id} inventory`);
    //   return res.json({
    //     success: true,
    //     data: (cachedData as any).estoque,
    //     total: (cachedData as any).estoque.length,
    //     cached: true
    //   });
    // }

    // Query simples e direta - sem otimizações complexas
    const estoqueResult = await db.query(`
      SELECT 
        ee.id,
        ee.escola_id,
        ee.produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        ee.quantidade_atual,
        ee.data_validade,
        ee.data_entrada,
        ee.updated_at as data_ultima_atualizacao,
        CASE 
          WHEN ee.quantidade_atual = 0 THEN 'sem_estoque'
          WHEN ee.data_validade IS NOT NULL AND ee.data_validade < CURRENT_DATE THEN 'vencido'
          WHEN ee.data_validade IS NOT NULL AND ee.data_validade <= CURRENT_DATE + INTERVAL '7 days' THEN 'critico'
          WHEN ee.data_validade IS NOT NULL AND ee.data_validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'atencao'
          ELSE 'normal'
        END as status_estoque,
        CASE 
          WHEN ee.data_validade IS NOT NULL THEN (ee.data_validade - CURRENT_DATE)::integer
          ELSE NULL
        END as dias_para_vencimento
      FROM produtos p
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = $1 AND ee.tenant_id = $2)
      WHERE p.ativo = true AND p.tenant_id = $2
      ORDER BY p.categoria NULLS LAST, p.nome
    `, [escola_id]);
    
    const estoque = estoqueResult.rows.map(item => ({
      ...item,
      quantidade_atual: item.quantidade_atual || 0,
      lotes: [] // Será preenchido abaixo se houver estoque
    }));

    // A query otimizada já inclui os lotes agregados
    // Buscar lotes detalhados apenas se necessário
    const produtosComEstoque = estoque.filter(item => item.quantidade_atual > 0).map(item => item.produto_id);

    if (produtosComEstoque.length > 0) {
      try {
        const lotesResult = await db.query(`
          SELECT 
            el.id,
            el.produto_id,
            el.lote,
            el.quantidade_inicial,
            el.quantidade_atual,
            el.data_validade,
            el.data_fabricacao,
            el.status,
            el.observacoes
          FROM estoque_lotes el
          WHERE el.produto_id = ANY($1) 
            AND el.escola_id = $2
            AND el.tenant_id = $3
            AND (el.status = 'ativo' OR el.status = 'esgotado')
          ORDER BY 
            el.produto_id,
            el.status DESC, -- Ativos primeiro, depois esgotados
            CASE WHEN el.data_validade IS NULL THEN 1 ELSE 0 END,
            el.data_validade ASC
        `, [produtosComEstoque, escola_id]);

        // Agrupar lotes por produto_id
        const lotesPorProduto = {};
        lotesResult.rows.forEach(lote => {
          if (!lotesPorProduto[lote.produto_id]) {
            lotesPorProduto[lote.produto_id] = [];
          }
          lotesPorProduto[lote.produto_id].push(lote);
        });

        // Adicionar lotes aos itens do estoque
        estoque.forEach((item, index) => {
          estoque[index].lotes = lotesPorProduto[item.produto_id] || [];
        });

      } catch (error) {
        console.error('Erro ao buscar lotes:', error);
        // Em caso de erro, todos os itens ficam sem lotes
        estoque.forEach((item, index) => {
          estoque[index].lotes = [];
        });
      }
    }

    // CACHE DESABILITADO - não salvar em cache
    // await cacheTenantEstoqueEscola.set(parseInt(escola_id), { estoque });
    // console.log(`📦 Cached tenant ${tenantId} school ${escola_id} inventory data`);

    res.json({
      success: true,
      data: estoque,
      total: estoque.length,
      cached: false
    });
  } catch (error) {
    console.error("❌ Erro ao listar estoque da escola:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function buscarItemEstoqueEscola(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se o item de estoque pertence ao tenant
    await tenantInventoryValidator.validateInventoryItemTenantOwnership(parseInt(id));
    
    const result = await db.query(`
      SELECT 
        ee.*,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade as unidade_medida,
        p.categoria,
        e.nome as escola_nome
      FROM estoque_escolas ee
      LEFT JOIN produtos p ON ee.produto_id = p.id
      LEFT JOIN escolas e ON ee.escola_id = e.id
      WHERE ee.id = $1
        AND (ee.tenant_id = $2 OR ee.tenant_id IS NULL)
        AND (p.tenant_id = $2 OR p.tenant_id IS NULL)
        AND (e.tenant_id = $2 OR e.tenant_id IS NULL)
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item de estoque não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar item de estoque:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function atualizarQuantidadeEstoque(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      quantidade_atual,
      usuario_id
    } = req.body;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se o item de estoque pertence ao tenant
    await tenantInventoryValidator.validateInventoryItemTenantOwnership(parseInt(id));

    // Validar quantidade
    if (quantidade_atual < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade não pode ser negativa"
      });
    }

    const result = await db.query(`
      UPDATE estoque_escolas SET
        quantidade_atual = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [
      quantidade_atual,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item de estoque não encontrado"
      });
    }

    // Invalidate tenant cache after successful update
    invalidateTenantCacheOnEstoqueChange({ 
      operation: 'adjustment',
      produtoId: parseInt(id) 
    });

    res.json({
      success: true,
      message: "Quantidade atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar quantidade:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function atualizarLoteQuantidades(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { itens, usuario_id } = req.body;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se a escola pertence ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lista de itens inválida"
      });
    }

    // Validar se todos os produtos pertencem ao tenant
    const produtoIds = itens.map(item => item.produto_id);
    await tenantInventoryValidator.validateBulkTenantOwnership('produto', produtoIds);

    // Usar transação para atualizar todos os itens
    const result = await db.transaction(async (client: any) => {
      const resultados = [];

      for (const item of itens) {
        const { produto_id, quantidade_atual } = item;

        // Validar quantidade
        if (quantidade_atual < 0) {
          throw new Error(`Quantidade não pode ser negativa para o produto ${produto_id}`);
        }

        // Primeiro tentar atualizar, se não existir, criar o registro
        const updateResult = await client.query(`
          INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
          VALUES ($2, $3, $1, $4)
          ON CONFLICT (escola_id, produto_id) 
          DO UPDATE SET
            quantidade_atual = $1,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [quantidade_atual, escola_id, produto_id]);

        if (updateResult.rows.length > 0) {
          resultados.push(updateResult.rows[0]);
        }
      }

      return resultados;
    });

    // Invalidate tenant cache after successful batch update
    invalidateTenantCacheOnEstoqueChange({ 
      operation: 'adjustment',
      escolaId: parseInt(escola_id)
    });

    res.json({
      success: true,
      message: `${result.length} itens atualizados com sucesso`,
      data: result
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar lote de quantidades:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function listarHistoricoEstoque(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { produto_id, limite = 50 } = req.query;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se a escola pertence ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));

    // Se produto_id foi especificado, validar se pertence ao tenant
    if (produto_id) {
      await tenantInventoryValidator.validateProductTenantOwnership(parseInt(produto_id as string));
    }

    let whereClause = 'WHERE he.escola_id = $1 AND (he.tenant_id = $2 OR he.tenant_id IS NULL)';
    const params = [escola_id];

    if (produto_id) {
      whereClause += ' AND he.produto_id = $3';
      params.push(produto_id as string);
    }

    const result = await db.query(`
      SELECT 
        he.*,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        u.nome as usuario_nome
      FROM estoque_escolas_historico he
      LEFT JOIN produtos p ON he.produto_id = p.id AND (p.tenant_id = $2 OR p.tenant_id IS NULL)
      LEFT JOIN usuarios u ON he.usuario_id = u.id AND (u.tenant_id = $2 OR u.tenant_id IS NULL)
      ${whereClause.replace('eeh.', 'he.')}
      ORDER BY he.data_movimentacao DESC
      LIMIT $${params.length + 1}
    `, [...params, limite]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar histórico:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function obterResumoEstoque(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se a escola pertence ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));

    // Try to get from tenant cache first
    const cachedResumo = await cacheTenantEstoqueResumo.get(tenantId);
    if (cachedResumo && (cachedResumo as any).escola_id === parseInt(escola_id)) {
      console.log(`🎯 Cache hit for tenant ${tenantId} inventory summary`);
      return res.json({
        success: true,
        data: (cachedResumo as any).data,
        cached: true
      });
    }

    // Resumo dinâmico considerando todos os produtos ativos
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(CASE WHEN COALESCE(ee.quantidade_atual, 0) > 0 THEN 1 END) as produtos_com_estoque,
        COUNT(CASE WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 1 END) as produtos_sem_estoque,
        MAX(COALESCE(ee.updated_at, CURRENT_TIMESTAMP)) as ultima_atualizacao
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id AND (ee.tenant_id = $2 OR ee.tenant_id IS NULL))
      WHERE p.ativo = true 
        AND e.id = $1 
        AND e.ativo = true
        AND (p.tenant_id = $2 OR p.tenant_id IS NULL)
        AND (e.tenant_id = $2 OR e.tenant_id IS NULL)
    `, [escola_id]);

    const resumo = result.rows[0];
    const resumoData = {
      total_itens: parseInt(resumo.total_produtos),
      itens_normais: parseInt(resumo.produtos_com_estoque),
      itens_baixos: 0, // Por enquanto não temos lógica de baixo estoque
      itens_sem_estoque: parseInt(resumo.produtos_sem_estoque),
      ultima_atualizacao: resumo.ultima_atualizacao
    };

    // Cache the summary for future requests
    await cacheTenantEstoqueResumo.set({ escola_id: parseInt(escola_id), data: resumoData });
    console.log(`📦 Cached tenant ${tenantId} inventory summary`);

    res.json({
      success: true,
      data: resumoData,
      cached: false
    });
  } catch (error) {
    console.error("❌ Erro ao obter resumo:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function inicializarEstoqueEscola(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se a escola pertence ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));

    // Verificar se a escola existe (com filtro de tenant)
    const escolaResult = await db.query('SELECT id, nome FROM escolas WHERE id = $1 AND tenant_id = $2', [escola_id]);
    if (escolaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    // Inserir produtos que ainda não existem no estoque da escola
    const result = await db.query(`
      INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
      SELECT $1, p.id, 0.000, $2
      FROM produtos p
      WHERE p.id NOT IN (
        SELECT produto_id 
        FROM estoque_escolas 
        WHERE escola_id = $1
      ) AND p.tenant_id = $2
      RETURNING *
    `, [escola_id]);

    res.json({
      success: true,
      message: `Estoque inicializado com ${result.rows.length} novos produtos`,
      data: result.rows
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar estoque:", error);
    handleTenantInventoryError(error, res);
  }
}

export async function registrarMovimentacao(req: Request, res: Response) {
  try {
    console.log('🔄 [MOVIMENTACAO] Iniciando registro...');
    
    const { escola_id } = req.params;
    const {
      produto_id,
      tipo_movimentacao,
      quantidade,
      motivo,
      documento_referencia,
      usuario_id,
      data_validade // Novo campo para validade simples
    } = req.body;

    console.log('🔍 [MOVIMENTACAO] Dados:', { escola_id, produto_id, tipo_movimentacao, quantidade });

    // IMPORTANTE: Usar SEMPRE o tenant do header X-Tenant-ID (enviado pelo frontend)
    // O tenant do usuário é apenas para autenticação, não para filtrar dados
    const tenantId = req.headers['x-tenant-id'] as string || (req as any).tenant?.id;
    
    console.log('🔍 [MOVIMENTACAO] Tenant extraído:', {
      fromHeader: req.headers['x-tenant-id'],
      fromMiddleware: (req as any).tenant?.id,
      final: tenantId
    });
    
    if (!tenantId) {
      console.error('❌ [MOVIMENTACAO] Tenant ID não encontrado');
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    console.log('🔍 [MOVIMENTACAO] Validando escola...');
    
    // Validar se a escola e produto pertencem ao tenant
    try {
      await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));
      console.log('✅ [MOVIMENTACAO] Escola validada');
    } catch (error: any) {
      console.error('❌ [MOVIMENTACAO] Erro na validação da escola:', error.message);
      throw error;
    }
    
    console.log('🔍 [MOVIMENTACAO] Validando produto...');
    try {
      await tenantInventoryValidator.validateProductTenantOwnership(parseInt(produto_id));
      console.log('✅ [MOVIMENTACAO] Produto validado');
    } catch (error: any) {
      console.error('❌ [MOVIMENTACAO] Erro na validação do produto:', error.message);
      throw error;
    }

    // Validar consistência entre escola e produto no mesmo tenant
    console.log('🔍 [MOVIMENTACAO] Validando consistência escola-produto...');
    try {
      await tenantInventoryValidator.validateSchoolProductTenantConsistency(parseInt(escola_id), parseInt(produto_id));
      console.log('✅ [MOVIMENTACAO] Consistência validada');
    } catch (error: any) {
      console.error('❌ [MOVIMENTACAO] Erro na validação de consistência:', error.message);
      throw error;
    }

    // Validar usuário se fornecido (não bloquear se falhar, apenas logar)
    if (usuario_id) {
      console.log('🔍 [MOVIMENTACAO] Validando usuário...');
      try {
        await tenantInventoryValidator.validateUserTenantAccess(parseInt(usuario_id));
        console.log('✅ [MOVIMENTACAO] Usuário validado');
      } catch (error: any) {
        console.warn('⚠️  [MOVIMENTACAO] Usuário não pertence ao tenant, mas continuando:', error.message);
        // Não bloquear a operação, apenas logar o aviso
      }
    }

    // Validações
    if (!['entrada', 'saida', 'ajuste'].includes(tipo_movimentacao)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de movimentação inválido. Use: entrada, saida ou ajuste"
      });
    }

    if (quantidade === null || quantidade === undefined || quantidade < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade deve ser maior ou igual a zero"
      });
    }

    // Usar transação para garantir consistência
    const result = await db.transaction(async (client: any) => {
      // Since units are now defined in contracts, we'll use a default unit for inventory
      // The actual unit will come from the contract context when needed
      const unidadePadrao = 'kg'; // Default unit for inventory tracking

      const unidadeMedida = produtoResult.rows[0].unidade;

      // Buscar ou criar o item no estoque (com filtro de tenant)
      let estoqueAtual = await client.query(`
        SELECT * FROM estoque_escolas 
        WHERE escola_id = $1 AND produto_id = $2 
        AND (tenant_id = $3 OR tenant_id IS NULL)
      `, [escola_id, produto_id]);

      let item;
      if (estoqueAtual.rows.length === 0) {
        // Criar registro no estoque se não existir (incluindo tenant_id)
        const novoItem = await client.query(`
          INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
          VALUES ($1, $2, 0, $3)
          ON CONFLICT (escola_id, produto_id) DO UPDATE 
          SET updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `, [escola_id, produto_id]);
        item = novoItem.rows[0];
      } else {
        item = estoqueAtual.rows[0];
      }

      // Calcular quantidade real considerando lotes E estoque principal
      const lotesResult = await client.query(`
        SELECT COALESCE(SUM(quantidade_atual), 0) as total_lotes
        FROM estoque_lotes 
        WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND tenant_id = $3
      `, [escola_id, parseInt(produto_id)]);

      const quantidadeLotes = parseFloat(lotesResult.rows[0]?.total_lotes || 0);
      const quantidadeEstoquePrincipal = parseFloat(item.quantidade_atual || 0);

      // Somar lotes + estoque principal para ter o total disponível
      const quantidadeAnterior = quantidadeLotes + quantidadeEstoquePrincipal;
      let quantidadePosterior = quantidadeAnterior;

      // Calcular nova quantidade baseada no tipo de movimentação
      switch (tipo_movimentacao) {
        case 'entrada':
          quantidadePosterior = quantidadeAnterior + parseFloat(quantidade);
          break;
        case 'saida':
          quantidadePosterior = quantidadeAnterior - parseFloat(quantidade);
          if (quantidadePosterior < 0) {
            throw new Error('Quantidade insuficiente em estoque');
          }

          // Implementar saída inteligente: primeiro lotes (FIFO por validade), depois estoque principal
          let quantidadeRestante = parseFloat(quantidade);

          // 1. Primeiro, consumir dos lotes se existirem (FIFO por validade)
          if (quantidadeLotes > 0) {
            const lotesDisponiveis = await client.query(`
              SELECT id, lote, quantidade_atual, data_validade
              FROM estoque_lotes
              WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND quantidade_atual > 0
                AND tenant_id = $3
              ORDER BY 
                CASE WHEN data_validade IS NULL THEN 1 ELSE 0 END,
                data_validade ASC
            `, [escola_id, parseInt(produto_id)]);

            for (const lote of lotesDisponiveis.rows) {
              if (quantidadeRestante <= 0) break;

              const quantidadeDisponivel = parseFloat(lote.quantidade_atual);
              const quantidadeConsumida = Math.min(quantidadeRestante, quantidadeDisponivel);
              const novaQuantidadeLote = quantidadeDisponivel - quantidadeConsumida;

              // Atualizar quantidade do lote
              const novoStatus = novaQuantidadeLote === 0 ? 'esgotado' : 'ativo';
              await client.query(`
                UPDATE estoque_lotes 
                SET quantidade_atual = $1,
                    status = $2,
                    updated_at = NOW()
                WHERE id = $3
              `, [novaQuantidadeLote, novoStatus, lote.id]);

              quantidadeRestante -= quantidadeConsumida;
            }
          }

          // 2. Se ainda sobrou quantidade, consumir do estoque principal
          if (quantidadeRestante > 0 && quantidadeEstoquePrincipal > 0) {
            const quantidadeConsumidaPrincipal = Math.min(quantidadeRestante, quantidadeEstoquePrincipal);
            quantidadeRestante -= quantidadeConsumidaPrincipal;

            // A quantidade do estoque principal será atualizada no final da função
            // Aqui só ajustamos o cálculo para refletir o consumo
            quantidadePosterior = (quantidadeLotes - (parseFloat(quantidade) - quantidadeRestante - quantidadeConsumidaPrincipal)) +
              (quantidadeEstoquePrincipal - quantidadeConsumidaPrincipal);
          } else {
            // Se só consumiu dos lotes, recalcular o total
            const novoTotalLotes = await client.query(`
              SELECT COALESCE(SUM(quantidade_atual), 0) as total_lotes
              FROM estoque_lotes 
              WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND tenant_id = $3
            `, [escola_id, parseInt(produto_id)]);

            quantidadePosterior = parseFloat(novoTotalLotes.rows[0]?.total_lotes || 0) + quantidadeEstoquePrincipal;
          }
          break;
        case 'ajuste':
          // Para ajuste, definir a quantidade total desejada
          // Se há lotes, o ajuste afeta apenas o estoque principal
          const totalLotesAtual = (await client.query(`
            SELECT COALESCE(SUM(quantidade_atual), 0) as total_lotes
            FROM estoque_lotes 
            WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND tenant_id = $3
          `, [escola_id, parseInt(produto_id)])).rows[0].total_lotes;

          const quantidadeTotalDesejada = parseFloat(quantidade);
          const novaQuantidadeEstoquePrincipalAjuste = Math.max(0, quantidadeTotalDesejada - parseFloat(totalLotesAtual));
          quantidadePosterior = quantidadeTotalDesejada;
          break;
      }

      // NOVA LÓGICA: Estoque principal será sempre calculado baseado nos lotes
      // Isso garante consistência e evita divergências

      // Para entradas com validade, criar/atualizar lote primeiro
      if (tipo_movimentacao === 'entrada' && data_validade) {
        // Verificar se já existe um lote com a mesma validade
        const loteExistente = await client.query(`
          SELECT id FROM estoque_lotes 
          WHERE produto_id = $1 AND data_validade = $2 AND status = 'ativo' AND escola_id = $3
            AND (tenant_id = $4 OR tenant_id IS NULL)
        `, [produto_id, data_validade, escola_id]);

        if (loteExistente.rows.length === 0) {
          // Criar novo lote automaticamente
          await client.query(`
            INSERT INTO estoque_lotes (
              escola_id, produto_id, lote, quantidade_inicial, quantidade_atual,
              data_validade, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $4, $5, 'ativo', $6, NOW(), NOW())
          `, [
            escola_id,
            produto_id,
            `LOTE_${Date.now()}`, // Gerar nome único do lote
            parseFloat(quantidade),
            data_validade
          ]);
        } else {
          // Atualizar lote existente
          await client.query(`
            UPDATE estoque_lotes 
            SET quantidade_atual = quantidade_atual + $1,
                updated_at = NOW()
            WHERE id = $2
          `, [parseFloat(quantidade), loteExistente.rows[0].id]);
        }
      }

      // Para entradas sem validade, SEMPRE criar novo lote (nunca atualizar existente)
      if (tipo_movimentacao === 'entrada' && !data_validade) {
        // Criar novo lote automaticamente - cada entrada é um lote separado
        await client.query(`
          INSERT INTO estoque_lotes (
            escola_id, produto_id, lote, quantidade_inicial, quantidade_atual,
            data_validade, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $4, NULL, 'ativo', $5, NOW(), NOW())
        `, [
          escola_id,
          produto_id,
          `LOTE_${Date.now()}`, // Gerar nome único do lote
          parseFloat(quantidade)
        ]);
      }

      // Para ajustes, ajustar o lote principal
      if (tipo_movimentacao === 'ajuste') {
        const totalLotesComValidade = (await client.query(`
          SELECT COALESCE(SUM(quantidade_atual), 0) as total_lotes
          FROM estoque_lotes 
          WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND data_validade IS NOT NULL AND tenant_id = $3
        `, [escola_id, parseInt(produto_id)])).rows[0].total_lotes;

        const quantidadePrincipalDesejada = Math.max(0, parseFloat(quantidade) - parseFloat(totalLotesComValidade));

        // Verificar se existe lote principal
        const lotePrincipal = await client.query(`
          SELECT id FROM estoque_lotes 
          WHERE escola_id = $1 AND produto_id = $2 AND data_validade IS NULL AND status = 'ativo' AND tenant_id = $3
        `, [escola_id, produto_id]);

        if (lotePrincipal.rows.length === 0 && quantidadePrincipalDesejada > 0) {
          // Criar lote principal
          await client.query(`
            INSERT INTO estoque_lotes (
              escola_id, produto_id, lote, quantidade_inicial, quantidade_atual,
              data_validade, status, created_at, updated_at
            ) VALUES ($1, $2, 'PRINCIPAL', $3, $3, NULL, 'ativo', $4, NOW(), NOW())
          `, [escola_id, produto_id, quantidadePrincipalDesejada]);
        } else if (lotePrincipal.rows.length > 0) {
          // Atualizar lote principal
          const novoStatus = quantidadePrincipalDesejada === 0 ? 'esgotado' : 'ativo';
          await client.query(`
            UPDATE estoque_lotes 
            SET quantidade_atual = $1,
                status = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [quantidadePrincipalDesejada, novoStatus, lotePrincipal.rows[0].id]);
        }
      }

      // SEMPRE recalcular o estoque principal baseado na soma de todos os lotes
      // Isso garante consistência total
      const totalLotesAtualizado = await client.query(`
        SELECT COALESCE(SUM(quantidade_atual), 0) as total_lotes
        FROM estoque_lotes 
        WHERE escola_id = $1 AND produto_id = $2 AND status = 'ativo' AND tenant_id = $3
      `, [escola_id, parseInt(produto_id)]);

      const novaQuantidadeEstoquePrincipal = parseFloat(totalLotesAtualizado.rows[0]?.total_lotes || 0);

      // Atualizar quantidadePosterior para refletir o valor real
      quantidadePosterior = novaQuantidadeEstoquePrincipal;

      let updateQuery = `
        UPDATE estoque_escolas SET
          quantidade_atual = $1,
          updated_at = CURRENT_TIMESTAMP
      `;
      let updateParams = [novaQuantidadeEstoquePrincipal];

      // Para entradas com validade, SEMPRE criar novo lote (nunca atualizar existente)
      if (tipo_movimentacao === 'entrada' && data_validade) {
        // Criar novo lote automaticamente - cada entrada é um lote separado
        await client.query(`
          INSERT INTO estoque_lotes (
            escola_id, produto_id, lote, quantidade_inicial, quantidade_atual,
            data_validade, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $4, $5, 'ativo', $6, NOW(), NOW())
        `, [
          escola_id,
          produto_id,
          `LOTE_${Date.now()}`, // Gerar nome único do lote
          parseFloat(quantidade),
          data_validade
        ]);
      }

      updateQuery += ` WHERE escola_id = $${updateParams.length + 1} AND produto_id = $${updateParams.length + 2} RETURNING *`;
      updateParams.push(parseInt(escola_id), parseInt(produto_id));

      const updateResult = await client.query(updateQuery, updateParams);

      // Registrar no histórico (incluindo validade)
      // Se usuario_id não for fornecido ou não existir, usar NULL
      let usuarioIdValido = null;
      if (usuario_id) {
        try {
          const usuarioCheck = await client.query(`
            SELECT id FROM usuarios 
            WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
          `, [usuario_id]);
          if (usuarioCheck.rows.length > 0) {
            usuarioIdValido = usuario_id;
          }
        } catch (error) {
          console.log('Usuário não encontrado ou não pertence ao tenant, usando NULL');
        }
      }

      // Criar motivo com contexto de tenant para auditoria
      const motivoComTenant = `${motivo || 'Movimentação de estoque'} [Tenant: ${tenantId}]`;

      const historicoResult = await client.query(`
        INSERT INTO estoque_escolas_historico (
          estoque_escola_id,
          escola_id,
          produto_id,
          tipo_movimentacao,
          quantidade_anterior,
          quantidade_movimentada,
          quantidade_posterior,
          motivo,
          documento_referencia,
          usuario_id,
          data_movimentacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        RETURNING *
      `, [
        item.id,
        escola_id,
        produto_id,
        tipo_movimentacao,
        quantidadeAnterior,
        parseFloat(quantidade),
        quantidadePosterior,
        motivoComTenant,
        documento_referencia,
        usuarioIdValido
      ]);

      return {
        estoque: updateResult.rows[0],
        historico: historicoResult.rows[0]
      };
    });

    // Invalidate tenant cache after successful movement
    invalidateTenantCacheOnEstoqueChange({ 
      operation: 'movement',
      escolaId: parseInt(escola_id),
      produtoId: parseInt(produto_id)
    });

    // Log da operação bem-sucedida
    logTenantInventoryOperation(
      'MOVEMENT_REGISTERED',
      {
        escola_id,
        produto_id,
        tipo_movimentacao,
        quantidade,
        usuario_id
      },
      'info'
    );

    res.json({
      success: true,
      message: `Movimentação de ${tipo_movimentacao} registrada com sucesso`,
      data: result
    });
  } catch (error) {
    console.error("❌ Erro ao registrar movimentação:", error);

    // Primeiro verificar se é erro de tenant
    if (error instanceof TenantOwnershipError || error instanceof TenantContextMissingError) {
      return handleTenantInventoryError(error, res);
    }

    // Tratar erros específicos de negócio
    if (error instanceof Error) {
      // Erro de duplicata (constraint violation)
      if (error.message.includes('duplicate key') || error.message.includes('idx_historico_unique_movement')) {
        return res.status(409).json({
          success: false,
          message: "Esta movimentação já foi registrada. Evite clicar múltiplas vezes no botão.",
          error: "Movimentação duplicada"
        });
      }

      // Erro de quantidade insuficiente
      if (error.message.includes('Quantidade insuficiente')) {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: "Estoque insuficiente"
        });
      }

      // Erro de item não encontrado
      if (error.message.includes('Item não encontrado')) {
        return res.status(404).json({
          success: false,
          message: error.message,
          error: "Item não encontrado"
        });
      }
    }

    // Erro genérico
    handleTenantInventoryError(error, res);
  }
}

export async function resetarEstoqueComBackup(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { usuario_id, motivo } = req.body;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validar se a escola pertence ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));

    // Verificar se a escola existe (com filtro de tenant)
    const escolaResult = await db.query('SELECT id, nome FROM escolas WHERE id = $1 AND tenant_id = $2 AND ativo = true', [escola_id]);
    if (escolaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola não encontrada"
      });
    }

    const escola = escolaResult.rows[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeBackup = `backup_estoque_escola_${escola_id}_${timestamp}`;

    // Usar transação para garantir consistência
    const result = await db.transaction(async (client: any) => {
      // 1. Criar backup dos dados atuais
      const dadosEstoque = await client.query(`
        SELECT 
          ee.id,
          ee.escola_id,
          ee.produto_id,
          ee.quantidade_atual,
          ee.created_at,
          ee.updated_at,
          p.nome as produto_nome,
          p.descricao as produto_descricao
        FROM estoque_escolas ee
        JOIN produtos p ON p.id = ee.produto_id
        WHERE ee.escola_id = $1
      `, [escola_id]);

      const dadosHistorico = await client.query(`
        SELECT 
          eeh.*,
          p.nome as produto_nome
        FROM estoque_escolas_historico eeh
        JOIN estoque_escolas ee ON ee.id = eeh.estoque_escola_id
        JOIN produtos p ON p.id = ee.produto_id
        WHERE ee.escola_id = $1
        ORDER BY eeh.created_at DESC
      `, [escola_id]);

      // 2. Salvar backup em tabela de backups (se existir) ou em arquivo JSON
      const backupData = {
        escola: escola,
        timestamp: new Date(),
        motivo: motivo || 'Reset manual do estoque',
        usuario_id: usuario_id,
        estoque: dadosEstoque.rows,
        historico: dadosHistorico.rows
      };

      // Tentar salvar na tabela de backups
      try {
        await client.query(`
          INSERT INTO backups (nome_arquivo, tipo, status, data_backup, observacoes)
          VALUES ($1, 'reset_estoque', 'sucesso', NOW(), $2)
        `, [nomeBackup, JSON.stringify(backupData)]);
      } catch (backupError) {
        console.warn('⚠️ Tabela de backups não encontrada, continuando sem salvar backup em BD:', backupError);
      }

      // 3. Registrar a operação de reset no histórico antes de limpar
      const itensEstoque = await client.query(`
        SELECT id, produto_id, quantidade_atual 
        FROM estoque_escolas 
        WHERE escola_id = $1 AND quantidade_atual > 0
      `, [escola_id]);

      // Registrar movimentação de saída para cada item com estoque
      for (const item of itensEstoque.rows) {
        if (item.quantidade_atual > 0) {
          await client.query(`
            INSERT INTO estoque_escolas_historico (
              estoque_escola_id,
              escola_id,
              produto_id,
              tipo_movimentacao,
              quantidade_anterior,
              quantidade_movimentada,
              quantidade_posterior,
              motivo,
              documento_referencia,
              usuario_id,
              usuario_nome,
              created_at
            ) VALUES ($1, $2, $3, 'reset', $4, $5, 0, $6, $7, $8, $9, $10, NOW())
          `, [
            item.id,
            escola_id,
            item.produto_id,
            item.quantidade_atual,
            -item.quantidade_atual,
            `${motivo || 'Reset do estoque - backup criado'} [Tenant: ${tenantId}]`,
            nomeBackup,
            usuario_id,
            req.user?.nome || 'Sistema'
          ]);
        }
      }

      // 4. Zerar todas as quantidades do estoque da escola
      const resetEstoque = await client.query(`
        UPDATE estoque_escolas 
        SET quantidade_atual = 0, updated_at = NOW()
        WHERE escola_id = $1
        RETURNING *
      `, [escola_id]);

      return {
        backup: backupData,
        itensResetados: resetEstoque.rows.length,
        nomeBackup: nomeBackup
      };
    });

    res.json({
      success: true,
      message: `Estoque da escola ${escola.nome} foi resetado com sucesso. Backup criado: ${result.nomeBackup}`,
      data: {
        escola_nome: escola.nome,
        itens_resetados: result.itensResetados,
        backup_nome: result.nomeBackup,
        backup_criado_em: new Date(),
        itens_backup: result.backup.estoque.length,
        historico_backup: result.backup.historico.length
      }
    });

  } catch (error) {
    console.error("❌ Erro ao resetar estoque com backup:", error);
    handleTenantInventoryError(error, res);
  }
}

// Listar lotes de um produto específico
export async function listarLotesProduto(req: Request, res: Response) {
  try {
    const { produto_id } = req.params;
    const apenas_ativos = req.query.apenas_ativos !== 'false';

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    if (!produto_id) {
      return res.status(400).json({
        success: false,
        message: "ID do produto é obrigatório"
      });
    }

    // Validar se o produto pertence ao tenant
    await tenantInventoryValidator.validateProductTenantOwnership(parseInt(produto_id));

    // Try to get from tenant cache first
    const cachedLotes = await cacheTenantEstoqueLotes.get(parseInt(produto_id));
    if (cachedLotes && (cachedLotes as any).apenas_ativos === apenas_ativos) {
      console.log(`🎯 Cache hit for tenant ${tenantId} product ${produto_id} batches`);
      return res.json({
        success: true,
        data: (cachedLotes as any).lotes,
        produto: (cachedLotes as any).produto,
        cached: true
      });
    }

    // Verificar se produto existe (com filtro de tenant)
    const produto = await db.query(`
      SELECT id, nome FROM produtos 
      WHERE id = $1 AND tenant_id = $2 AND ativo = true
    `, [produto_id]);

    if (produto.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    let whereClause = "WHERE el.produto_id = $1";
    const params = [produto_id];

    if (apenas_ativos) {
      whereClause += " AND el.status = 'ativo' AND el.quantidade_atual > 0";
    }

    const query = `
      SELECT 
        el.id,
        el.produto_id,
        el.lote,
        el.quantidade_inicial,
        el.quantidade_atual,
        el.data_validade,
        el.data_fabricacao,
        el.fornecedor_id,
        f.nome as fornecedor_nome,
        el.status,
        el.observacoes,
        el.created_at,
        el.updated_at
      FROM estoque_lotes el
      LEFT JOIN fornecedores f ON el.fornecedor_id = f.id
      ${whereClause}
      ORDER BY 
        CASE WHEN el.data_validade IS NULL THEN 1 ELSE 0 END,
        el.data_validade ASC,
        el.created_at DESC
    `;

    const result = await db.query(query, params);

    // Cache the results for future requests
    const cacheData = {
      lotes: result.rows,
      produto: produto.rows[0],
      apenas_ativos
    };
    await cacheTenantEstoqueLotes.set(parseInt(produto_id), undefined, cacheData);
    console.log(`📦 Cached tenant ${tenantId} product ${produto_id} batches`);

    res.json({
      success: true,
      data: result.rows,
      produto: produto.rows[0],
      cached: false
    });
  } catch (error: any) {
    console.error("❌ Erro ao listar lotes do produto:", error);
    handleTenantInventoryError(error, res);
  }
}

// Criar novo lote
export async function criarLote(req: Request, res: Response) {
  try {
    const {
      escola_id,
      produto_id,
      lote,
      quantidade,
      data_fabricacao,
      data_validade,
      fornecedor_id,
      observacoes
    } = req.body;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }

    // Validações básicas
    if (!escola_id || !produto_id || !lote || quantidade === null || quantidade === undefined || quantidade < 0) {
      return res.status(400).json({
        success: false,
        message: "Escola, produto, lote e quantidade são obrigatórios"
      });
    }

    // Validar se escola e produto pertencem ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));
    await tenantInventoryValidator.validateProductTenantOwnership(parseInt(produto_id));

    // Validar consistência entre escola e produto no mesmo tenant
    await tenantInventoryValidator.validateSchoolProductTenantConsistency(parseInt(escola_id), parseInt(produto_id));

    // Verificar se produto existe (com filtro de tenant)
    const produto = await db.query(`
      SELECT id, nome FROM produtos 
      WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) AND ativo = true
    `, [produto_id]);

    if (produto.rows.length === 0) {
      throw new TenantInventoryNotFoundError('Produto', produto_id);
    }

    // Verificar se lote já existe para este produto (com filtro de tenant)
    const loteExistente = await db.query(`
      SELECT el.id FROM estoque_lotes el
      JOIN escolas e ON e.id = el.escola_id
      WHERE el.produto_id = $1 AND el.lote = $2 AND e.tenant_id = $3
    `, [produto_id, lote.toString().trim()]);

    if (loteExistente.rows.length > 0) {
      throw new TenantInventoryConflictError('duplicate_batch', `Lote '${lote}' já existe para este produto`);
    }

    // Validar data de validade se fornecida (data de fabricação é opcional)
    if (data_validade) {
      const validade = new Date(data_validade);
      const hoje = new Date();

      if (validade <= hoje) {
        return res.status(400).json({
          success: false,
          message: "Data de validade deve ser futura"
        });
      }
    }

    // Criar o lote
    const novoLote = await db.query(`
      INSERT INTO estoque_lotes (
        escola_id, produto_id, lote, quantidade_inicial, quantidade_atual,
        data_fabricacao, data_validade, fornecedor_id, observacoes,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, 'ativo', $9, NOW(), NOW())
      RETURNING *
    `, [
      escola_id,
      produto_id,
      lote.toString().trim(),
      Number(quantidade),
      data_fabricacao || null,
      data_validade || null,
      fornecedor_id || null,
      observacoes || null
    ]);

    // Invalidate tenant cache after creating new batch
    invalidateTenantCacheOnEstoqueChange({ 
      operation: 'batch',
      escolaId: parseInt(escola_id),
      produtoId: parseInt(produto_id)
    });

    res.status(201).json({
      success: true,
      message: "Lote criado com sucesso",
      data: novoLote.rows[0]
    });
  } catch (error: any) {
    console.error("❌ Erro ao criar lote:", error);
    handleTenantInventoryError(error, res);
  }
}

// Processar movimentação com lotes
export async function processarMovimentacaoLotes(req: Request, res: Response) {
  try {
    console.log('🔄 Processando movimentação por lotes:', JSON.stringify(req.body, null, 2));

    const { escola_id } = req.params;

    // Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }
    const {
      produto_id,
      tipo_movimentacao,
      lotes,
      motivo,
      documento_referencia,
      usuario_id
    } = req.body;

    // Validar se escola e produto pertencem ao tenant
    await tenantInventoryValidator.validateSchoolTenantOwnership(parseInt(escola_id));
    await tenantInventoryValidator.validateProductTenantOwnership(parseInt(produto_id));

    // Validar consistência entre escola e produto no mesmo tenant
    await tenantInventoryValidator.validateSchoolProductTenantConsistency(parseInt(escola_id), parseInt(produto_id));

    // Validar usuário se fornecido
    if (usuario_id) {
      await tenantInventoryValidator.validateUserTenantAccess(parseInt(usuario_id));
    }

    // Validar lotes se fornecidos (para operações de saída/ajuste)
    const loteIds = lotes.filter((l: any) => l.lote_id).map((l: any) => l.lote_id);
    if (loteIds.length > 0) {
      await tenantInventoryValidator.validateActiveBatchesTenantOwnership(loteIds);
    }

    if (!produto_id || !tipo_movimentacao || !lotes || !Array.isArray(lotes) || lotes.length === 0) {
      console.log('❌ Validação falhou:', { produto_id, tipo_movimentacao, lotes: Array.isArray(lotes) ? lotes.length : 'não é array' });
      return res.status(400).json({
        success: false,
        message: "Produto, tipo de movimentação e lotes são obrigatórios"
      });
    }

    console.log('✅ Validação passou, processando lotes...');

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const movimentacoes = [];
      let quantidadeTotal = 0;

      for (const loteMovimento of lotes) {
        const { lote_id, lote, quantidade, data_validade, data_fabricacao, observacoes } = loteMovimento;

        if (quantidade <= 0) continue;

        quantidadeTotal += quantidade;

        if (tipo_movimentacao === 'entrada') {
          // Para entrada, criar novo lote ou atualizar existente
          let loteAtual;

          if (lote_id) {
            // Atualizar lote existente
            const updateResult = await client.query(`
              UPDATE estoque_lotes 
              SET quantidade_atual = quantidade_atual + $1,
                  updated_at = NOW()
              WHERE id = $2 AND produto_id = $3
              RETURNING *
            `, [quantidade, lote_id, produto_id]);

            loteAtual = updateResult.rows[0];
          } else {
            // Criar novo lote
            const insertResult = await client.query(`
              INSERT INTO estoque_lotes (
                escola_id, produto_id, lote, quantidade_inicial, quantidade_atual,
                data_fabricacao, data_validade, observacoes,
                status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, 'ativo', $8, NOW(), NOW())
              RETURNING *
            `, [
              escola_id,
              produto_id,
              lote,
              quantidade,
              data_fabricacao || null,
              data_validade || null,
              observacoes || null
            ]);

            loteAtual = insertResult.rows[0];
          }

          movimentacoes.push({
            lote_id: loteAtual.id,
            lote: loteAtual.lote,
            quantidade,
            tipo: 'entrada'
          });

        } else if (tipo_movimentacao === 'saida') {
          // Para saída, reduzir quantidade do lote
          if (!lote_id) {
            throw new Error('ID do lote é obrigatório para saída');
          }

          const loteAtual = await client.query(`
            SELECT * FROM estoque_lotes WHERE id = $1 AND produto_id = $2
          `, [lote_id, produto_id]);

          if (loteAtual.rows.length === 0) {
            throw new Error(`Lote não encontrado`);
          }

          if (loteAtual.rows[0].quantidade_atual < quantidade) {
            throw new Error(`Quantidade insuficiente no lote ${loteAtual.rows[0].lote}`);
          }

          const novaQuantidade = loteAtual.rows[0].quantidade_atual - quantidade;
          const novoStatus = novaQuantidade === 0 ? 'esgotado' : 'ativo';

          await client.query(`
            UPDATE estoque_lotes 
            SET quantidade_atual = $1,
                status = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [novaQuantidade, novoStatus, lote_id]);

          movimentacoes.push({
            lote_id,
            lote: loteAtual.rows[0].lote,
            quantidade,
            tipo: 'saida'
          });
        } else if (tipo_movimentacao === 'ajuste') {
          // Para ajuste, definir a quantidade exata do lote
          if (!lote_id) {
            throw new Error('ID do lote é obrigatório para ajuste');
          }

          const loteAtual = await client.query(`
            SELECT * FROM estoque_lotes WHERE id = $1 AND produto_id = $2
          `, [lote_id, produto_id]);

          if (loteAtual.rows.length === 0) {
            throw new Error(`Lote não encontrado`);
          }

          const quantidadeAnterior = loteAtual.rows[0].quantidade_atual;
          const novoStatus = quantidade === 0 ? 'esgotado' : 'ativo';

          await client.query(`
            UPDATE estoque_lotes 
            SET quantidade_atual = $1,
                status = $2,
                updated_at = NOW()
            WHERE id = $3
          `, [quantidade, novoStatus, lote_id]);

          // Para o cálculo total, considerar a diferença
          quantidadeTotal += (quantidade - quantidadeAnterior);

          movimentacoes.push({
            lote_id,
            lote: loteAtual.rows[0].lote,
            quantidade,
            quantidadeAnterior,
            tipo: 'ajuste'
          });
        }
      }

      // Atualizar estoque da escola
      const estoqueEscola = await client.query(`
        SELECT * FROM estoque_escolas 
        WHERE escola_id = $1 AND produto_id = $2
      `, [escola_id, produto_id]);

      let quantidadeAnterior = 0;
      let quantidadePosterior = 0;

      if (estoqueEscola.rows.length > 0) {
        quantidadeAnterior = estoqueEscola.rows[0].quantidade_atual;

        if (tipo_movimentacao === 'entrada') {
          quantidadePosterior = quantidadeAnterior + quantidadeTotal;
        } else if (tipo_movimentacao === 'saida') {
          quantidadePosterior = quantidadeAnterior - quantidadeTotal;
        }

        await client.query(`
          UPDATE estoque_escolas 
          SET quantidade_atual = $1, updated_at = NOW()
          WHERE escola_id = $2 AND produto_id = $3
        `, [quantidadePosterior, escola_id, produto_id]);
      } else {
        // Criar registro no estoque da escola se não existir
        quantidadePosterior = tipo_movimentacao === 'entrada' ? quantidadeTotal : 0;

        await client.query(`
          INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
          VALUES ($1, $2, $3, $4)
        `, [escola_id, produto_id, quantidadePosterior]);
      }

      // Registrar no histórico com contexto de tenant
      const motivoComTenant = `${motivo || `Movimentação por lotes: ${movimentacoes.length} lote(s)`} [Tenant: ${tenantId}]`;
      
      await client.query(`
        INSERT INTO estoque_escolas_historico (
          estoque_escola_id, escola_id, produto_id, tipo_movimentacao,
          quantidade_anterior, quantidade_movimentada, quantidade_posterior,
          motivo, documento_referencia, usuario_id, data_movimentacao
        ) VALUES (
          (SELECT id FROM estoque_escolas WHERE escola_id = $1 AND produto_id = $2),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
        )
      `, [
        escola_id, produto_id, tipo_movimentacao,
        quantidadeAnterior, quantidadeTotal, quantidadePosterior,
        motivoComTenant,
        documento_referencia, usuario_id || 1
      ]);

      await client.query('COMMIT');

      // Invalidate tenant cache after successful batch movement
      invalidateTenantCacheOnEstoqueChange({ 
        operation: 'batch',
        escolaId: parseInt(escola_id),
        produtoId: parseInt(produto_id)
      });

      res.json({
        success: true,
        message: `Movimentação processada com sucesso`,
        data: {
          tipo_movimentacao,
          quantidade_total: quantidadeTotal,
          lotes_processados: movimentacoes.length,
          movimentacoes
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error("❌ Erro ao processar movimentação com lotes:", error);
    handleTenantInventoryError(error, res);
  }
}

// Endpoint de teste para verificar se as rotas de lotes estão funcionando
export async function testarLotes(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      message: "Endpoint de lotes funcionando!",
      timestamp: new Date().toISOString(),
      routes: [
        "GET /api/estoque-escola/produtos/:produto_id/lotes",
        "POST /api/estoque-escola/lotes",
        "POST /api/estoque-escola/escola/:escola_id/movimentacao-lotes"
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Erro no teste de lotes",
      error: error.message
    });
  }
}