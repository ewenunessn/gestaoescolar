/**
 * Service-level Cache (Cache-Aside Pattern)
 *
 * Best practice: cache at service level, not HTTP middleware.
 * - Cache by entity ID (e.g., 'produto:145')
 * - Explicit invalidation when data changes
 * - Short TTL as safety net
 *
 * Usage:
 *   const cached = await cacheService.get('produtos:145');
 *   if (cached) return cached;
 *   const data = await db.query(...);
 *   await cacheService.set('produtos:145', data, 60); // 60s
 *   return data;
 *
 *   // On write:
 *   await cacheService.del('produtos:145');
 *   await cacheService.delPattern('produtos:list:*');
 */

interface CacheEntry<T = any> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private store = new Map<string, CacheEntry>();
  private maxSize = 2000;

  // Default TTLs (in seconds)
  TTL = {
    single: 60,      // Single entity: 1 min
    list: 30,        // Lists: 30 sec
    stats: 45,       // Stats/dashboard: 45 sec
    static: 300,     // Static data (units, categories): 5 min
  };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttlSeconds: number = CacheService.TTL.single): Promise<void> {
    if (this.store.size >= this.maxSize) {
      // Evict oldest
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Invalidate all caches related to an entity type
   */
  invalidateEntity(entityType: string, id?: number): void {
    // Invalidate specific entity
    if (id !== undefined) {
      this.del(`${entityType}:${id}`);
    }
    // Invalidate all lists of this entity type
    this.delPattern(`${entityType}:list:*`);
    // Also invalidate any pattern that starts with this type
    this.delPattern(`${entityType}:*`);
  }

  clear(): void {
    this.store.clear();
  }

  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

export const cacheService = new CacheService();

// Cleanup expired entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cacheService['store'].entries()) {
    if (now > entry.expiresAt) {
      cacheService['store'].delete(key);
    }
  }
}, 120000);
