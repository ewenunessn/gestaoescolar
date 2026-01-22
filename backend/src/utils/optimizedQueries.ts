/**
 * Queries otimizadas para operações de estoque
 * Versão simplificada sem filtros complexos de tenant
 */

const db = require("../database");

export const getEstoqueEscolarResumoOptimized = async (
  tenantId?: string, 
  options: { limit?: number; offset?: number; categoria?: string } = {}
) => {
  const { limit = 100, offset = 0 } = options;
  
  const query = `
    SELECT 
      p.id as produto_id,
      p.nome as produto_nome,
      p.descricao as produto_descricao,
      'Kg' as unidade,
      p.categoria,
      COUNT(DISTINCT e.id) as total_escolas,
      COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as total_escolas_com_estoque,
      COALESCE(SUM(ee.quantidade_atual), 0) as total_quantidade
    FROM produtos p
    CROSS JOIN escolas e
    LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
    WHERE p.ativo = true AND e.ativo = true
    GROUP BY p.id, p.nome, p.descricao, p.categoria
    ORDER BY p.categoria NULLS LAST, p.nome
    LIMIT $1 OFFSET $2
  `;
  
  const result = await db.query(query, [limit, offset]);
  return result.rows;
};

export const getMatrizEstoqueOptimized = async (produtoIds?: number[], limiteProdutos: number = 50, tenantId?: string) => {
  const query = `
    SELECT 
      e.id as escola_id,
      e.nome as escola_nome,
      p.id as produto_id,
      p.nome as produto_nome,
      'Kg' as unidade,
      p.categoria,
      COALESCE(ee.quantidade_atual, 0) as quantidade_atual
    FROM escolas e
    CROSS JOIN (
      SELECT * FROM produtos 
      WHERE ativo = true 
      ORDER BY categoria NULLS LAST, nome
      LIMIT $1
    ) p
    LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = p.id)
    WHERE e.ativo = true
    ORDER BY e.nome, p.categoria NULLS LAST, p.nome
  `;
  
  const result = await db.query(query, [limiteProdutos]);
  return result.rows;
};

export const getEstoqueMultiplosProdutosOptimized = async (
  produtoIds: number[], 
  tenantId?: string,
  options: { escolaId?: number; incluirLotes?: boolean } = {}
) => {
  if (!produtoIds || produtoIds.length === 0) {
    return [];
  }
  
  const query = `
    SELECT 
      p.id as produto_id,
      p.nome as produto_nome,
      p.descricao as produto_descricao,
      'Kg' as unidade,
      p.categoria,
      e.id as escola_id,
      e.nome as escola_nome,
      COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
      CASE 
        WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
        ELSE 'normal'
      END as status_estoque
    FROM produtos p
    CROSS JOIN escolas e
    LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
    WHERE p.id = ANY($1::int[]) AND p.ativo = true AND e.ativo = true
    ORDER BY p.categoria NULLS LAST, p.nome, e.nome
  `;
  
  const result = await db.query(query, [produtoIds]);
  return result.rows;
};

export const getProdutosProximosVencimentoOptimized = async (diasLimite: number = 30) => {
  const query = `
    SELECT 
      el.produto_id,
      p.nome as produto_nome,
      'Kg' as unidade,
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
      AND el.data_validade <= CURRENT_DATE + INTERVAL '${diasLimite} days'
    ORDER BY el.data_validade ASC, p.nome
  `;
  
  const result = await db.query(query);
  return result.rows;
};

export const getRelatorioValidadePorEscolaOptimized = async (escolaId: number, diasLimite: number = 30) => {
  const query = `
    SELECT 
      p.id as produto_id,
      p.nome as produto_nome,
      'Kg' as unidade,
      p.categoria,
      COALESCE(ee.quantidade_atual, 0) as quantidade_atual
    FROM produtos p
    LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = $1)
    WHERE p.ativo = true AND COALESCE(ee.quantidade_atual, 0) > 0
    ORDER BY p.categoria NULLS LAST, p.nome
  `;
  
  const result = await db.query(query, [escolaId]);
  return result.rows;
};

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
      'Kg' as unidade,
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

export const getEstatisticasEstoqueOptimized = async () => {
  const query = `
    SELECT 
      COUNT(DISTINCT p.id) as total_produtos,
      COUNT(DISTINCT e.id) as total_escolas,
      COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual > 0) as itens_com_estoque,
      COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual = 0) as itens_sem_estoque,
      SUM(ee.quantidade_atual) as quantidade_total_estoque
    FROM produtos p
    CROSS JOIN escolas e
    LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
    WHERE p.ativo = true AND e.ativo = true
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
