/**
 * Queries otimizadas para operações de estoque
 * Utiliza índices e técnicas de otimização para melhor performance
 */

const db = require("../database");

// ============================================================================
// QUERIES OTIMIZADAS DE ESTOQUE ESCOLAR
// ============================================================================

/**
 * Query otimizada para listar resumo do estoque escolar
 * Utiliza índices e agregações eficientes
 */
export const getEstoqueEscolarResumoOptimized = async () => {
  const query = `
    WITH estoque_agregado AS (
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as total_escolas_com_estoque,
        COALESCE(SUM(ee.quantidade_atual), 0) as total_quantidade
      FROM produtos p
      INNER JOIN estoque_escolas ee ON ee.produto_id = p.id
      INNER JOIN escolas e ON e.id = ee.escola_id
      WHERE p.ativo = true AND e.ativo = true
      GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria
      HAVING COALESCE(SUM(ee.quantidade_atual), 0) > 0
    )
    SELECT *
    FROM estoque_agregado
    ORDER BY categoria NULLS LAST, produto_nome
  `;
  
  const result = await db.query(query);
  return result.rows;
};

/**
 * Query otimizada para buscar estoque de múltiplos produtos
 * Resolve o problema N+1 com uma única query
 */
export const getEstoqueMultiplosProdutosOptimized = async (produtoIds: number[]) => {
  const query = `
    WITH produtos_solicitados AS (
      SELECT unnest($1::int[]) as produto_id
    ),
    estoque_detalhado AS (
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        e.id as escola_id,
        e.nome as escola_nome,
        COALESCE(
          (SELECT SUM(el.quantidade_atual) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo'),
          ee.quantidade_atual,
          0
        ) as quantidade_atual,
        CASE 
          WHEN COALESCE(
            (SELECT SUM(el.quantidade_atual) 
             FROM estoque_lotes el 
             WHERE el.produto_id = p.id AND el.status = 'ativo'),
            ee.quantidade_atual,
            0
          ) = 0 THEN 'sem_estoque'
          ELSE 'normal'
        END as status_estoque,
        ee.updated_at as data_ultima_atualizacao
      FROM produtos_solicitados ps
      JOIN produtos p ON p.id = ps.produto_id
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      WHERE p.ativo = true AND e.ativo = true
    )
    SELECT *
    FROM estoque_detalhado
    ORDER BY categoria NULLS LAST, produto_nome, escola_nome
  `;
  
  const result = await db.query(query, [produtoIds]);
  return result.rows;
};

/**
 * Query otimizada para matriz de estoque (escolas x produtos)
 * Carrega dados de forma eficiente para visualização em matriz
 */
export const getMatrizEstoqueOptimized = async (produtoIds?: number[], limiteProdutos: number = 50) => {
  let whereClause = "WHERE p.ativo = true AND e.ativo = true";
  let params: any[] = [limiteProdutos];
  
  if (produtoIds && produtoIds.length > 0) {
    whereClause += " AND p.id = ANY($2::int[])";
    params.push(produtoIds);
  }
  
  const query = `
    WITH produtos_limitados AS (
      SELECT p.*
      FROM produtos p
      WHERE p.ativo = true
      ${produtoIds && produtoIds.length > 0 ? 'AND p.id = ANY($2::int[])' : ''}
      ORDER BY p.categoria NULLS LAST, p.nome
      LIMIT $1
    ),
    matriz_dados AS (
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        pl.id as produto_id,
        pl.nome as produto_nome,
        pl.unidade,
        pl.categoria,
        COALESCE(
          (SELECT SUM(el.quantidade_atual) 
           FROM estoque_lotes el 
           WHERE el.produto_id = pl.id AND el.status = 'ativo'),
          ee.quantidade_atual,
          0
        ) as quantidade_atual
      FROM escolas e
      CROSS JOIN produtos_limitados pl
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = pl.id)
      WHERE e.ativo = true
    )
    SELECT *
    FROM matriz_dados
    ORDER BY escola_nome, categoria NULLS LAST, produto_nome
  `;
  
  const result = await db.query(query, params);
  return result.rows;
};

