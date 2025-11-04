/**
 * Rotas para monitoramento de performance multi-tenant
 * Expõe métricas, alertas e estatísticas de performance
 */

import { Router } from 'express';
import { performanceEndpoints } from '../middleware/tenantPerformanceMiddleware';
import { tenantConnectionPool } from '../utils/tenantConnectionPool';
import { tenantCache } from '../utils/tenantCache';
import { tenantOptimizedQueries } from '../utils/tenantOptimizedQueries';
import { requireTenant, noTenant } from '../middleware/tenantMiddleware';

const router = Router();
const endpoints = performanceEndpoints();

// ============================================================================
// ROTAS DE MÉTRICAS POR TENANT
// ============================================================================

/**
 * GET /api/performance/tenant/:tenantId/metrics
 * Obtém métricas de performance de um tenant específico
 */
router.get('/tenant/:tenantId/metrics', requireTenant(), endpoints.getTenantMetrics);

/**
 * GET /api/performance/tenant/:tenantId/cache-stats
 * Obtém estatísticas de cache de um tenant específico
 */
router.get('/tenant/:tenantId/cache-stats', requireTenant(), async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Verificar se o tenant existe e está ativo
    const tenantExists = await tenantCache.exists(tenantId, 'tenant:info');
    
    const cacheStats = tenantCache.getStats();
    
    res.json({
      success: true,
      data: {
        tenantId,
        exists: tenantExists,
        globalStats: cacheStats,
        recommendations: generateCacheRecommendations(cacheStats)
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/performance/tenant/:tenantId/cache/clear
 * Limpa cache de um tenant específico
 */
router.post('/tenant/:tenantId/cache/clear', requireTenant(), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { patterns } = req.body;
    
    let clearedCount = 0;
    
    if (patterns && Array.isArray(patterns)) {
      // Limpar padrões específicos
      for (const pattern of patterns) {
        const count = await tenantCache.invalidatePattern(tenantId, pattern);
        clearedCount += count;
      }
    } else {
      // Limpar todo o cache do tenant
      clearedCount = await tenantCache.clearTenant(tenantId);
    }
    
    res.json({
      success: true,
      message: `Cache limpo com sucesso`,
      data: {
        tenantId,
        clearedKeys: clearedCount
      }
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/performance/tenant/:tenantId/cache/invalidate
 * Invalida cache baseado em mudanças de dados
 */
router.post('/tenant/:tenantId/cache/invalidate', requireTenant(), async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { entityType, entityId } = req.body;
    
    if (!entityType || !['escola', 'produto', 'estoque', 'usuario'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'entityType deve ser: escola, produto, estoque ou usuario'
      });
    }
    
    await tenantOptimizedQueries.invalidateCacheOnDataChange(
      tenantId, 
      entityType as any, 
      entityId
    );
    
    res.json({
      success: true,
      message: `Cache invalidado para ${entityType}`,
      data: {
        tenantId,
        entityType,
        entityId
      }
    });
  } catch (error) {
    console.error('Erro ao invalidar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ============================================================================
// ROTAS DE MÉTRICAS GLOBAIS
// ============================================================================

/**
 * GET /api/performance/tenants
 * Obtém métricas de todos os tenants
 */
router.get('/tenants', noTenant(), endpoints.getAllMetrics);

/**
 * GET /api/performance/alerts
 * Obtém alertas de performance
 */
router.get('/alerts', noTenant(), endpoints.getAlerts);

/**
 * GET /api/performance/system
 * Obtém estatísticas do sistema
 */
router.get('/system', noTenant(), endpoints.getSystemStats);

/**
 * GET /api/performance/connection-pool
 * Obtém estatísticas detalhadas do pool de conexões
 */
router.get('/connection-pool', noTenant(), async (req, res) => {
  try {
    const connectionStats = tenantConnectionPool.getConnectionStats();
    const tenantStats = tenantConnectionPool.getTenantStats();
    const queryTypeStats = tenantConnectionPool.getQueryTypeStats();
    
    res.json({
      success: true,
      data: {
        connectionPool: connectionStats,
        tenantUsage: tenantStats,
        queryTypes: queryTypeStats,
        recommendations: generateConnectionPoolRecommendations(connectionStats)
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do pool:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/performance/database/health
 * Verifica saúde do banco de dados
 */
router.get('/database/health', noTenant(), async (req, res) => {
  try {
    const isHealthy = await tenantConnectionPool.testConnection();
    const stats = tenantConnectionPool.getConnectionStats();
    
    const health = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      connections: {
        total: stats.totalConnections,
        active: stats.activeConnections,
        idle: stats.idleConnections,
        waiting: stats.waitingClients
      },
      performance: {
        totalQueries: stats.totalQueries,
        averageQueryTime: stats.averageQueryTime
      },
      timestamp: new Date()
    };
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: health
    });
  } catch (error) {
    console.error('Erro ao verificar saúde do banco:', error);
    res.status(503).json({
      success: false,
      error: 'Erro ao verificar saúde do banco de dados'
    });
  }
});

// ============================================================================
// ROTAS DE OTIMIZAÇÃO
// ============================================================================

/**
 * POST /api/performance/optimize/materialized-views
 * Atualiza views materializadas
 */
router.post('/optimize/materialized-views', noTenant(), async (req, res) => {
  try {
    // Executar refresh das views materializadas
    await tenantConnectionPool.query(
      'system', // tenant fictício para operações de sistema
      'SELECT refresh_tenant_materialized_views()',
      []
    );
    
    res.json({
      success: true,
      message: 'Views materializadas atualizadas com sucesso',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Erro ao atualizar views materializadas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar views materializadas'
    });
  }
});

/**
 * POST /api/performance/optimize/analyze-tables
 * Executa ANALYZE nas tabelas principais
 */
router.post('/optimize/analyze-tables', noTenant(), async (req, res) => {
  try {
    const tables = [
      'tenants', 'escolas', 'produtos', 'usuarios',
      'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico',
      'contratos', 'pedidos', 'tenant_users', 'tenant_configurations'
    ];
    
    const results = [];
    
    for (const table of tables) {
      try {
        await tenantConnectionPool.query('system', `ANALYZE ${table}`, []);
        results.push({ table, status: 'success' });
      } catch (error) {
        results.push({ table, status: 'error', error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: 'Análise de tabelas concluída',
      data: results
    });
  } catch (error) {
    console.error('Erro ao analisar tabelas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao analisar tabelas'
    });
  }
});

// ============================================================================
// ROTAS DE RESET E LIMPEZA
// ============================================================================

/**
 * POST /api/performance/reset/:tenantId
 * Reseta métricas de um tenant específico
 */
router.post('/reset/:tenantId', requireTenant(), endpoints.resetTenantMetrics);

/**
 * POST /api/performance/cache/ping
 * Testa conectividade com Redis
 */
router.post('/cache/ping', noTenant(), async (req, res) => {
  try {
    const isConnected = await tenantCache.ping();
    
    res.json({
      success: true,
      data: {
        redis: {
          connected: isConnected,
          status: isConnected ? 'healthy' : 'unhealthy'
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Erro ao testar Redis:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao testar conectividade com Redis'
    });
  }
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function generateCacheRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.hitRate < 50) {
    recommendations.push('Cache hit rate baixo - considere aumentar TTL ou revisar estratégia de cache');
  }
  
  if (stats.errors > 0) {
    recommendations.push('Erros detectados no cache - verifique conectividade com Redis');
  }
  
  if (stats.hitRate > 90) {
    recommendations.push('Excelente performance de cache - considere expandir uso para mais endpoints');
  }
  
  return recommendations;
}

function generateConnectionPoolRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.waitingClients > 0) {
    recommendations.push('Clientes aguardando conexões - considere aumentar tamanho do pool');
  }
  
  if (stats.averageQueryTime > 1000) {
    recommendations.push('Tempo médio de query alto - revise índices e otimizações');
  }
  
  if (stats.activeConnections / stats.totalConnections > 0.8) {
    recommendations.push('Alta utilização do pool - monitore picos de uso');
  }
  
  return recommendations;
}

export default router;