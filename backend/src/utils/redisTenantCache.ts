/**
 * Redis-based tenant inventory cache for production environments
 * Provides distributed caching with tenant isolation
 */

import Redis from 'ioredis';

interface RedisTenantCacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  defaultTTL?: number;
}

class RedisTenantInventoryCache {
  private redis: Redis;
  private keyPrefix: string;
  private defaultTTL: number;

  constructor(config: RedisTenantCacheConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db || 0,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });

    this.keyPrefix = config.keyPrefix || 'tenant_inventory';
    this.defaultTTL = config.defaultTTL || 300; // 5 minutes default

    // Handle Redis connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis tenant cache connected');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Redis tenant cache error:', error);
    });

    this.redis.on('close', () => {
      console.log('🔌 Redis tenant cache connection closed');
    });
  }

  /**
   * Generates a tenant-scoped Redis key
   */
  private getRedisKey(tenantId: string, operation: string, params: any): string {
    const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
    const hash = this.hashString(paramString);
    return `${this.keyPrefix}:${tenantId}:${operation}:${hash}`;
  }

  /**
   * Simple hash function for parameter strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Stores data in Redis with tenant isolation
   */
  async set<T>(
    tenantId: string, 
    operation: string, 
    params: any, 
    data: T, 
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const key = this.getRedisKey(tenantId, operation, params);
      const value = JSON.stringify({
        data,
        tenantId,
        timestamp: Date.now(),
        operation,
        params
      });
      
      const ttl = ttlSeconds || this.defaultTTL;
      await this.redis.setex(key, ttl, value);
      
      console.log(`📦 Cached tenant ${tenantId} inventory data: ${operation}`);
    } catch (error) {
      console.error('❌ Redis cache set error:', error);
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Retrieves data from Redis with tenant validation
   */
  async get<T>(tenantId: string, operation: string, params: any): Promise<T | null> {
    try {
      const key = this.getRedisKey(tenantId, operation, params);
      const value = await this.redis.get(key);
      
      if (!value) {
        return null;
      }

      const cached = JSON.parse(value);
      
      // Verify tenant isolation
      if (cached.tenantId !== tenantId) {
        console.warn(`🚨 Redis tenant cache isolation violation: ${tenantId} tried to access ${cached.tenantId} data`);
        await this.redis.del(key); // Remove invalid entry
        return null;
      }

      console.log(`🎯 Cache hit for tenant ${tenantId} inventory: ${operation}`);
      return cached.data;
    } catch (error) {
      console.error('❌ Redis cache get error:', error);
      return null;
    }
  }

  /**
   * Removes a specific cache entry
   */
  async delete(tenantId: string, operation: string, params: any): Promise<boolean> {
    try {
      const key = this.getRedisKey(tenantId, operation, params);
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis cache delete error:', error);
      return false;
    }
  }

  /**
   * Invalidates all cache entries for a specific tenant
   */
  async invalidateTenant(tenantId: string): Promise<number> {
    try {
      const pattern = `${this.keyPrefix}:${tenantId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      console.log(`🗑️ Invalidated ${result} cache entries for tenant ${tenantId}`);
      return result;
    } catch (error) {
      console.error('❌ Redis cache invalidate tenant error:', error);
      return 0;
    }
  }

  /**
   * Invalidates cache by pattern within a tenant scope
   */
  async invalidatePattern(tenantId: string, pattern: string): Promise<number> {
    try {
      const searchPattern = `${this.keyPrefix}:${tenantId}:${pattern}`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      console.log(`🗑️ Invalidated ${result} cache entries for tenant ${tenantId} pattern ${pattern}`);
      return result;
    } catch (error) {
      console.error('❌ Redis cache invalidate pattern error:', error);
      return 0;
    }
  }

  /**
   * Gets cache statistics for a tenant
   */
  async getTenantStats(tenantId: string): Promise<{
    keyCount: number;
    memoryUsage: number;
    operations: string[];
  }> {
    try {
      const pattern = `${this.keyPrefix}:${tenantId}:*`;
      const keys = await this.redis.keys(pattern);
      
      const operations = new Set<string>();
      let totalMemory = 0;

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length >= 4) {
          operations.add(parts[3]); // operation name
        }
        
        // Get memory usage for this key
        try {
          const memory = await this.redis.memory('USAGE', key);
          totalMemory += memory || 0;
        } catch {
          // Memory command might not be available in all Redis versions
        }
      }

      return {
        keyCount: keys.length,
        memoryUsage: totalMemory,
        operations: Array.from(operations)
      };
    } catch (error) {
      console.error('❌ Redis cache stats error:', error);
      return {
        keyCount: 0,
        memoryUsage: 0,
        operations: []
      };
    }
  }

  /**
   * Helper function for cache with callback
   */
  async getOrSet<T>(
    tenantId: string,
    operation: string,
    params: any,
    fetchFunction: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(tenantId, operation, params);
    if (cached !== null) {
      return cached;
    }
    
    // If not found, execute function and cache result
    const data = await fetchFunction();
    await this.set(tenantId, operation, params, data, ttlSeconds);
    return data;
  }

  /**
   * Closes the Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Checks if Redis is connected
   */
  isConnected(): boolean {
    return this.redis.status === 'ready';
  }
}

// ============================================================================
// REDIS TENANT CACHE FACTORY
// ============================================================================

let redisTenantCache: RedisTenantInventoryCache | null = null;

/**
 * Creates or returns existing Redis tenant cache instance
 */
export const createRedisTenantCache = (config?: RedisTenantCacheConfig): RedisTenantInventoryCache => {
  if (!redisTenantCache) {
    const defaultConfig: RedisTenantCacheConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: 'tenant_inventory',
      defaultTTL: 300 // 5 minutes
    };

    redisTenantCache = new RedisTenantInventoryCache(config || defaultConfig);
  }

  return redisTenantCache;
};

/**
 * Gets the current Redis tenant cache instance
 */
export const getRedisTenantCache = (): RedisTenantInventoryCache | null => {
  return redisTenantCache;
};

// ============================================================================
// REDIS-SPECIFIC CACHE FUNCTIONS
// ============================================================================

/**
 * Redis cache for tenant inventory operations
 */
export const redisCacheTenantInventory = {
  /**
   * Cache tenant inventory summary
   */
  async cacheResumo(tenantId: string, data: any, ttlMinutes: number = 2) {
    const cache = getRedisTenantCache();
    if (cache) {
      await cache.set(tenantId, 'resumo', {}, data, ttlMinutes * 60);
    }
  },

  async getResumo(tenantId: string) {
    const cache = getRedisTenantCache();
    return cache ? await cache.get(tenantId, 'resumo', {}) : null;
  },

  /**
   * Cache tenant school inventory
   */
  async cacheEscolaInventory(tenantId: string, escolaId: number, data: any, ttlMinutes: number = 3) {
    const cache = getRedisTenantCache();
    if (cache) {
      await cache.set(tenantId, 'escola', { escolaId }, data, ttlMinutes * 60);
    }
  },

  async getEscolaInventory(tenantId: string, escolaId: number) {
    const cache = getRedisTenantCache();
    return cache ? await cache.get(tenantId, 'escola', { escolaId }) : null;
  },

  /**
   * Cache tenant product inventory
   */
  async cacheProdutoInventory(tenantId: string, produtoId: number, data: any, ttlMinutes: number = 3) {
    const cache = getRedisTenantCache();
    if (cache) {
      await cache.set(tenantId, 'produto', { produtoId }, data, ttlMinutes * 60);
    }
  },

  async getProdutoInventory(tenantId: string, produtoId: number) {
    const cache = getRedisTenantCache();
    return cache ? await cache.get(tenantId, 'produto', { produtoId }) : null;
  },

  /**
   * Cache tenant inventory batches
   */
  async cacheLotes(tenantId: string, produtoId: number, escolaId: number | undefined, data: any, ttlMinutes: number = 4) {
    const cache = getRedisTenantCache();
    if (cache) {
      const params = { produtoId, escolaId: escolaId || 'all' };
      await cache.set(tenantId, 'lotes', params, data, ttlMinutes * 60);
    }
  },

  async getLotes(tenantId: string, produtoId: number, escolaId?: number) {
    const cache = getRedisTenantCache();
    if (cache) {
      const params = { produtoId, escolaId: escolaId || 'all' };
      return await cache.get(tenantId, 'lotes', params);
    }
    return null;
  },

  /**
   * Cache tenant inventory movements
   */
  async cacheMovimentacoes(tenantId: string, escolaId: number, produtoId: number | undefined, data: any, ttlMinutes: number = 2) {
    const cache = getRedisTenantCache();
    if (cache) {
      const params = { escolaId, produtoId: produtoId || 'all' };
      await cache.set(tenantId, 'movimentacoes', params, data, ttlMinutes * 60);
    }
  },

  async getMovimentacoes(tenantId: string, escolaId: number, produtoId?: number) {
    const cache = getRedisTenantCache();
    if (cache) {
      const params = { escolaId, produtoId: produtoId || 'all' };
      return await cache.get(tenantId, 'movimentacoes', params);
    }
    return null;
  },

  /**
   * Cache tenant product lists
   */
  async cacheProdutos(tenantId: string, filters: any, data: any, ttlMinutes: number = 15) {
    const cache = getRedisTenantCache();
    if (cache) {
      await cache.set(tenantId, 'produtos', filters || { all: true }, data, ttlMinutes * 60);
    }
  },

  async getProdutos(tenantId: string, filters?: any) {
    const cache = getRedisTenantCache();
    if (cache) {
      return await cache.get(tenantId, 'produtos', filters || { all: true });
    }
    return null;
  },

  /**
   * Cache tenant inventory matrix
   */
  async cacheMatriz(tenantId: string, produtoIds: number[] | undefined, data: any, ttlMinutes: number = 5) {
    const cache = getRedisTenantCache();
    if (cache) {
      const params = { produtoIds: produtoIds ? produtoIds.sort() : 'all' };
      await cache.set(tenantId, 'matriz', params, data, ttlMinutes * 60);
    }
  },

  async getMatriz(tenantId: string, produtoIds?: number[]) {
    const cache = getRedisTenantCache();
    if (cache) {
      const params = { produtoIds: produtoIds ? produtoIds.sort() : 'all' };
      return await cache.get(tenantId, 'matriz', params);
    }
    return null;
  },

  /**
   * Invalidate all tenant inventory cache
   */
  async invalidateAll(tenantId: string) {
    const cache = getRedisTenantCache();
    if (cache) {
      return await cache.invalidateTenant(tenantId);
    }
    return 0;
  },

  /**
   * Invalidate specific operation cache
   */
  async invalidateOperation(tenantId: string, operation: string) {
    const cache = getRedisTenantCache();
    if (cache) {
      return await cache.invalidatePattern(tenantId, `${operation}:*`);
    }
    return 0;
  },

  /**
   * Selective cache invalidation for inventory changes
   */
  async invalidateInventoryChange(tenantId: string, options?: {
    escolaId?: number;
    produtoId?: number;
    operation?: 'movement' | 'batch' | 'adjustment' | 'all';
  }) {
    const cache = getRedisTenantCache();
    if (!cache) return 0;

    const { escolaId, produtoId, operation = 'all' } = options || {};
    let totalInvalidated = 0;

    try {
      // Always invalidate summary and statistics
      totalInvalidated += await cache.invalidatePattern(tenantId, 'resumo:*');
      totalInvalidated += await cache.invalidatePattern(tenantId, 'estatisticas:*');

      if (operation === 'all' || operation === 'movement') {
        // Invalidate all inventory-related caches
        totalInvalidated += await cache.invalidatePattern(tenantId, 'produto:*');
        totalInvalidated += await cache.invalidatePattern(tenantId, 'matriz:*');
        totalInvalidated += await cache.invalidatePattern(tenantId, 'escola:*');
        totalInvalidated += await cache.invalidatePattern(tenantId, 'movimentacoes:*');
      } else {
        // Selective invalidation
        if (escolaId) {
          totalInvalidated += await cache.invalidatePattern(tenantId, `escola:*${escolaId}*`);
          if (produtoId) {
            totalInvalidated += await cache.invalidatePattern(tenantId, `movimentacoes:*${escolaId}*${produtoId}*`);
          }
        }
        
        if (produtoId) {
          totalInvalidated += await cache.invalidatePattern(tenantId, `produto:*${produtoId}*`);
        }
      }

      if (operation === 'batch') {
        totalInvalidated += await cache.invalidatePattern(tenantId, 'lotes:*');
      }

      console.log(`🗑️ Redis: Invalidated ${totalInvalidated} cache entries for tenant ${tenantId} (${operation})`);
      return totalInvalidated;
    } catch (error) {
      console.error('❌ Redis cache invalidation error:', error);
      return 0;
    }
  }
};

export default RedisTenantInventoryCache;
export { RedisTenantInventoryCache };