// ============================================================================
// QUERIES OTIMIZADAS DE VALIDADE
// ============================================================================

/**
 * Query otimizada para produtos próximos ao vencimento
 * Utiliza índices de data_validade para performance
 */
export const getProdutosProximosVencimentoOptimized = async (diasLimite: number = 30) => {
  const query = `
    WITH lotes_vencimento AS (
      SELECT 
        el.produto_id,
        p.nome as produto_nome,
        p.unidade,
        el.lote,
        el.quantidade_atual,
        el.data_validade,
        (el.data_validade - CURRENT_DATE)::integer as dias_para_vencimento,
        CASE 
          WHEN el.data_validade < CURRENT_DATE THEN 'vencido'
          WHEN el.data_validade <= CURRENT_DATE + INTERVAL '7 days' THEN 'critico'
          WHEN el.data_validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'atencao'
          ELSE 'normal'
        END as status_validade
      FROM estoque_lotes el
      JOIN produtos p ON p.id = el.produto_id
      WHERE el.status = 'ativo' 
        AND el.quantidade_atual > 0
        AND el.data_validade IS NOT NULL
        AND el.data_validade <= CURRENT_DATE + INTERVAL '$1 days'
    )
    SELECT *
    FROM lotes_vencimento
    ORDER BY 
      CASE status_validade
        WHEN 'vencido' THEN 1
        WHEN 'critico' THEN 2
        WHEN 'atencao' THEN 3
        ELSE 4
      END,
      data_validade ASC,
      produto_nome
  `;
  
  const result = await db.query(query, [diasLimite]);
  return result.rows;
};

/**
 * Query otimizada para relatório de validade por escola
 */
export const getRelatorioValidadePorEscolaOptimized = async (escolaId: number, diasLimite: number = 30) => {
  const query = `
    WITH estoque_escola_validade AS (
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade,
        p.categoria,
        COALESCE(
          (SELECT MIN(el.data_validade) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo' AND el.quantidade_atual > 0),
          ee.data_validade
        ) as data_validade_proxima,
        COALESCE(
          (SELECT SUM(el.quantidade_atual) 
           FROM estoque_lotes el 
           WHERE el.produto_id = p.id AND el.status = 'ativo'),
          ee.quantidade_atual,
          0
        ) as quantidade_atual
      FROM produtos p
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = $1)
      WHERE p.ativo = true
    ),
    produtos_com_status AS (
      SELECT *,
        CASE 
          WHEN data_validade_proxima IS NULL THEN 'sem_validade'
          WHEN data_validade_proxima < CURRENT_DATE THEN 'vencido'
          WHEN data_validade_proxima <= CURRENT_DATE + INTERVAL '7 days' THEN 'critico'
          WHEN data_validade_proxima <= CURRENT_DATE + INTERVAL '30 days' THEN 'atencao'
          ELSE 'normal'
        END as status_validade,
        CASE 
          WHEN data_validade_proxima IS NOT NULL 
          THEN (data_validade_proxima - CURRENT_DATE)::integer
          ELSE NULL
        END as dias_para_vencimento
      FROM estoque_escola_validade
      WHERE quantidade_atual > 0
        AND (data_validade_proxima IS NULL OR data_validade_proxima <= CURRENT_DATE + INTERVAL '$2 days')
    )
    SELECT *
    FROM produtos_com_status
    ORDER BY 
      CASE status_validade
        WHEN 'vencido' THEN 1
        WHEN 'critico' THEN 2
        WHEN 'atencao' THEN 3
        WHEN 'sem_validade' THEN 4
        ELSE 5
      END,
      data_validade_proxima ASC NULLS LAST,
      produto_nome
  `;
  
  const result = await db.query(query, [escolaId, diasLimite]);
  return result.rows;
};

