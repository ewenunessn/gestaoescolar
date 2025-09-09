import { Request, Response } from 'express';
const db = require('../database');

/**
 * Controller para a nova interface de faturamento
 * Fornece dados agrupados por fornecedor e contrato
 */

/**
 * Lista itens de faturamento agrupados por fornecedor e contrato
 * GET /api/faturamento-interface/itens-agrupados
 */
export async function listarItensAgrupadosFaturamento(req: Request, res: Response) {
  try {
    const { status_recebimento, fornecedor_id, contrato_id, page = 1, limit = 50 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;
    
    // Filtro por status de recebimento
    if (status_recebimento) {
      paramCount++;
      if (status_recebimento === 'COMPLETO') {
        whereClause += ` AND COALESCE(SUM(rs.quantidade_recebida), 0) >= pi.quantidade`;
      } else if (status_recebimento === 'PARCIAL') {
        whereClause += ` AND COALESCE(SUM(rs.quantidade_recebida), 0) > 0 AND COALESCE(SUM(rs.quantidade_recebida), 0) < pi.quantidade`;
      } else if (status_recebimento === 'PENDENTE') {
        whereClause += ` AND COALESCE(SUM(rs.quantidade_recebida), 0) = 0`;
      }
    }
    
    // Filtro por fornecedor
    if (fornecedor_id) {
      paramCount++;
      whereClause += ` AND f.id = $${paramCount}`;
      params.push(fornecedor_id);
    }
    
    // Filtro por contrato
    if (contrato_id) {
      paramCount++;
      whereClause += ` AND c.id = $${paramCount}`;
      params.push(contrato_id);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    params.push(Number(limit), offset);
    
    const query = `
      SELECT 
        f.id as fornecedor_id,
        f.nome as fornecedor_nome,
        c.id as contrato_id,
        c.numero as contrato_numero,
        c.status as contrato_status,
        pm.id as pedido_id,
        pm.numero_pedido,
        pm.status as pedido_status,
        pi.id as item_id,
        pi.produto_id,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        pi.quantidade as quantidade_pedida,
        COALESCE(SUM(rs.quantidade_recebida), 0) as quantidade_recebida,
        pi.preco_unitario,
        pi.subtotal,
        CASE 
          WHEN COALESCE(SUM(rs.quantidade_recebida), 0) >= pi.quantidade THEN 'COMPLETO'
          WHEN COALESCE(SUM(rs.quantidade_recebida), 0) > 0 THEN 'PARCIAL'
          ELSE 'PENDENTE'
        END as status_recebimento,
        CASE 
          WHEN pi.quantidade > 0 
          THEN (COALESCE(SUM(rs.quantidade_recebida), 0) * 100.0 / pi.quantidade)
          ELSE 0 
        END as percentual_recebido,
        pi.created_at as data_item,
        MAX(rs.data_recebimento) as data_ultimo_recebimento
      FROM pedidos_itens pi
      JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      JOIN pedidos pm ON pf.pedido_id = pm.id
      JOIN produtos p ON pi.produto_id = p.id
      JOIN contratos c ON pi.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN recebimentos_simples rs ON pi.id = rs.pedido_item_id
      ${whereClause}
      GROUP BY 
        f.id, f.nome, c.id, c.numero, c.status, pm.id, pm.numero_pedido, pm.status,
        pi.id, pi.produto_id, p.nome, p.unidade, pi.quantidade, 
        pi.preco_unitario, pi.subtotal, pi.created_at
      ORDER BY f.nome, c.numero, pm.numero_pedido, p.nome
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;
    
    const itens = await db.all(query, params);
    
    // Agrupar dados por fornecedor e contrato
    const dadosAgrupados = itens.reduce((acc: any, item: any) => {
      const fornecedorKey = `${item.fornecedor_id}_${item.fornecedor_nome}`;
      const contratoKey = `${item.contrato_id}_${item.contrato_numero}`;
      
      if (!acc[fornecedorKey]) {
        acc[fornecedorKey] = {
          fornecedor_id: item.fornecedor_id,
          fornecedor_nome: item.fornecedor_nome,
          contratos: {}
        };
      }
      
      if (!acc[fornecedorKey].contratos[contratoKey]) {
        acc[fornecedorKey].contratos[contratoKey] = {
          contrato_id: item.contrato_id,
          contrato_numero: item.contrato_numero,
          contrato_status: item.contrato_status,
          itens: [],
          resumo: {
            total_itens: 0,
            total_valor_pedido: 0,
            total_valor_recebido: 0,
            itens_completos: 0,
            itens_parciais: 0,
            itens_pendentes: 0
          }
        };
      }
      
      const contrato = acc[fornecedorKey].contratos[contratoKey];
      contrato.itens.push({
        item_id: item.item_id,
        pedido_id: item.pedido_id,
        numero_pedido: item.numero_pedido,
        pedido_status: item.pedido_status,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        produto_unidade: item.produto_unidade,
        quantidade_pedida: parseFloat(item.quantidade_pedida),
        quantidade_recebida: parseFloat(item.quantidade_recebida),
        preco_unitario: parseFloat(item.preco_unitario),
        subtotal: parseFloat(item.subtotal),
        status_recebimento: item.status_recebimento,
        percentual_recebido: Math.round(parseFloat(item.percentual_recebido) * 100) / 100,
        data_item: item.data_item,
        data_ultimo_recebimento: item.data_ultimo_recebimento
      });
      
      // Atualizar resumo
      contrato.resumo.total_itens++;
      contrato.resumo.total_valor_pedido += parseFloat(item.subtotal);
      contrato.resumo.total_valor_recebido += parseFloat(item.quantidade_recebida) * parseFloat(item.preco_unitario);
      
      if (item.status_recebimento === 'COMPLETO') contrato.resumo.itens_completos++;
      else if (item.status_recebimento === 'PARCIAL') contrato.resumo.itens_parciais++;
      else contrato.resumo.itens_pendentes++;
      
      return acc;
    }, {});
    
    // Converter para array
    const resultado = Object.values(dadosAgrupados).map((fornecedor: any) => ({
      ...fornecedor,
      contratos: Object.values(fornecedor.contratos)
    }));
    
    // Contar total de registros para paginação
    const countQuery = `
      SELECT COUNT(DISTINCT CONCAT(f.id, '_', c.id, '_', pi.id)) as total
      FROM pedidos_fornecedores pf
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      JOIN pedidos pm ON pf.pedido_id = pm.id
      JOIN produtos p ON pi.produto_id = p.id
      JOIN contratos c ON pi.contrato_id = c.id
      JOIN fornecedores f ON pf.fornecedor_id = f.id
      LEFT JOIN recebimentos_simples rs ON pi.id = rs.pedido_item_id
      ${whereClause.replace(/LIMIT.*$/, '').replace(/GROUP BY.*$/, '')}
    `;
    
    const countResult = await db.get(countQuery, params.slice(0, -2));
    const total = countResult?.total || 0;
    
    res.json({
      success: true,
      data: resultado,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(total),
        totalPages: Math.ceil(Number(total) / Number(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar itens agrupados para faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar itens para faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Lista contratos disponíveis para seleção de novo faturamento
 * GET /api/faturamento-interface/contratos-disponiveis
 */
export async function listarContratosDisponiveis(req: Request, res: Response) {
  try {
    const { fornecedor_id, status = 'ativo', busca } = req.query;
    
    let whereClause = 'WHERE c.status = $1';
    const params: any[] = [status];
    let paramCount = 1;
    
    if (fornecedor_id) {
      paramCount++;
      whereClause += ` AND c.fornecedor_id = $${paramCount}`;
      params.push(fornecedor_id);
    }
    
    if (busca) {
      paramCount++;
      whereClause += ` AND (c.numero ILIKE $${paramCount} OR c.descricao ILIKE $${paramCount} OR f.nome ILIKE $${paramCount})`;
      params.push(`%${busca}%`);
    }
    
    const contratos = await db.all(`
      SELECT 
        c.id,
        c.numero,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.status,
        c.descricao,
        c.objeto,
        c.modalidade,
        COUNT(DISTINCT cp.produto_id) as total_produtos,
        COUNT(DISTINCT pi.id) as total_itens_pedidos,
        COALESCE(SUM(pi.quantidade * pi.preco_unitario), 0) as valor_total_pedidos
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      LEFT JOIN pedidos_itens pi ON c.id = pi.contrato_id
      LEFT JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      ${whereClause}
      GROUP BY c.id, c.numero, c.fornecedor_id, f.nome, f.cnpj, c.data_inicio, c.data_fim, c.valor_total, c.status, c.descricao, c.objeto, c.modalidade
      ORDER BY f.nome, c.numero
    `, params);
    
    res.json({
      success: true,
      data: contratos.map(contrato => ({
        ...contrato,
        valor_total: parseFloat(contrato.valor_total) || 0,
        valor_total_pedidos: parseFloat(contrato.valor_total_pedidos) || 0,
        total_produtos: Number(contrato.total_produtos) || 0,
        total_itens_pedidos: Number(contrato.total_itens_pedidos) || 0
      })),
      total: contratos.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar contratos disponíveis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar contratos disponíveis',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Lista modalidades de faturamento cadastradas
 * GET /api/faturamento-interface/modalidades
 */
export async function listarModalidadesFaturamento(req: Request, res: Response) {
  try {
    const { ativo = true } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (ativo !== undefined) {
      whereClause = 'WHERE ativo = $1';
      params.push(ativo === 'true' || ativo === true);
    }
    
    const modalidades = await db.all(`
      SELECT 
        id,
        nome,
        descricao,
        valor_repasse,
        ativo,
        created_at,
        updated_at
      FROM modalidades
      ${whereClause}
      ORDER BY nome
    `, params);
    
    res.json({
      success: true,
      data: modalidades.map(modalidade => ({
        ...modalidade,
        valor_repasse: parseFloat(modalidade.valor_repasse) || 0
      })),
      total: modalidades.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar modalidades de faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar modalidades de faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Cria um novo faturamento com modalidades selecionadas
 * POST /api/faturamento-interface/criar-faturamento
 */
export async function criarNovoFaturamento(req: Request, res: Response) {
  try {
    const {
      contrato_id,
      fornecedor_id,
      modalidades_selecionadas, // Array de IDs das modalidades
      itens_selecionados, // Array de IDs dos itens de pedido
      observacoes
    } = req.body;
    
    // Validações
    if (!contrato_id || !fornecedor_id) {
      return res.status(400).json({
        success: false,
        message: 'Contrato e fornecedor são obrigatórios'
      });
    }
    
    if (!modalidades_selecionadas || !Array.isArray(modalidades_selecionadas) || modalidades_selecionadas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos uma modalidade deve ser selecionada'
      });
    }
    
    if (!itens_selecionados || !Array.isArray(itens_selecionados) || itens_selecionados.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos um item deve ser selecionado'
      });
    }
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Verificar se contrato e fornecedor existem
      const contrato = await db.get(`
        SELECT c.*, f.nome as fornecedor_nome
        FROM contratos c
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE c.id = $1 AND c.fornecedor_id = $2
      `, [contrato_id, fornecedor_id]);
      
      if (!contrato) {
        throw new Error('Contrato não encontrado ou não pertence ao fornecedor especificado');
      }
      
      // Buscar modalidades selecionadas
      const modalidades = await db.all(`
        SELECT id, nome, valor_repasse
        FROM modalidades
        WHERE id IN (${modalidades_selecionadas.map(() => '?').join(',')}) AND ativo = true
      `, modalidades_selecionadas);
      
      if (modalidades.length !== modalidades_selecionadas.length) {
        throw new Error('Uma ou mais modalidades selecionadas não foram encontradas ou estão inativas');
      }
      
      // Buscar itens selecionados
      const itens = await db.all(`
        SELECT 
          pi.id,
          pf.pedido_id,
          pi.produto_id,
          pi.quantidade,
          pi.preco_unitario,
          pi.subtotal,
          p.nome as produto_nome,
          COALESCE(SUM(rs.quantidade_recebida), 0) as quantidade_recebida
        FROM pedidos_fornecedores pf
        JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        JOIN produtos p ON pi.produto_id = p.id
        LEFT JOIN recebimentos_simples rs ON pi.id = rs.pedido_item_id
        WHERE pi.id IN (${itens_selecionados.map(() => '?').join(',')}) AND pi.contrato_id = ?
        GROUP BY pi.id, pf.pedido_id, pi.produto_id, pi.quantidade, pi.preco_unitario, pi.subtotal, p.nome
      `, [...itens_selecionados, contrato_id]);
      
      if (itens.length !== itens_selecionados.length) {
        throw new Error('Um ou mais itens selecionados não foram encontrados ou não pertencem ao contrato');
      }
      
      // Calcular valor total do faturamento
      const valorTotalFaturamento = itens.reduce((total, item) => {
        return total + (parseFloat(item.quantidade_recebida) * parseFloat(item.preco_unitario));
      }, 0);
      
      if (valorTotalFaturamento <= 0) {
        throw new Error('Nenhum item possui quantidade recebida para faturamento');
      }
      
      // Criar registro de faturamento principal
      const resultFaturamento = await db.run(`
        INSERT INTO faturamentos (
          pedido_id, fornecedor_id, contrato_id, valor_total, 
          status, observacoes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'processado', $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        itens[0].pedido_id, // Usar o pedido_id do primeiro item
        fornecedor_id,
        contrato_id,
        valorTotalFaturamento,
        observacoes || 'Faturamento criado via interface de faturamento'
      ]);
      
      const faturamento_id = resultFaturamento.lastID;
      
      // Calcular soma dos valores de repasse para divisão proporcional
      const somaValoresRepasse = modalidades.reduce((soma, modalidade) => {
        return soma + parseFloat(modalidade.valor_repasse);
      }, 0);
      
      if (somaValoresRepasse <= 0) {
        throw new Error('Soma dos valores de repasse das modalidades deve ser maior que zero');
      }
      
      // Inserir divisões por modalidade para cada item
      for (const item of itens) {
        const quantidadeRecebida = parseFloat(item.quantidade_recebida);
        const valorUnitario = parseFloat(item.preco_unitario);
        
        if (quantidadeRecebida > 0) {
          for (const modalidade of modalidades) {
            const valorRepasse = parseFloat(modalidade.valor_repasse);
            const percentualModalidade = (valorRepasse / somaValoresRepasse) * 100;
            const quantidadeModalidade = (quantidadeRecebida * percentualModalidade) / 100;
            const valorTotalModalidade = quantidadeModalidade * valorUnitario;
            
            await db.run(`
              INSERT INTO faturamento_itens_modalidades (
                faturamento_id, pedido_item_id, produto_id, modalidade_id,
                quantidade_original, quantidade_modalidade, percentual_modalidade,
                valor_unitario, valor_total_modalidade, valor_repasse_modalidade,
                observacoes, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              faturamento_id,
              item.id,
              item.produto_id,
              modalidade.id,
              quantidadeRecebida,
              quantidadeModalidade,
              percentualModalidade,
              valorUnitario,
              valorTotalModalidade,
              valorRepasse,
              `Divisão proporcional - ${Math.round(percentualModalidade * 100) / 100}%`
            ]);
          }
        }
      }
      
      await db.run('COMMIT');
      
      res.status(201).json({
        success: true,
        message: 'Faturamento criado com sucesso',
        data: {
          faturamento_id,
          contrato_numero: contrato.numero,
          fornecedor_nome: contrato.fornecedor_nome,
          valor_total: valorTotalFaturamento,
          total_itens: itens.length,
          total_modalidades: modalidades.length
        }
      });
      
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar novo faturamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar faturamento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}