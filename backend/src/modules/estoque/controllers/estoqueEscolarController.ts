// Controller para estoque escolar - visão geral por produto
import { Request, Response } from "express";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { 
  multiplosProdutosSchema, 
  matrizEstoqueQuerySchema,
  idSchema 
} from '../../../schemas';
import optimizedQueries from '../../../utils/optimizedQueries';
const db = require("../../../database");

// Função para gerar backup em Excel no formato de matriz
async function gerarBackupExcel(client: any) {
  try {
    // Buscar todos os dados de estoque
    const estoqueData = await client.query(`
      SELECT 
        e.nome as escola_nome,
        p.nome as produto_nome,
        p.categoria,
        p.unidade,
        ee.quantidade_atual
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      JOIN produtos p ON p.id = ee.produto_id
      WHERE e.ativo = true AND p.ativo = true
      ORDER BY e.nome, p.categoria, p.nome
    `);

    // Buscar lotes para planilha separada
    const lotesData = await client.query(`
      SELECT 
        el.id,
        el.lote,
        p.nome as produto_nome,
        p.categoria,
        p.unidade,
        el.quantidade_inicial,
        el.quantidade_atual,
        el.data_fabricacao,
        el.data_validade,
        el.status,
        el.observacoes,
        el.created_at
      FROM estoque_lotes el
      JOIN produtos p ON p.id = el.produto_id
      ORDER BY p.categoria, p.nome, el.data_validade
    `);

    // Buscar movimentações para planilha separada
    const movimentacoesData = await client.query(`
      SELECT 
        em.id,
        el.lote as lote_codigo,
        p.nome as produto_nome,
        em.tipo as tipo,
        em.quantidade as quantidade,
        em.motivo,
        em.observacoes,
        em.data_movimentacao
      FROM estoque_movimentacoes em
      JOIN estoque_lotes el ON el.id = em.lote_id
      JOIN produtos p ON p.id = em.produto_id
      ORDER BY em.data_movimentacao DESC
    `);

    // Criar matriz de estoque (escolas x produtos)
    const escolas = [...new Set(estoqueData.rows.map(row => row.escola_nome))].sort();
    const produtos = [...new Set(estoqueData.rows.map(row => row.produto_nome))].sort();
    
    // Criar mapa de quantidades
    const quantidadeMap = new Map();
    estoqueData.rows.forEach(row => {
      const key = `${row.escola_nome}|${row.produto_nome}`;
      quantidadeMap.set(key, row.quantidade_atual);
    });

    // Criar dados da matriz
    const matrizData = [];
    
    // Cabeçalho com produtos
    const header = ['Escola', ...produtos];
    matrizData.push(header);
    
    // Linhas com escolas e quantidades
    escolas.forEach(escola => {
      const row = [escola];
      produtos.forEach(produto => {
        const key = `${escola}|${produto}`;
        const quantidade = quantidadeMap.get(key) || 0;
        row.push(quantidade);
      });
      matrizData.push(row);
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Adicionar planilha matriz (escolas x produtos)
    const wsMatriz = XLSX.utils.aoa_to_sheet(matrizData);
    XLSX.utils.book_append_sheet(wb, wsMatriz, 'Matriz Estoque');

    // Adicionar planilha de estoque detalhado
    const wsEstoque = XLSX.utils.json_to_sheet(estoqueData.rows);
    XLSX.utils.book_append_sheet(wb, wsEstoque, 'Estoque Detalhado');

    // Adicionar planilha de lotes
    const wsLotes = XLSX.utils.json_to_sheet(lotesData.rows);
    XLSX.utils.book_append_sheet(wb, wsLotes, 'Lotes');

    // Adicionar planilha de movimentações
    const wsMovimentacoes = XLSX.utils.json_to_sheet(movimentacoesData.rows);
    XLSX.utils.book_append_sheet(wb, wsMovimentacoes, 'Movimentacoes');

    // Criar diretório de backup se não existir
    // No Vercel, usar /tmp que é writable, em desenvolvimento usar ./backups
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    const backupDir = isProduction ? '/tmp' : path.join(process.cwd(), 'backups');
    
    if (!isProduction && !fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-estoque-${timestamp}.xlsx`;
    const filepath = path.join(backupDir, filename);

    // Salvar arquivo
    XLSX.writeFile(wb, filepath);

    return {
      filename,
      filepath,
      total_escolas: escolas.length,
      total_produtos: produtos.length,
      total_registros_estoque: estoqueData.rows.length,
      total_lotes: lotesData.rows.length,
      total_movimentacoes: movimentacoesData.rows.length
    };
  } catch (error) {
    console.error('Erro ao gerar backup Excel:', error);
    throw error;
  }
}

export async function buscarEstoqueEscolarProduto(req: Request, res: Response) {
  try {
    const { produto_id } = req.params;

    // Buscar informações do produto
    const produtoResult = await db.query(`
      SELECT id, nome, descricao, unidade, categoria
      FROM produtos 
      WHERE id = $1 AND ativo = true
    `, [produto_id]);

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    const produto = produtoResult.rows[0];

    // Buscar estoque do produto em todas as escolas
    const estoqueResult = await db.query(`
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        $1::integer as produto_id,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        $2 as unidade,
        CASE 
          WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
          ELSE 'normal'
        END as status_estoque,
        ee.updated_at as data_ultima_atualizacao
      FROM escolas e
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = $1)
      WHERE e.ativo = true
      ORDER BY e.nome
    `, [produto_id, produto.unidade]);

    const escolas = estoqueResult.rows;
    const totalQuantidade = escolas.reduce((sum, escola) => sum + parseFloat(escola.quantidade_atual), 0);
    const escolasComEstoque = escolas.filter(escola => parseFloat(escola.quantidade_atual) > 0).length;

    const resultado = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      produto_descricao: produto.descricao,
      unidade: produto.unidade,
      categoria: produto.categoria,
      escolas: escolas,
      total_quantidade: totalQuantidade,
      total_escolas_com_estoque: escolasComEstoque,
      total_escolas: escolas.length
    };

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estoque escolar do produto:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar estoque escolar do produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function resetEstoque(req: Request, res: Response) {
  try {
    const result = await db.transaction(async (client) => {
      // Transação já iniciada automaticamente pela função transaction
      
      // 1. Gerar backup em Excel antes do reset
      const backupData = await gerarBackupExcel(client);
      
      // 2. Deletar movimentações de lotes primeiro (devido à foreign key)
      const deleteMovimentacoes = await client.query(`
        DELETE FROM estoque_movimentacoes
      `);
      
      // 3. Deletar histórico de movimentações (devido à foreign key)
      const deleteHistorico = await client.query(`
        DELETE FROM estoque_escolas_historico
      `);
      
      // 4. Deletar todos os lotes
      const deleteLotes = await client.query(`
        DELETE FROM estoque_lotes
      `);
      
      // 5. Zerar todos os estoques
      const resetEstoques = await client.query(`
        DELETE FROM estoque_escolas
      `);
      
      // Retornar dados da operação
      return {
        backup_excel: backupData,
        movimentacoes_deletadas: deleteMovimentacoes.rowCount,
        historico_deletado: deleteHistorico.rowCount,
        lotes_deletados: deleteLotes.rowCount,
        estoques_resetados: resetEstoques.rowCount,
        data_backup: new Date().toISOString()
      };
    });
    
    res.json({
      success: true,
      message: 'Estoque global resetado com sucesso',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Erro ao resetar estoque global:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao resetar estoque global',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarEstoqueEscolar(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant
    const { setTenantContextFromRequest } = await import('../../../utils/tenantContext');
    await setTenantContextFromRequest(req);

    // Extrair e validar tenant da requisição
    const { tenantInventoryValidator } = await import('../../../services/tenantInventoryValidator');
    const tenantId = tenantInventoryValidator.extractTenantFromRequest(req);

    // Usar query otimizada COM filtro de tenant
    const produtos = await optimizedQueries.getEstoqueEscolarResumoOptimized(tenantId);

    const produtosFormatados = produtos.map(row => ({
      produto_id: row.produto_id,
      produto_nome: row.produto_nome,
      produto_descricao: row.produto_descricao,
      unidade: row.unidade,
      categoria: row.categoria,
      total_escolas: parseInt(row.total_escolas),
      total_escolas_com_estoque: parseInt(row.total_escolas_com_estoque),
      total_quantidade: parseFloat(row.total_quantidade) || 0
    }));

    res.json({
      success: true,
      data: produtosFormatados,
      total: produtosFormatados.length,
      performance: {
        query_optimized: true,
        cache_enabled: false // TODO: implementar cache
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar estoque escolar:", error);
    
    // Tratar erros específicos de tenant
    const { handleTenantInventoryError } = await import('../../../services/tenantInventoryValidator');
    return handleTenantInventoryError(error, res);
  }
}

// NOVO ENDPOINT OTIMIZADO: Buscar dados de múltiplos produtos de uma vez
export async function buscarEstoqueMultiplosProdutos(req: Request, res: Response) {
  try {
    // Validação já foi feita pelo middleware, dados estão limpos
    const { produto_ids } = req.body;

    // Buscar dados de todos os produtos de uma vez - OTIMIZAÇÃO PRINCIPAL
    const result = await db.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        e.id as escola_id,
        e.nome as escola_nome,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        CASE 
          WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
          ELSE 'normal'
        END as status_estoque,
        ee.updated_at as data_ultima_atualizacao
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      WHERE p.id = ANY($1::int[]) 
        AND p.ativo = true 
        AND e.ativo = true
      ORDER BY p.categoria, p.nome, e.nome
    `, [produto_ids]);

    // Agrupar dados por produto
    const produtosMap = new Map();
    
    result.rows.forEach(row => {
      const produtoId = row.produto_id;
      
      if (!produtosMap.has(produtoId)) {
        produtosMap.set(produtoId, {
          produto_id: produtoId,
          produto_nome: row.produto_nome,
          produto_descricao: row.produto_descricao,
          unidade: row.unidade,
          categoria: row.categoria,
          escolas: [],
          total_quantidade: 0,
          total_escolas_com_estoque: 0,
          total_escolas: 0
        });
      }
      
      const produto = produtosMap.get(produtoId);
      const quantidade = parseFloat(row.quantidade_atual) || 0;
      
      produto.escolas.push({
        escola_id: row.escola_id,
        escola_nome: row.escola_nome,
        produto_id: produtoId,
        quantidade_atual: quantidade,
        unidade: row.unidade,
        status_estoque: row.status_estoque,
        data_ultima_atualizacao: row.data_ultima_atualizacao
      });
      
      produto.total_quantidade += quantidade;
      if (quantidade > 0) {
        produto.total_escolas_com_estoque++;
      }
      produto.total_escolas++;
    });

    // Converter Map para Array
    const produtos = Array.from(produtosMap.values());

    res.json({
      success: true,
      data: produtos,
      total: produtos.length,
      performance: {
        produtos_solicitados: produto_ids.length,
        produtos_encontrados: produtos.length,
        total_registros_processados: result.rows.length,
        otimizacao: "Query única em vez de N+1 queries"
      }
    });

  } catch (error) {
    console.error("❌ Erro ao buscar múltiplos produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar dados de múltiplos produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// NOVO ENDPOINT OTIMIZADO: Buscar matriz completa (escolas x produtos) de uma vez
export async function buscarMatrizEstoque(req: Request, res: Response) {
  try {
    // Validação já foi feita pelo middleware, dados estão limpos
    const { produto_ids, limite_produtos } = req.query;
    
    let whereClause = "WHERE p.ativo = true AND e.ativo = true";
    let params: any[] = [];
    
    // Se produtos específicos foram solicitados
    if (produto_ids && Array.isArray(produto_ids) && produto_ids.length > 0) {
      whereClause += " AND p.id = ANY($1::int[])";
      params.push(produto_ids);
    }

    // Buscar todos os dados da matriz de uma vez - SUPER OTIMIZAÇÃO
    const result = await db.query(`
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade,
        p.categoria,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual
      FROM escolas e
      CROSS JOIN (
        SELECT * FROM produtos 
        WHERE ativo = true 
        ${produto_ids ? 'AND id = ANY($1::int[])' : ''}
        ORDER BY categoria, nome 
        LIMIT $${params.length + 1}
      ) p
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = p.id)
      WHERE e.ativo = true
      ORDER BY e.nome, p.categoria, p.nome
    `, [...params, limite_produtos]);

    // Agrupar dados por escola
    const escolasMap = new Map();
    const produtosInfo = new Map();
    
    result.rows.forEach(row => {
      const escolaId = row.escola_id;
      const produtoId = row.produto_id;
      
      // Armazenar info dos produtos
      if (!produtosInfo.has(produtoId)) {
        produtosInfo.set(produtoId, {
          id: produtoId,
          nome: row.produto_nome,
          unidade: row.unidade,
          categoria: row.categoria
        });
      }
      
      // Agrupar por escola
      if (!escolasMap.has(escolaId)) {
        escolasMap.set(escolaId, {
          escola_id: escolaId,
          escola_nome: row.escola_nome,
          produtos: {}
        });
      }
      
      const escola = escolasMap.get(escolaId);
      escola.produtos[produtoId] = {
        quantidade: parseFloat(row.quantidade_atual) || 0,
        unidade: row.unidade
      };
    });

    const escolas = Array.from(escolasMap.values());
    const produtos = Array.from(produtosInfo.values());

    res.json({
      success: true,
      data: {
        escolas: escolas,
        produtos: produtos,
        matriz_carregada: true
      },
      performance: {
        total_escolas: escolas.length,
        total_produtos: produtos.length,
        total_registros_processados: result.rows.length,
        otimizacao: "Matriz completa em query única"
      }
    });

  } catch (error) {
    console.error("❌ Erro ao buscar matriz de estoque:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao buscar matriz de estoque",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}