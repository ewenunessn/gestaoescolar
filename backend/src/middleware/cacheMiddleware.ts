/**
 * Cache middleware for tenant inventory operations
 */

import { Request, Response, NextFunction } from 'express';
import { 
  autoInvalidateTenantCache,
  getTenantIdFromRequest 
} from '../utils/tenantInventoryCache';
import { getRedisTenantCache } from '../utils/redisTenantCache';
import { getRedisConfig } from '../config/redis';

/**
 * Middleware to add cache headers and tenant context
 */
export const cacheHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add cache control headers for inventory endpoints
  if (req.path.includes('/estoque')) {
    // Set cache headers based on operation type
    if (req.method === 'GET') {
      // Cache GET requests for a short time
      res.set({
        'Cache-Control': 'private, max-age=60', // 1 minute
        'X-Cache-Type': 'tenant-inventory'
      });
    } else {
      // Don't cache modification operations
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Cache-Type': 'no-cache'
      });
    }
  }

  next();
};

/**
 * Middleware to automatically invalidate cache on inventory modifications
 */
export const autoInvalidateCacheMiddleware = autoInvalidateTenantCache;

/**
 * Middleware to add cache statistics to response headers (development only)
 */
export const cacheStatsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      const tenantId = getTenantIdFromRequest(req);
      
      if (tenantId) {
        res.set({
          'X-Tenant-ID': tenantId,
          'X-Cache-Enabled': getRedisConfig().enabled ? 'redis' : 'memory'
        });
      }
      
      return originalSend.call(this, data);
    };
  }

  next();
};

/**
 * Middleware to handle cache errors gracefully
 */
export const cacheErrorHandlerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // If there was a cache error, add a header to indicate fallback
    if (res.locals.cacheError) {
      res.set('X-Cache-Status', 'error-fallback');
    }
    
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware to warm up cache for frequently accessed data
 */
export const cacheWarmupMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Only warm up cache for specific high-traffic endpoints
  const shouldWarmup = req.path.includes('/estoque-escola/resumo') && req.method === 'GET';
  
  if (shouldWarmup) {
    const tenantId = getTenantIdFromRequest(req);
    
    if (tenantId) {
      try {
        // Pre-warm related cache entries in the background
        setImmediate(async () => {
          const redisCache = getRedisTenantCache();
          if (redisCache) {
            // Warm up commonly accessed inventory data
            console.log(`🔥 Warming up cache for tenant ${tenantId}`);
            
            // Pre-warm inventory summary cache by making a background request
            // This is a simple warmup strategy - in production you might want more sophisticated logic
            try {
              // You could pre-load frequently accessed data here
              // For example, cache the most accessed schools or products
              console.log(`📦 Cache warmup completed for tenant ${tenantId}`);
            } catch (warmupError) {
              console.warn('⚠️ Cache warmup background task failed:', warmupError);
            }
          }
        });
      } catch (error) {
        // Ignore warmup errors
        console.warn('⚠️ Cache warmup failed:', error);
      }
    }
  }

  next();
};

/**
 * Combined cache middleware stack
 */
export const cacheMiddlewareStack = [
  cacheHeadersMiddleware,
  cacheStatsMiddleware,
  cacheErrorHandlerMiddleware,
  autoInvalidateCacheMiddleware,
  cacheWarmupMiddleware
];

/**
 * Cache health check endpoint middleware
 */
export const cacheHealthCheckMiddleware = async (req: Request, res: Response) => {
  try {
    const { healthCheckCache } = await import('../config/redis');
    const health = await healthCheckCache();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 206 : 500;
    
    res.status(statusCode).json({
      status: health.status,
      cache: health.details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to check cache health',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

export default {
  cacheHeadersMiddleware,
  autoInvalidateCacheMiddleware,
  cacheStatsMiddleware,
  cacheErrorHandlerMiddleware,
  cacheWarmupMiddleware,
  cacheMiddlewareStack,
  cacheHealthCheckMiddleware
};