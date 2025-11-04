/**
 * Queries otimizadas para operações multi-tenant
 * Utiliza índices compostos e técnicas de otimização específicas para multi-tenancy
 */

import { tenantCache } from './tenantCache';
const db = require('../database');

interface QueryOptions {
  tenantId: string;
  useCache?: boolean;
  cacheTTL?: number;
  cachePrefix?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Classe base para queries otimizadas multi-tenant
 */
export class TenantOptimizedQueries {
  
  /**
   * Executa query com cache automático baseado em tenant
   */
  private async executeWithCache<T>(
    cacheKey: string,
    query: string,
    params: any[],
    options: QueryOptions
  ): Promise<T[]> {
    const { tenantId, useCache = true, cacheTTL = 300, cachePrefix = 'query' } = options;
    
    if (useCache) {
      // Tentar buscar do cache primeiro
      const cached = await tenantCache.get<T[]>(tenantId, cacheKey, { 
        prefix: cachePrefix,
        ttl: cacheTTL 
      });
      
      if (cached !== null) {
        return cached;
      }
    }
    
    // Executar query no banco
    const result = await db.query(query, params);
    const data = result.rows as T[];
    
    if (useCache) {
      // Cachear resultado
      await tenantCache.set(tenantId, cacheKey, data, { 
        prefix: cachePrefix,
        ttl: cacheTTL 
      });
    }
    
    return data;
  }

  /**
   * Query otimizada para listar escolas do tenant
   */
  async getEscolasByTenant(options: QueryOptions & PaginationOptions): Promise<any[]> {
    const { 
      tenantId, 
      page = 1, 
      limit = 50, 
      orderBy = 'nome', 
      orderDirection = 'ASC' 
    } = options;
    
    const offset = (page - 1) * limit;
    const cacheKey = `escolas:list:${page}:${limit}:${orderBy}:${orderDirection}`;
    
    const query = `
      SELECT 
        e.id,
        e.nome,
        e.endereco,
        e.telefone,
        e.email,
        e.ativo,
        e.created_at,
        e.updated_at,
        COUNT(ee.id) as total_produtos_estoque
      FROM escolas e
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.quantidade_atual > 0)
      WHERE e.tenant_id = $1 AND e.ativo = true
      GROUP BY e.id, e.nome, e.endereco, e.telefone, e.email, e.ativo, e.created_at, e.updated_at
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;
    
    return this.executeWithCache(cacheKey, query, [tenantId, limit, offset], options);
  }

  /**
   * Query otimizada para produtos do tenant com informações de estoque
   */
  async getProdutosByTenant(options: QueryOptions & PaginationOptions & { categoria?: string }): Promise<any[]> {
    const { 
      tenantId, 
      categoria,
      page = 1, 
      limit = 50, 
      orderBy = 'nome', 
      orderDirection = 'ASC' 
    } = options;
    
    const offset = (page - 1) * limit;
    const cacheKey = `produtos:list:${categoria || 'all'}:${page}:${limit}:${orderBy}:${orderDirection}`;
    
    let whereClause = 'WHERE p.tenant_id = $1 AND p.ativo = true';
    let params = [tenantId, limit, offset];
    
    if (categoria) {
      whereClause += ' AND p.categoria = $4';
      params.push(categoria);
    }
    
    const query = `
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.unidade,
        p.categoria,
        p.ativo,
        p.created_at,
        p.updated_at,
        COUNT(DISTINCT ee.escola_id) as escolas_com_estoque,
        COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque,
        COUNT(DISTINCT el.id) FILTER (WHERE el.status = 'ativo' AND el.quantidade_atual > 0) as lotes_ativos
      FROM produtos p
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.quantidade_atual > 0)
      LEFT JOIN estoque_lotes el ON (el.produto_id = p.id)
      ${whereClause}
      GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria, p.ativo, p.created_at, p.updated_at
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;
    
    return this.executeWithCache(cacheKey, query, params, options);
  }

