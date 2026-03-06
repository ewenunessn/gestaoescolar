import { Router } from 'express';
import { getCacheStats, invalidateCache } from '../middleware/cache';
import { getRateLimitStats, clearRateLimitStore } from '../middleware/rateLimiter';
import { getRedisStats } from '../config/redis';

const router = Router();

/**
 * GET /api/monitoring/health
 * Health check detalhado
 */
router.get('/health', async (req, res) => {
  const db = require('../database');
  
  try {
    const dbConnected = await db.testConnection();
    const dbResult = await db.query('SELECT NOW() as current_time, version()');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      database: {
        connected: dbConnected,
        currentTime: dbResult.rows[0].current_time,
        version: dbResult.rows[0].version
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/monitoring/stats
 * Estatísticas do sistema
 */
router.get('/stats', async (req, res) => {
  const cacheStats = await getCacheStats();
  const rateLimitStats = getRateLimitStats();
  const redisStats = getRedisStats();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime())
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      unit: 'MB'
    },
    cache: cacheStats,
    rateLimit: rateLimitStats,
    redis: redisStats,
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  });
});

/**
 * POST /api/monitoring/cache/clear
 * Limpar cache (requer autenticação em produção)
 */
router.post('/cache/clear', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'ForbiddenError',
      message: 'Operação não permitida em produção',
      statusCode: 403
    });
  }

  const pattern = req.body.pattern;
  const cleared = await invalidateCache(pattern);
  
  res.json({
    success: true,
    message: 'Cache limpo com sucesso',
    cleared,
    pattern: pattern || 'all'
  });
});

/**
 * POST /api/monitoring/rate-limit/clear
 * Limpar rate limit (requer autenticação em produção)
 */
router.post('/rate-limit/clear', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'ForbiddenError',
      message: 'Operação não permitida em produção',
      statusCode: 403
    });
  }

  clearRateLimitStore();
  
  res.json({
    success: true,
    message: 'Rate limit limpo com sucesso'
  });
});

/**
 * GET /api/monitoring/performance
 * Métricas de performance
 */
router.get('/performance', async (req, res) => {
  const db = require('../database');
  
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    const dbLatency = Date.now() - start;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        database: {
          latency: dbLatency,
          unit: 'ms',
          status: dbLatency < 100 ? 'excellent' : dbLatency < 300 ? 'good' : 'slow'
        },
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
          unit: 'MB'
        },
        uptime: {
          seconds: Math.floor(process.uptime()),
          formatted: formatUptime(process.uptime())
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper para formatar uptime
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

export default router;
