/**
 * Service-level cache (cache-aside pattern).
 *
 * The default backend uses Redis when configured and the shared in-memory
 * fallback from config/redis when Redis is unavailable.
 */

import { redisDel, redisGet, redisKeys, redisSet } from "../config/redis";

export interface CacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

class RedisFallbackCacheBackend implements CacheBackend {
  get(key: string): Promise<string | null> {
    return redisGet(key);
  }

  set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    return redisSet(key, value, ttlSeconds);
  }

  del(key: string): Promise<void> {
    return redisDel(key);
  }

  keys(pattern: string): Promise<string[]> {
    return redisKeys(pattern);
  }
}

export class CacheService {
  // Default TTLs in seconds. Domain-specific TTLs mirror architecture/cacheStrategy.ts.
  TTL = {
    single: 60,
    list: 30,
    stats: 5 * 60,
    static: 300,
    cardapios: 10 * 60,
    estoque: 2 * 60,
    dashboard: 5 * 60,
    nutricao: 60 * 60,
  };

  constructor(private readonly backend: CacheBackend = new RedisFallbackCacheBackend()) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.backend.get(key);
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      await this.backend.del(key);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 60): Promise<void> {
    await this.backend.set(key, JSON.stringify(data), ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.backend.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.backend.keys(pattern);
    await Promise.all(keys.map((key) => this.backend.del(key)));
  }

  async invalidateEntity(entityType: string, id?: number): Promise<void> {
    const invalidations: Promise<void>[] = [
      this.delPattern(`${entityType}:list:*`),
      this.delPattern(`${entityType}:*`),
    ];

    if (id !== undefined) {
      invalidations.push(this.del(`${entityType}:${id}`));
    }

    await Promise.all(invalidations);
  }

  async clear(): Promise<void> {
    await this.delPattern("*");
  }

  async stats(): Promise<{ size: number; keys: string[] }> {
    const keys = await this.backend.keys("*");
    return { size: keys.length, keys };
  }
}

export const cacheService = new CacheService();