  /**
   * Query otimizada para resumo de estoque por tenant
   */
  async getEstoqueResumoByTenant(options: QueryOptions): Promise<any[]> {
    const { tenantId } = options;
    const cacheKey = 'estoque:resumo:geral';
    
    const query = `
      WITH estoque_agregado AS (
        SELECT 
          p.id as produto_id,
          p.nome as produto_nome,
          p.descricao,
          p.unidade,
          p.categoria,
          COUNT(DISTINCT e.id) as total_escolas,
          COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as escolas_com_estoque,
          COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total,
          AVG(ee.quantidade_atual) FILTER (WHERE ee.quantidade_atual > 0) as media_por_escola,
          MIN(ee.updated_at) as primeira_movimentacao,
          MAX(ee.updated_at) as ultima_movimentacao
        FROM produtos p
        INNER JOIN estoque_escolas ee ON ee.produto_id = p.id
        INNER JOIN escolas e ON (e.id = ee.escola_id AND e.tenant_id = $1)
        WHERE p.tenant_id = $1 AND p.ativo = true AND e.ativo = true
        GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria
        HAVING COALESCE(SUM(ee.quantidade_atual), 0) > 0
      )
      SELECT *
      FROM estoque_agregado
      ORDER BY categoria NULLS LAST, produto_nome
    `;
    
    return this.executeWithCache(cacheKey, query, [tenantId], options);
  }

  /**
   * Query otimizada para matriz de estoque (escolas x produtos) por tenant
   */
  async getMatrizEstoqueByTenant(
    options: QueryOptions & { produtoIds?: number[]; limiteProdutos?: number }
  ): Promise<any[]> {
    const { tenantId, produtoIds, limiteProdutos = 50 } = options;
    
    const produtoFilter = produtoIds && produtoIds.length > 0 ? produtoIds.join(',') : 'all';
    const cacheKey = `matriz:estoque:${produtoFilter}:${limiteProdutos}`;
    
    let whereClause = 'WHERE p.tenant_id = $1 AND p.ativo = true AND e.tenant_id = $1 AND e.ativo = true';
    let params = [tenantId, limiteProdutos];
    
    if (produtoIds && produtoIds.length > 0) {
      whereClause += ' AND p.id = ANY($3::int[])';
      params.push(produtoIds as any);
    }
    
    const query = `
      WITH produtos_limitados AS (
        SELECT p.*
        FROM produtos p
        WHERE p.tenant_id = $1 AND p.ativo = true
        ${produtoIds && produtoIds.length > 0 ? 'AND p.id = ANY($3::int[])' : ''}
        ORDER BY p.categoria NULLS LAST, p.nome
        LIMIT $2
      ),
      matriz_dados AS (
        SELECT 
          e.id as escola_id,
          e.nome as escola_nome,
          pl.id as produto_id,
          pl.nome as produto_nome,
          pl.unidade,
          pl.categoria,
          COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
          ee.updated_at as ultima_atualizacao,
          CASE 
            WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
            WHEN COALESCE(ee.quantidade_atual, 0) < 10 THEN 'baixo'
            WHEN COALESCE(ee.quantidade_atual, 0) < 50 THEN 'medio'
            ELSE 'alto'
          END as nivel_estoque
        FROM escolas e
        CROSS JOIN produtos_limitados pl
        LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = pl.id)
        WHERE e.tenant_id = $1 AND e.ativo = true
      )
      SELECT *
      FROM matriz_dados
      ORDER BY escola_nome, categoria NULLS LAST, produto_nome
    `;
    
    return this.executeWithCache(cacheKey, query, params, options);
  }

  /**
   * Query otimizada para produtos próximos ao vencimento por tenant
   */
  async getProdutosProximosVencimentoByTenant(
    options: QueryOptions & { diasLimite?: number }
  ): Promise<any[]> {
    const { tenantId, diasLimite = 30 } = options;
    const cacheKey = `validade:proximos:${diasLimite}`;
    
    const query = `
      WITH lotes_vencimento AS (
        SELECT 
          el.produto_id,
          p.nome as produto_nome,
          p.unidade,
          p.categoria,
          e.id as escola_id,
          e.nome as escola_nome,
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
        JOIN produtos p ON (p.id = el.produto_id AND p.tenant_id = $1)
        JOIN escolas e ON (e.id = el.escola_id AND e.tenant_id = $1)
        WHERE el.status = 'ativo' 
          AND el.quantidade_atual > 0
          AND el.data_validade IS NOT NULL
          AND el.data_validade <= CURRENT_DATE + INTERVAL '$2 days'
          AND p.ativo = true
          AND e.ativo = true
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
        escola_nome,
        produto_nome
    `;
    
    return this.executeWithCache(cacheKey, query, [tenantId, diasLimite], options);
  }

