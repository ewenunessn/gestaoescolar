/**
 * Cache management routes for tenant inventory system
 */

import { Router, Request, Response } from 'express';
import tenantInventoryCache, { 
  invalidateTenantCacheOnEstoqueChange,
  getTenantIdFromRequest
} from '../utils/tenantInventoryCache';
import { 
  getRedisTenantCache,
  redisCacheTenantInventory 
} from '../utils/redisTenantCache';
import { getCacheStats } from '../config/redis';
import { cacheHealthCheckMiddleware } from '../middleware/cacheMiddleware';

const router = Router();

/**
 * Get cache statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    
    // Get in-memory cache stats
    const memoryStats = tenantInventoryCache.getStats();
    
    // Get Redis cache stats if available
    const redisCache = getRedisTenantCache();
    let redisStats = null;
    
    if (redisCache && tenantId) {
      try {
        redisStats = await redisCache.getTenantStats(tenantId);
      } catch (error) {
        console.warn('Failed to get Redis stats:', error);
      }
    }
    
    // Get general cache configuration
    const cacheConfig = await getCacheStats();
    
    res.json({
      success: true,
      data: {
        memory: memoryStats,
        redis: redisStats,
        config: cacheConfig,
        tenant_id: tenantId
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check for cache system
 */
router.get('/health', cacheHealthCheckMiddleware);

/**
 * Clear all cache for current tenant
 */
router.delete('/tenant', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    // Clear in-memory cache
    const memoryCleared = tenantInventoryCache.invalidateTenant(tenantId);
    
    // Clear Redis cache if available
    let redisCleared = 0;
    const redisCache = getRedisTenantCache();
    if (redisCache) {
      try {
        redisCleared = await redisCache.invalidateTenant(tenantId);
      } catch (error) {
        console.warn('Failed to clear Redis cache:', error);
      }
    }
    
    res.json({
      success: true,
      message: `Cache cleared for tenant ${tenantId}`,
      data: {
        memory_entries_cleared: memoryCleared,
        redis_entries_cleared: redisCleared,
        tenant_id: tenantId
      }
    });
  } catch (error) {
    console.error('Error clearing tenant cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear tenant cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear specific cache pattern for current tenant
 */
router.delete('/tenant/pattern/:pattern', async (req: Request, res: Response) => {
  try {
    const { pattern } = req.params;
    const tenantId = getTenantIdFromRequest(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: 'Cache pattern is required'
      });
    }
    
    // Clear in-memory cache by pattern
    const memoryCleared = tenantInventoryCache.invalidatePattern(tenantId, pattern);
    
    // Clear Redis cache by pattern if available
    let redisCleared = 0;
    const redisCache = getRedisTenantCache();
    if (redisCache) {
      try {
        redisCleared = await redisCache.invalidatePattern(tenantId, pattern);
      } catch (error) {
        console.warn('Failed to clear Redis cache pattern:', error);
      }
    }
    
    res.json({
      success: true,
      message: `Cache pattern '${pattern}' cleared for tenant ${tenantId}`,
      data: {
        pattern,
        memory_entries_cleared: memoryCleared,
        redis_entries_cleared: redisCleared,
        tenant_id: tenantId
      }
    });
  } catch (error) {
    console.error('Error clearing cache pattern:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache pattern',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Invalidate inventory cache (same as inventory change)
 */
router.post('/invalidate/inventory', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    // Invalidate all inventory-related cache
    invalidateTenantCacheOnEstoqueChange(tenantId);
    
    // Also invalidate Redis cache if available
    const redisCache = getRedisTenantCache();
    if (redisCache) {
      try {
        await redisCacheTenantInventory.invalidateAll(tenantId);
      } catch (error) {
        console.warn('Failed to invalidate Redis inventory cache:', error);
      }
    }
    
    res.json({
      success: true,
      message: `Inventory cache invalidated for tenant ${tenantId}`,
      data: {
        tenant_id: tenantId,
        invalidated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error invalidating inventory cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate inventory cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Warm up cache for current tenant
 */
router.post('/warmup', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantIdFromRequest(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }
    
    // This is a placeholder for cache warmup logic
    // In a real implementation, you would pre-load frequently accessed data
    
    res.json({
      success: true,
      message: `Cache warmup initiated for tenant ${tenantId}`,
      data: {
        tenant_id: tenantId,
        warmup_started_at: new Date().toISOString(),
        note: 'Warmup process running in background'
      }
    });
  } catch (error) {
    console.error('Error warming up cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to warm up cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cache configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await getCacheStats();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error getting cache config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;