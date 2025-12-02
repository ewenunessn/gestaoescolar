/**
 * Queries otimizadas específicas para operações de estoque com multi-tenancy
 * Foco em performance, paginação e uso eficiente de índices
 */

const db = require("../database");

interface QueryOptions {
  tenantId?: string;
  limit?: number;
  offset?: number;
  useCache?: boolean;
}

interface InventoryQueryOptions extends QueryOptions {
  escolaId?: number;
  produtoIds?: number[];
  categoria?: string;
  incluirSemEstoque?: boolean;
  incluirLotes?: boolean;
}

/**
 * Query otimizada para listar estoque de uma escola específica
 * Elimina CROSS JOIN e usa índices compostos eficientemente
 */
export const getEstoqueEscolaOptimized = async (
  escolaId: number,
  tenantId: string,
  options: InventoryQueryOptions = {}
) => {
  const { 
    limit = 100, 
    offset = 0, 
    categoria, 
    incluirSemEstoque = true,
    incluirLotes = true 
  } = options;

  let params: any[] = [escolaId, tenantId];
  let paramIndex = 3;
  let whereClause = '';

  if (categoria) {
    whereClause += ` AND p.categoria = $${paramIndex}`;
    params.push(categoria);
    paramIndex++;
  }

  if (!incluirSemEstoque) {
    whereClause += ` AND (ee.quantidade_atual > 0 OR el_agg.total_lotes > 0)`;
  }

  params.push(limit, offset);

  const query = `
    WITH produtos_escola AS (
      SELECT DISTINCT p.id, p.nome, p.descricao, p.unidade, p.categoria
      FROM produtos p
      WHERE p.ativo = true AND p.tenant_id = $2
        ${whereClause}
      ORDER BY p.categoria NULLS LAST, p.nome
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    ),
    ${incluirLotes ? `
    lotes_agregados AS (
      SELECT 
        el.produto_id,
        COALESCE(SUM(el.quantidade_atual), 0) as total_lotes,
        MIN(CASE WHEN el.quantidade_atual > 0 THEN el.data_validade END) as min_validade
      FROM estoque_lotes el
      INNER JOIN produtos_escola pe ON pe.id = el.produto_id
      WHERE el.status = 'ativo'
        AND el.escola_id = $1
        AND el.tenant_id = $2
      GROUP BY el.produto_id
    ),` : ''}
    estoque_final AS (
      SELECT 
        pe.id as produto_id,
        pe.nome as produto_nome,
        pe.descricao as produto_descricao,
        pe.unidade,
        pe.categoria,
        $1::integer as escola_id,
        COALESCE(ee.quantidade_atual, 0) as quantidade_estoque_principal,
        ${incluirLotes ? 'COALESCE(la.total_lotes, 0)' : '0'} as quantidade_lotes,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        ${incluirLotes ? 'la.min_validade' : 'ee.data_validade'} as data_validade,
        ee.data_entrada,
        COALESCE(ee.updated_at, CURRENT_TIMESTAMP) as data_ultima_atualizacao
      FROM produtos_escola pe
      LEFT JOIN estoque_escolas ee ON (
        ee.produto_id = pe.id 
        AND ee.escola_id = $1 
        AND ee.tenant_id = $2
      )
      ${incluirLotes ? 'LEFT JOIN lotes_agregados la ON la.produto_id = pe.id' : ''}
    )
    SELECT *,
      CASE 
        WHEN quantidade_atual = 0 THEN 'sem_estoque'
        WHEN data_validade IS NOT NULL AND data_validade < CURRENT_DATE THEN 'vencido'
        WHEN data_validade IS NOT NULL AND data_validade <= CURRENT_DATE + INTERVAL '7 days' THEN 'critico'
        WHEN data_validade IS NOT NULL AND data_validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'atencao'
        ELSE 'normal'
      END as status_estoque,
      CASE 
        WHEN data_validade IS NOT NULL THEN (data_validade - CURRENT_DATE)::integer
        ELSE NULL
      END as dias_para_vencimento
    FROM estoque_final
    ${!incluirSemEstoque ? 'WHERE quantidade_atual > 0' : ''}
    ORDER BY 
      CASE 
        WHEN data_validade IS NOT NULL AND data_validade < CURRENT_DATE THEN 1
        WHEN data_validade IS NOT NULL AND data_validade <= CURRENT_DATE + INTERVAL '7 days' THEN 2
        WHEN data_validade IS NOT NULL AND data_validade <= CURRENT_DATE + INTERVAL '30 days' THEN 3
        ELSE 4
      END,
      categoria NULLS LAST, produto_nome
  `;

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Query otimizada para resumo de estoque por tenant
 * Usa agregações eficientes e evita subqueries desnecessárias
 */
export const getEstoqueResumoTenantOptimized = async (
  tenantId: string,
  options: InventoryQueryOptions = {}
) => {
  const { limit = 50, offset = 0, categoria } = options;

  let params: any[] = [tenantId];
  let paramIndex = 2;
  let whereClause = '';

  if (categoria) {
    whereClause += ` AND p.categoria = $${paramIndex}`;
    params.push(categoria);
    paramIndex++;
  }

  params.push(limit, offset);

  const query = `
    WITH produtos_tenant AS (
      SELECT p.id, p.nome, p.descricao, p.unidade, p.categoria
      FROM produtos p
      WHERE p.ativo = true AND p.tenant_id = $1
        ${whereClause}
      ORDER BY p.categoria NULLS LAST, p.nome
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    ),
    estoque_agregado AS (
      SELECT 
        pt.id as produto_id,
        pt.nome as produto_nome,
        pt.descricao,
        pt.unidade,
        pt.categoria,
        COUNT(DISTINCT e.id) as total_escolas_tenant,
        COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as escolas_com_estoque,
        COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_estoque_principal,
        COALESCE(SUM(el.quantidade_atual), 0) as quantidade_lotes,
        COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos
      FROM produtos_tenant pt
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = pt.id AND ee.tenant_id = $1)
      LEFT JOIN escolas e ON (e.id = ee.escola_id AND e.tenant_id = $1 AND e.ativo = true)
      LEFT JOIN estoque_lotes el ON (el.produto_id = pt.id AND el.tenant_id = $1 AND el.status = 'ativo')
      GROUP BY pt.id, pt.nome, pt.descricao, pt.unidade, pt.categoria
    )
    SELECT *,
      (quantidade_estoque_principal + quantidade_lotes) as quantidade_total,
      CASE 
        WHEN (quantidade_estoque_principal + quantidade_lotes) = 0 THEN 'sem_estoque'
        WHEN escolas_com_estoque = 0 THEN 'sem_distribuicao'
        WHEN escolas_com_estoque < (total_escolas_tenant * 0.5) THEN 'distribuicao_parcial'
        ELSE 'bem_distribuido'
      END as status_distribuicao
    FROM estoque_agregado
    ORDER BY categoria NULLS LAST, produto_nome
  `;

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Query otimizada para matriz de estoque com paginação eficiente
 * Evita CROSS JOIN e usa índices compostos
 */
export const getMatrizEstoquePaginadaOptimized = async (
  tenantId: string,
  options: {
    produtoIds?: number[];
    limiteProdutos?: number;
    limitEscolas?: number;
    offsetProdutos?: number;
    offsetEscolas?: number;
    incluirSemEstoque?: boolean;
  } = {}
) => {
  const {
    produtoIds,
    limiteProdutos = 20,
    limitEscolas = 20,
    offsetProdutos = 0,
    offsetEscolas = 0,
    incluirSemEstoque = false
  } = options;

  let params: any[] = [tenantId];
  let paramIndex = 2;
  let produtoWhereClause = '';

  if (produtoIds && produtoIds.length > 0) {
    produtoWhereClause += ` AND p.id = ANY($${paramIndex}::int[])`;
    params.push(produtoIds);
    paramIndex++;
  }

  // Adicionar parâmetros de paginação
  params.push(limiteProdutos, offsetProdutos, limitEscolas, offsetEscolas);

  const query = `
    WITH produtos_paginados AS (
      SELECT p.id, p.nome, p.unidade, p.categoria
      FROM produtos p
      WHERE p.ativo = true AND p.tenant_id = $1
        ${produtoWhereClause}
      ORDER BY p.categoria NULLS LAST, p.nome
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    ),
    escolas_paginadas AS (
      SELECT e.id, e.nome
      FROM escolas e
      WHERE e.ativo = true AND e.tenant_id = $1
      ORDER BY e.nome
      LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}
    ),
    matriz_base AS (
      SELECT 
        ep.id as escola_id,
        ep.nome as escola_nome,
        pp.id as produto_id,
        pp.nome as produto_nome,
        pp.unidade,
        pp.categoria,
        COALESCE(ee.quantidade_atual, 0) as quantidade_estoque,
        COALESCE(el_sum.quantidade_lotes, 0) as quantidade_lotes
      FROM escolas_paginadas ep
      CROSS JOIN produtos_paginados pp
      LEFT JOIN estoque_escolas ee ON (
        ee.escola_id = ep.id 
        AND ee.produto_id = pp.id 
        AND ee.tenant_id = $1
      )
      LEFT JOIN (
        SELECT 
          el.escola_id,
          el.produto_id,
          SUM(el.quantidade_atual) as quantidade_lotes
        FROM estoque_lotes el
        INNER JOIN produtos_paginados pp2 ON pp2.id = el.produto_id
        INNER JOIN escolas_paginadas ep2 ON ep2.id = el.escola_id
        WHERE el.status = 'ativo' AND el.tenant_id = $1
        GROUP BY el.escola_id, el.produto_id
      ) el_sum ON (el_sum.escola_id = ep.id AND el_sum.produto_id = pp.id)
    )
    SELECT *,
      (quantidade_estoque + quantidade_lotes) as quantidade_total,
      CASE 
        WHEN (quantidade_estoque + quantidade_lotes) = 0 THEN 'sem_estoque'
        WHEN (quantidade_estoque + quantidade_lotes) < 10 THEN 'baixo'
        WHEN (quantidade_estoque + quantidade_lotes) < 50 THEN 'medio'
        ELSE 'alto'
      END as nivel_estoque
    FROM matriz_base
    ${!incluirSemEstoque ? 'WHERE (quantidade_estoque + quantidade_lotes) > 0' : ''}
    ORDER BY escola_nome, categoria NULLS LAST, produto_nome
  `;

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Query otimizada para produtos próximos ao vencimento por tenant
 * Usa índices de data_validade eficientemente
 */
export const getProdutosVencimentoTenantOptimized = async (
  tenantId: string,
  diasLimite: number = 30,
  options: { limit?: number; offset?: number; escolaId?: number } = {}
) => {
  const { limit = 100, offset = 0, escolaId } = options;

  let params: any[] = [tenantId, diasLimite];
  let paramIndex = 3;
  let whereClause = '';

  if (escolaId) {
    whereClause += ` AND el.escola_id = $${paramIndex}`;
    params.push(escolaId);
    paramIndex++;
  }

  params.push(limit, offset);

  const query = `
    WITH lotes_vencimento AS (
      SELECT 
        el.produto_id,
        p.nome as produto_nome,
        p.unidade,
        p.categoria,
        el.escola_id,
        e.nome as escola_nome,
        el.lote,
        el.quantidade_atual,
        el.data_validade,
        (el.data_validade - CURRENT_DATE)::integer as dias_para_vencimento
      FROM estoque_lotes el
      INNER JOIN produtos p ON (p.id = el.produto_id AND p.tenant_id = $1)
      INNER JOIN escolas e ON (e.id = el.escola_id AND e.tenant_id = $1)
      WHERE el.status = 'ativo' 
        AND el.quantidade_atual > 0
        AND el.data_validade IS NOT NULL
        AND el.data_validade <= CURRENT_DATE + INTERVAL '$2 days'
        AND el.tenant_id = $1
        AND p.ativo = true
        AND e.ativo = true
        ${whereClause}
      ORDER BY el.data_validade ASC, p.categoria NULLS LAST, p.nome
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    )
    SELECT *,
      CASE 
        WHEN data_validade < CURRENT_DATE THEN 'vencido'
        WHEN dias_para_vencimento <= 7 THEN 'critico'
        WHEN dias_para_vencimento <= 30 THEN 'atencao'
        ELSE 'normal'
      END as status_validade
    FROM lotes_vencimento
    ORDER BY 
      CASE 
        WHEN data_validade < CURRENT_DATE THEN 1
        WHEN dias_para_vencimento <= 7 THEN 2
        WHEN dias_para_vencimento <= 30 THEN 3
        ELSE 4
      END,
      data_validade ASC,
      escola_nome,
      produto_nome
  `;

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Query otimizada para histórico de movimentações com filtros eficientes
 * Usa índices compostos para melhor performance
 */
export const getHistoricoMovimentacoesTenantOptimized = async (
  tenantId: string,
  options: {
    escolaId?: number;
    produtoId?: number;
    tipoMovimentacao?: string;
    dataInicio?: string;
    dataFim?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const {
    escolaId,
    produtoId,
    tipoMovimentacao,
    dataInicio,
    dataFim,
    limit = 50,
    offset = 0
  } = options;

  let params: any[] = [tenantId];
  let paramIndex = 2;
  let whereConditions: string[] = [];

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

  if (tipoMovimentacao) {
    whereConditions.push(`eeh.tipo_movimentacao = $${paramIndex}`);
    params.push(tipoMovimentacao);
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

  params.push(limit, offset);

  const whereClause = whereConditions.length > 0 
    ? `AND ${whereConditions.join(' AND ')}`
    : '';

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
      p.categoria,
      e.nome as escola_nome,
      u.nome as usuario_nome,
      eeh.created_at
    FROM estoque_escolas_historico eeh
    INNER JOIN produtos p ON (p.id = eeh.produto_id AND p.tenant_id = $1)
    INNER JOIN escolas e ON (e.id = eeh.escola_id AND e.tenant_id = $1)
    LEFT JOIN usuarios u ON (u.id = eeh.usuario_id AND u.tenant_id = $1)
    WHERE eeh.tenant_id = $1
      ${whereClause}
    ORDER BY eeh.data_movimentacao DESC, eeh.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const result = await db.query(query, params);
  return result.rows;
};

/**
 * Query otimizada para estatísticas de estoque por tenant
 * Usa agregações eficientes em uma única query
 */
export const getEstatisticasEstoqueTenantOptimized = async (tenantId: string) => {
  const query = `
    WITH estatisticas_base AS (
      SELECT 
        COUNT(DISTINCT p.id) as total_produtos,
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual > 0) as itens_com_estoque_principal,
        COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque_principal
      FROM produtos p
      CROSS JOIN escolas e
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id AND ee.tenant_id = $1)
      WHERE p.tenant_id = $1 AND p.ativo = true 
        AND e.tenant_id = $1 AND e.ativo = true
    ),
    estatisticas_lotes AS (
      SELECT 
        COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos,
        COALESCE(SUM(el.quantidade_atual), 0) FILTER (WHERE el.status = 'ativo') as quantidade_total_lotes,
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
      FROM estoque_lotes el
      INNER JOIN produtos p ON (p.id = el.produto_id AND p.tenant_id = $1)
      WHERE el.tenant_id = $1
    ),
    estatisticas_movimentacoes AS (
      SELECT 
        COUNT(*) FILTER (WHERE eeh.data_movimentacao >= CURRENT_DATE - INTERVAL '30 days') as movimentacoes_ultimo_mes,
        COUNT(*) FILTER (WHERE eeh.data_movimentacao >= CURRENT_DATE - INTERVAL '7 days') as movimentacoes_ultima_semana
      FROM estoque_escolas_historico eeh
      WHERE eeh.tenant_id = $1
    )
    SELECT 
      eb.*,
      el.*,
      em.*,
      (eb.quantidade_total_estoque_principal + el.quantidade_total_lotes) as quantidade_total_geral,
      CASE 
        WHEN eb.total_produtos = 0 THEN 0
        ELSE ROUND((eb.itens_com_estoque_principal::decimal / eb.total_produtos) * 100, 2)
      END as percentual_produtos_com_estoque
    FROM estatisticas_base eb
    CROSS JOIN estatisticas_lotes el
    CROSS JOIN estatisticas_movimentacoes em
  `;

  const result = await db.query(query, [tenantId]);
  return result.rows[0] || {};
};

export default {
  getEstoqueEscolaOptimized,
  getEstoqueResumoTenantOptimized,
  getMatrizEstoquePaginadaOptimized,
  getProdutosVencimentoTenantOptimized,
  getHistoricoMovimentacoesTenantOptimized,
  getEstatisticasEstoqueTenantOptimized
};