  /**
   * Query otimizada para histórico de movimentações por tenant
   */
  async getHistoricoMovimentacoesByTenant(
    options: QueryOptions & {
      escolaId?: number;
      produtoId?: number;
      dataInicio?: string;
      dataFim?: string;
      limite?: number;
    }
  ): Promise<any[]> {
    const { 
      tenantId, 
      escolaId, 
      produtoId, 
      dataInicio, 
      dataFim, 
      limite = 100 
    } = options;
    
    const cacheKey = `historico:${escolaId || 'all'}:${produtoId || 'all'}:${dataInicio || 'all'}:${dataFim || 'all'}:${limite}`;
    
    let whereConditions = ['p.tenant_id = $1', 'e.tenant_id = $1'];
    let params: any[] = [tenantId];
    let paramIndex = 2;
    
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
        p.categoria,
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
    
    return this.executeWithCache(cacheKey, query, params, options);
  }

  /**
   * Query otimizada para estatísticas gerais do tenant
   */
  async getEstatisticasByTenant(options: QueryOptions): Promise<any> {
    const { tenantId } = options;
    const cacheKey = 'estatisticas:geral';
    
    const query = `
      WITH estatisticas AS (
        SELECT 
          COUNT(DISTINCT p.id) as total_produtos,
          COUNT(DISTINCT e.id) as total_escolas,
          COUNT(DISTINCT u.id) as total_usuarios,
          COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual > 0) as itens_com_estoque,
          COUNT(DISTINCT ee.id) FILTER (WHERE ee.quantidade_atual = 0) as itens_sem_estoque,
          COALESCE(SUM(ee.quantidade_atual), 0) as quantidade_total_estoque,
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
          ) as lotes_vencidos,
          COUNT(DISTINCT eeh.id) FILTER (WHERE eeh.data_movimentacao >= CURRENT_DATE - INTERVAL '30 days') as movimentacoes_ultimo_mes
        FROM produtos p
        CROSS JOIN escolas e
        LEFT JOIN usuarios u ON u.tenant_id = $1
        LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
        LEFT JOIN estoque_lotes el ON el.produto_id = p.id
        LEFT JOIN estoque_escolas_historico eeh ON (eeh.produto_id = p.id AND eeh.escola_id = e.id)
        WHERE p.tenant_id = $1 AND p.ativo = true 
          AND e.tenant_id = $1 AND e.ativo = true
      )
      SELECT *
      FROM estatisticas
    `;
    
    const result = await this.executeWithCache(cacheKey, query, [tenantId], options);
    return result[0] || {};
  }

  /**
   * Invalida cache relacionado a um tenant específico
   */
  async invalidateTenantCache(tenantId: string, patterns: string[] = []): Promise<void> {
    if (patterns.length === 0) {
      // Invalidar todos os caches do tenant
      await tenantCache.clearTenant(tenantId);
    } else {
      // Invalidar padrões específicos
      for (const pattern of patterns) {
        await tenantCache.invalidatePattern(tenantId, pattern, { prefix: 'query' });
      }
    }
  }

  /**
   * Invalida cache quando há mudanças em dados específicos
   */
  async invalidateCacheOnDataChange(
    tenantId: string, 
    entityType: 'escola' | 'produto' | 'estoque' | 'usuario',
    entityId?: number
  ): Promise<void> {
    const patterns: string[] = [];
    
    switch (entityType) {
      case 'escola':
        patterns.push('escolas:*', 'matriz:*', 'historico:*');
        if (entityId) patterns.push(`historico:${entityId}:*`);
        break;
      case 'produto':
        patterns.push('produtos:*', 'estoque:*', 'matriz:*', 'validade:*');
        if (entityId) patterns.push(`historico:*:${entityId}:*`);
        break;
      case 'estoque':
        patterns.push('estoque:*', 'matriz:*', 'validade:*', 'historico:*', 'estatisticas:*');
        break;
      case 'usuario':
        patterns.push('estatisticas:*');
        break;
    }
    
    await this.invalidateTenantCache(tenantId, patterns);
  }
}

// Instância singleton
export const tenantOptimizedQueries = new TenantOptimizedQueries();