/**
 * Tenant-aware inventory caching system
 * Extends the existing cache infrastructure with tenant isolation
 */

// Removed unused import

interface TenantCacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tenantId: string;
}

interface TenantCacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  tenantCount: number;
}

class TenantInventoryCache {
  private cache = new Map<string, TenantCacheItem<any>>();
  private stats: TenantCacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    tenantCount: 0
  };

  /**
   * Generates a tenant-scoped cache key
   */
  private getCacheKey(tenantId: string, operation: string, params: any): string {
    const paramString = typeof params === 'object' ? JSON.stringify(params) : String(params);
    return `tenant:${tenantId}:inventory:${operation}:${paramString}`;
  }

  /**
   * Stores an item in the tenant-scoped cache
   */
  set<T>(tenantId: string, operation: string, params: any, data: T, ttlMinutes: number = 5): void {
    const key = this.getCacheKey(tenantId, operation, params);
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tenantId
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.updateTenantCount();
    
    // Clean expired items periodically
    this.cleanExpired();
  }

  /**
   * Retrieves an item from the tenant-scoped cache
   */
  get<T>(tenantId: string, operation: string, params: any): T | null {
    const key = this.getCacheKey(tenantId, operation, params);
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Verify tenant isolation
    if (item.tenantId !== tenantId) {
      console.warn(`🚨 Tenant cache isolation violation: ${tenantId} tried to access ${item.tenantId} data`);
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.misses++;
      this.stats.size = this.cache.size;
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }

  /**
   * Removes a specific item from the cache
   */
  delete(tenantId: string, operation: string, params: any): boolean {
    const key = this.getCacheKey(tenantId, operation, params);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Invalidates all cache entries for a specific tenant
   */
  invalidateTenant(tenantId: string): number {
    const pattern = `tenant:${tenantId}:`;
    let deleted = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (key.startsWith(pattern) && item.tenantId === tenantId) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    this.stats.size = this.cache.size;
    this.updateTenantCount();
    return deleted;
  }

  /**
   * Invalidates cache by pattern within a tenant scope
   */
  invalidatePattern(tenantId: string, pattern: string): number {
    const tenantPattern = `tenant:${tenantId}:inventory:${pattern}`;
    const regex = new RegExp(tenantPattern.replace('*', '.*'));
    let deleted = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (regex.test(key) && item.tenantId === tenantId) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Cleans expired items
   */
  private cleanExpired(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.deletes += cleaned;
      this.stats.size = this.cache.size;
      this.updateTenantCount();
    }
  }

  /**
   * Updates the count of unique tenants in cache
   */
  private updateTenantCount(): void {
    const tenants = new Set<string>();
    for (const item of this.cache.values()) {
      tenants.add(item.tenantId);
    }
    this.stats.tenantCount = tenants.size;
  }

  /**
   * Clears all cache for all tenants
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.stats.size = 0;
    this.stats.tenantCount = 0;
  }

  /**
   * Returns cache statistics
   */
  getStats(): TenantCacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Helper function for cache with callback
   */
  async getOrSet<T>(
    tenantId: string,
    operation: string,
    params: any,
    fetchFunction: () => Promise<T>,
    ttlMinutes: number = 5
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.get<T>(tenantId, operation, params);
    if (cached !== null) {
      return cached;
    }
    
    // If not found, execute function and cache result
    const data = await fetchFunction();
    this.set(tenantId, operation, params, data, ttlMinutes);
    return data;
  }
}

// Singleton instance of tenant inventory cache
const tenantInventoryCache = new TenantInventoryCache();

// ============================================================================
// TENANT-SPECIFIC INVENTORY CACHE FUNCTIONS
// ============================================================================

/**
 * Cache for tenant school inventory summary
 */
export const cacheTenantEstoqueResumo = {
  operation: 'resumo',
  ttl: 2, // 2 minutes
  
  async get(tenantId: string) {
    return tenantInventoryCache.get(tenantId, this.operation, {});
  },
  
  async set(tenantId: string, data: any) {
    tenantInventoryCache.set(tenantId, this.operation, {}, data, this.ttl);
  },
  
  invalidate(tenantId: string) {
    tenantInventoryCache.delete(tenantId, this.operation, {});
  }
};

/**
 * Cache for tenant-specific product inventory
 */
export const cacheTenantEstoqueProduto = {
  operation: 'produto',
  ttl: 3, // 3 minutes
  
  async get(tenantId: string, produtoId: number) {
    return tenantInventoryCache.get(tenantId, this.operation, { produtoId });
  },
  
  async set(tenantId: string, produtoId: number, data: any) {
    tenantInventoryCache.set(tenantId, this.operation, { produtoId }, data, this.ttl);
  },
  
  invalidate(tenantId: string, produtoId: number) {
    tenantInventoryCache.delete(tenantId, this.operation, { produtoId });
  },
  
  invalidateAll(tenantId: string) {
    tenantInventoryCache.invalidatePattern(tenantId, 'produto:*');
  }
};

/**
 * Cache for tenant inventory matrix
 */
export const cacheTenantMatrizEstoque = {
  operation: 'matriz',
  ttl: 5, // 5 minutes
  
  async get(tenantId: string, produtoIds?: number[]) {
    const params = { produtoIds: produtoIds ? produtoIds.sort() : 'all' };
    return tenantInventoryCache.get(tenantId, this.operation, params);
  },
  
  async set(tenantId: string, produtoIds: number[] | undefined, data: any) {
    const params = { produtoIds: produtoIds ? produtoIds.sort() : 'all' };
    tenantInventoryCache.set(tenantId, this.operation, params, data, this.ttl);
  },
  
  invalidateAll(tenantId: string) {
    tenantInventoryCache.invalidatePattern(tenantId, 'matriz:*');
  }
};

/**
 * Cache for tenant school inventory by school
 */
export const cacheTenantEstoqueEscola = {
  operation: 'escola',
  ttl: 3, // 3 minutes
  
  async get(tenantId: string, escolaId: number) {
    return tenantInventoryCache.get(tenantId, this.operation, { escolaId });
  },
  
  async set(tenantId: string, escolaId: number, data: any) {
    tenantInventoryCache.set(tenantId, this.operation, { escolaId }, data, this.ttl);
  },
  
  invalidate(tenantId: string, escolaId: number) {
    tenantInventoryCache.delete(tenantId, this.operation, { escolaId });
  },
  
  invalidateAll(tenantId: string) {
    tenantInventoryCache.invalidatePattern(tenantId, 'escola:*');
  }
};

/**
 * Cache for tenant inventory batches (lotes)
 */
export const cacheTenantEstoqueLotes = {
  operation: 'lotes',
  ttl: 4, // 4 minutes
  
  async get(tenantId: string, produtoId: number, escolaId?: number) {
    const params = { produtoId, escolaId: escolaId || 'all' };
    return tenantInventoryCache.get(tenantId, this.operation, params);
  },
  
  async set(tenantId: string, produtoId: number, escolaId: number | undefined, data: any) {
    const params = { produtoId, escolaId: escolaId || 'all' };
    tenantInventoryCache.set(tenantId, this.operation, params, data, this.ttl);
  },
  
  invalidate(tenantId: string, produtoId: number, escolaId?: number) {
    const params = { produtoId, escolaId: escolaId || 'all' };
    tenantInventoryCache.delete(tenantId, this.operation, params);
  },
  
  invalidateAll(tenantId: string) {
    tenantInventoryCache.invalidatePattern(tenantId, 'lotes:*');
  }
};

/**
 * Cache for tenant inventory statistics
 */
export const cacheTenantEstatisticas = {
  operation: 'estatisticas',
  ttl: 10, // 10 minutes
  
  async get(tenantId: string) {
    return tenantInventoryCache.get(tenantId, this.operation, {});
  },
  
  async set(tenantId: string, data: any) {
    tenantInventoryCache.set(tenantId, this.operation, {}, data, this.ttl);
  },
  
  invalidate(tenantId: string) {
    tenantInventoryCache.delete(tenantId, this.operation, {});
  }
};

/**
 * Cache for tenant inventory movements history
 */
export const cacheTenantMovimentacoes = {
  operation: 'movimentacoes',
  ttl: 2, // 2 minutes (movements change frequently)
  
  async get(tenantId: string, escolaId: number, produtoId?: number) {
    const params = { escolaId, produtoId: produtoId || 'all' };
    return tenantInventoryCache.get(tenantId, this.operation, params);
  },
  
  async set(tenantId: string, escolaId: number, produtoId: number | undefined, data: any) {
    const params = { escolaId, produtoId: produtoId || 'all' };
    tenantInventoryCache.set(tenantId, this.operation, params, data, this.ttl);
  },
  
  invalidate(tenantId: string, escolaId: number, produtoId?: number) {
    const params = { escolaId, produtoId: produtoId || 'all' };
    tenantInventoryCache.delete(tenantId, this.operation, params);
  },
  
  invalidateAll(tenantId: string) {
    tenantInventoryCache.invalidatePattern(tenantId, 'movimentacoes:*');
  }
};

/**
 * Cache for tenant product lists
 */
export const cacheTenantProdutos = {
  operation: 'produtos',
  ttl: 15, // 15 minutes (products don't change often)
  
  async get(tenantId: string, filters?: any) {
    const params = filters || { all: true };
    return tenantInventoryCache.get(tenantId, this.operation, params);
  },
  
  async set(tenantId: string, filters: any, data: any) {
    const params = filters || { all: true };
    tenantInventoryCache.set(tenantId, this.operation, params, data, this.ttl);
  },
  
  invalidateAll(tenantId: string) {
    tenantInventoryCache.invalidatePattern(tenantId, 'produtos:*');
  }
};

// ============================================================================
// TENANT CACHE INVALIDATION MIDDLEWARE
// ============================================================================

/**
 * Invalidates tenant inventory cache when there are inventory changes
 */
export const invalidateTenantCacheOnEstoqueChange = (tenantId: string, options?: {
  escolaId?: number;
  produtoId?: number;
  operation?: 'movement' | 'batch' | 'adjustment' | 'all';
}) => {
  const { escolaId, produtoId, operation = 'all' } = options || {};
  
  // Always invalidate summary and statistics as they aggregate data
  cacheTenantEstoqueResumo.invalidate(tenantId);
  cacheTenantEstatisticas.invalidate(tenantId);
  
  // Selective invalidation based on the type of change
  if (operation === 'all' || operation === 'movement') {
    // Movements affect all related caches
    cacheTenantEstoqueProduto.invalidateAll(tenantId);
    cacheTenantMatrizEstoque.invalidateAll(tenantId);
    cacheTenantEstoqueEscola.invalidateAll(tenantId);
    cacheTenantMovimentacoes.invalidateAll(tenantId);
  } else {
    // Selective invalidation for specific entities
    if (escolaId) {
      cacheTenantEstoqueEscola.invalidate(tenantId, escolaId);
      if (produtoId) {
        cacheTenantMovimentacoes.invalidate(tenantId, escolaId, produtoId);
      }
    }
    
    if (produtoId) {
      cacheTenantEstoqueProduto.invalidate(tenantId, produtoId);
    }
  }
  
  if (operation === 'batch') {
    // Batch operations affect lotes cache
    cacheTenantEstoqueLotes.invalidateAll(tenantId);
  }
  
  console.log(`🗑️ Tenant ${tenantId} inventory cache invalidated (${operation}) - escola: ${escolaId || 'all'}, produto: ${produtoId || 'all'}`);
};

/**
 * Middleware for automatic tenant cache invalidation on modification routes
 */
export const autoInvalidateTenantCache = (req: any, res: any, next: any) => {
  // Intercept response to invalidate cache on success
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // If it was a successful modification operation
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method.toUpperCase();
      
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        // Invalidate cache based on route and tenant
        if (req.path.includes('/estoque')) {
          const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
          if (tenantId) {
            invalidateTenantCacheOnEstoqueChange(tenantId);
          }
        }
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

export default tenantInventoryCache;
export { TenantInventoryCache };

/**
 * Helper function to use tenant cache in controllers
 */
export const withTenantCache = async <T>(
  tenantId: string,
  operation: string,
  params: any,
  fetchFunction: () => Promise<T>,
  ttlMinutes: number = 5
): Promise<T> => {
  return tenantInventoryCache.getOrSet(tenantId, operation, params, fetchFunction, ttlMinutes);
};

/**
 * Helper function to get tenant ID from request
 */
export const getTenantIdFromRequest = (req: any): string | null => {
  return req.tenant?.id || req.headers['x-tenant-id'] || null;
};