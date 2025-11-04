/**
 * Redis configuration for tenant inventory caching
 */

import { createRedisTenantCache, getRedisTenantCache } from '../utils/redisTenantCache';

interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTTL: number;
}

/**
 * Get Redis configuration from environment variables
 */
export const getRedisConfig = (): RedisConfig => {
  return {
    enabled: process.env.REDIS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'tenant_inventory',
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300') // 5 minutes
  };
};

/**
 * Cache configuration for different inventory operations
 */
export const getCacheConfiguration = () => {
  return {
    inventory: {
      resumo: { ttl: 120, priority: 'high' }, // 2 minutes
      escola: { ttl: 180, priority: 'high' }, // 3 minutes  
      produto: { ttl: 180, priority: 'medium' }, // 3 minutes
      lotes: { ttl: 240, priority: 'medium' }, // 4 minutes
      matriz: { ttl: 300, priority: 'low' }, // 5 minutes
      movimentacoes: { ttl: 120, priority: 'medium' }, // 2 minutes
      produtos: { ttl: 900, priority: 'low' }, // 15 minutes
      estatisticas: { ttl: 600, priority: 'low' } // 10 minutes
    },
    redis: {
      maxMemoryPolicy: 'allkeys-lru',
      maxConnections: 10,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false
    }
  };
};

/**
 * Initialize Redis tenant cache if enabled
 */
export const initializeRedisCache = async (): Promise<void> => {
  const config = getRedisConfig();
  
  if (!config.enabled) {
    console.log('📦 Redis caching disabled, using in-memory cache');
    return;
  }

  try {
    const redisCache = createRedisTenantCache({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      defaultTTL: config.defaultTTL
    });

    // Test connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 5000);

      if (redisCache.isConnected()) {
        clearTimeout(timeout);
        resolve(true);
      } else {
        // Wait for connection
        const checkConnection = setInterval(() => {
          if (redisCache.isConnected()) {
            clearTimeout(timeout);
            clearInterval(checkConnection);
            resolve(true);
          }
        }, 100);
      }
    });

    console.log('✅ Redis tenant cache initialized successfully');
    console.log(`📍 Redis server: ${config.host}:${config.port}`);
    console.log(`🔑 Key prefix: ${config.keyPrefix}`);
    console.log(`⏰ Default TTL: ${config.defaultTTL}s`);
    
  } catch (error) {
    console.error('❌ Failed to initialize Redis cache:', error);
    console.log('📦 Falling back to in-memory cache');
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  const redisCache = getRedisTenantCache();
  const config = getRedisConfig();
  
  if (!redisCache || !config.enabled) {
    return {
      type: 'in-memory',
      enabled: false,
      connected: false
    };
  }

  try {
    return {
      type: 'redis',
      enabled: true,
      connected: redisCache.isConnected(),
      config: {
        host: config.host,
        port: config.port,
        db: config.db,
        keyPrefix: config.keyPrefix,
        defaultTTL: config.defaultTTL
      }
    };
  } catch (error) {
    return {
      type: 'redis',
      enabled: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Health check for cache system
 */
export const healthCheckCache = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
}> => {
  const config = getRedisConfig();
  
  if (!config.enabled) {
    return {
      status: 'healthy',
      details: {
        type: 'in-memory',
        message: 'In-memory cache is working'
      }
    };
  }

  const redisCache = getRedisTenantCache();
  
  if (!redisCache) {
    return {
      status: 'unhealthy',
      details: {
        type: 'redis',
        message: 'Redis cache not initialized'
      }
    };
  }

  try {
    if (!redisCache.isConnected()) {
      return {
        status: 'unhealthy',
        details: {
          type: 'redis',
          message: 'Redis connection lost'
        }
      };
    }

    // Test cache operations
    const testData = { timestamp: Date.now() };
    
    await redisCache.set('health_check', 'test', {}, testData, 10); // 10 seconds TTL
    const retrieved = await redisCache.get('health_check', 'test', {});
    
    if (!retrieved || (retrieved as any).timestamp !== testData.timestamp) {
      return {
        status: 'degraded',
        details: {
          type: 'redis',
          message: 'Cache operations not working correctly'
        }
      };
    }

    return {
      status: 'healthy',
      details: {
        type: 'redis',
        message: 'Redis cache is working correctly',
        connected: true
      }
    };
    
  } catch (error) {
    return {
      status: 'degraded',
      details: {
        type: 'redis',
        message: 'Cache operations failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

export default {
  getRedisConfig,
  initializeRedisCache,
  getCacheStats,
  healthCheckCache,
  getCacheConfiguration
};