// ============================================================================
// QUERIES OTIMIZADAS DE HISTÓRICO
// ============================================================================

/**
 * Query otimizada para histórico de movimentações
 * Utiliza índices compostos para melhor performance
 */
export const getHistoricoMovimentacoesOptimized = async (
  escolaId?: number,
  produtoId?: number,
  dataInicio?: string,
  dataFim?: string,
  limite: number = 100
) => {
  let whereConditions = ['1=1'];
  let params: any[] = [];
  let paramIndex = 1;
  
  if (escolaId) {
    whereConditions.push(`eeh.escola_id = $${paramIndex}`);
    params.push(escolaId);
    paramIndex++;
  }
  
  if (produtoId) {
    whereConditions.push(`eeh.produto_id = $${paramIndex}`);
    params.push(produtoId);
    paramIndex++;
  }
  
  if (dataInicio) {
    whereConditions.push(`eeh.data_movimentacao >= $${paramIndex}`);
    params.push(dataInicio);
    paramIndex++;
  }
  
  if (dataFim) {
    whereConditions.push(`eeh.data_movimentacao <= $${paramIndex}`);
    params.push(dataFim);
    paramIndex++;
  }
  
  params.push(limite);
  
  const query = `
    SELECT 
      eeh.id,
      eeh.tipo_movimentacao,
      eeh.quantidade_anterior,
      eeh.quantidade_movimentada,
      eeh.quantidade_posterior,
      eeh.motivo,
      eeh.documento_referencia,
      eeh.data_movimentacao,
      p.nome as produto_nome,
      p.unidade,
      e.nome as escola_nome,
      u.nome as usuario_nome
    FROM estoque_escolas_historico eeh
    JOIN produtos p ON p.id = eeh.produto_id
    JOIN escolas e ON e.id = eeh.escola_id
    LEFT JOIN usuarios u ON u.id = eeh.usuario_id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY eeh.data_movimentacao DESC
    LIMIT $${paramIndex}
  `;
  
  const result = await db.query(query, params);
  return result.rows;
};

// ============================================================================
// QUERIES OTIMIZADAS DE ESTATÍSTICAS
// ============================================================================

/**
 * Query otimizada para estatísticas gerais do estoque
 */
export const getEstatisticasEstoqueOptimized = async () => {
  const query = `
    WITH estatisticas AS (
      SELECT 
        COUNT(DISTINCT p.id) as total_produtos,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual > 0) as itens_com_estoque,
        COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual = 0) as itens_sem_estoque,
        SUM(ee.quantidade_atual) as quantidade_total_estoque,
        COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos,
        COUNT(DISTINCT el.id) FILTER (
          WHERE el.status = 'ativo' 
            AND el.quantidade_atual > 0 
            AND el.data_validade IS NOT NULL 
            AND el.data_validade <= CURRENT_DATE + INTERVAL '30 days'
        ) as lotes_proximos_vencimento,
        COUNT(DISTINCT el.id) FILTER (
          WHERE el.status = 'ativo' 
            AND el.quantidade_atual > 0 
            AND el.data_validade IS NOT NULL 
            AND el.data_validade < CURRENT_DATE
        ) as lotes_vencidos
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
      LEFT JOIN estoque_lotes el ON el.produto_id = p.id
      WHERE p.ativo = true AND e.ativo = true
    )
    SELECT *
    FROM estatisticas
  `;
  
  const result = await db.query(query);
  return result.rows[0];
};

export default {
  getEstoqueEscolarResumoOptimized,
  getEstoqueMultiplosProdutosOptimized,
  getMatrizEstoqueOptimized,
  getProdutosProximosVencimentoOptimized,
  getRelatorioValidadePorEscolaOptimized,
  getHistoricoMovimentacoesOptimized,
  getEstatisticasEstoqueOptimized
};