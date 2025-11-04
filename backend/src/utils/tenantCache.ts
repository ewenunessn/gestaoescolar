/**
 * Sistema de cache multi-tenant com Redis
 * Implementa cache com prefixos de tenant para isolamento completo
 */

import Redis from 'ioredis';

interface TenantCacheOptions {
  ttl?: number; // TTL em segundos
  prefix?: string; // Prefixo adicional para a chave
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

export class TenantCache {
  private redis: Redis;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0
  };

  constructor() {
    // Configurar Redis baseado nas variáveis de ambiente
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    const redisPassword = process.env.REDIS_PASSWORD;

    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
    }

    // Event listeners para monitoramento
    this.redis.on('connect', () => {
      console.log('✅ Redis conectado para cache multi-tenant');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Erro no Redis:', error);
      this.stats.errors++;
    });

    this.redis.on('ready', () => {
      console.log('🚀 Redis pronto para operações de cache');
    });
  }

  /**
   * Gera chave de cache com prefixo de tenant
   */
  private generateKey(tenantId: string, key: string, prefix?: string): string {
    const parts = ['tenant', tenantId];
    if (prefix) parts.push(prefix);
    parts.push(key);
    return parts.join(':');
  }

  /**
   * Armazena valor no cache com TTL específico do tenant
   */
  async set<T>(
    tenantId: string, 
    key: string, 
    value: T, 
    options: TenantCacheOptions = {}
  ): Promise<boolean> {
    try {
      const { ttl = 300, prefix } = options; // TTL padrão de 5 minutos
      const cacheKey = this.generateKey(tenantId, key, prefix);
      const serializedValue = JSON.stringify(value);
      
      await this.redis.setex(cacheKey, ttl, serializedValue);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Erro ao armazenar no cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Recupera valor do cache
   */
  async get<T>(
    tenantId: string, 
    key: string, 
    options: TenantCacheOptions = {}
  ): Promise<T | null> {
    try {
      const { prefix } = options;
      const cacheKey = this.generateKey(tenantId, key, prefix);
      const value = await this.redis.get(cacheKey);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Erro ao recuperar do cache:', error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Remove chave específica do cache
   */
  async delete(
    tenantId: string, 
    key: string, 
    options: TenantCacheOptions = {}
  ): Promise<boolean> {
    try {
      const { prefix } = options;
      const cacheKey = this.generateKey(tenantId, key, prefix);
      const result = await this.redis.del(cacheKey);
      
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao deletar do cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Invalida cache por padrão (ex: "products:*")
   */
  async invalidatePattern(
    tenantId: string, 
    pattern: string, 
    options: TenantCacheOptions = {}
  ): Promise<number> {
    try {
      const { prefix } = options;
      const baseKey = this.generateKey(tenantId, '', prefix);
      const searchPattern = `${baseKey}${pattern}`;
      
      const keys = await this.redis.keys(searchPattern);
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('Erro ao invalidar padrão do cache:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Limpa todo o cache de um tenant
   */
  async clearTenant(tenantId: string): Promise<number> {
    try {
      const pattern = `tenant:${tenantId}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('Erro ao limpar cache do tenant:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Função helper para cache com callback
   */
  async getOrSet<T>(
    tenantId: string,
    key: string,
    fetchFunction: () => Promise<T>,
    options: TenantCacheOptions = {}
  ): Promise<T> {
    // Tentar buscar do cache primeiro
    const cached = await this.get<T>(tenantId, key, options);
    if (cached !== null) {
      return cached;
    }
    
    // Se não encontrou, executar função e cachear resultado
    const data = await fetchFunction();
    await this.set(tenantId, key, data, options);
    return data;
  }

  /**
   * Cache para múltiplas chaves simultaneamente
   */
  async mget<T>(
    tenantId: string, 
    keys: string[], 
    options: TenantCacheOptions = {}
  ): Promise<(T | null)[]> {
    try {
      const { prefix } = options;
      const cacheKeys = keys.map(key => this.generateKey(tenantId, key, prefix));
      const values = await this.redis.mget(...cacheKeys);
      
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return JSON.parse(value) as T;
      });
    } catch (error) {
      console.error('Erro ao recuperar múltiplas chaves do cache:', error);
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Armazena múltiplas chaves simultaneamente
   */
  async mset<T>(
    tenantId: string, 
    keyValuePairs: Array<{ key: string; value: T }>, 
    options: TenantCacheOptions = {}
  ): Promise<boolean> {
    try {
      const { ttl = 300, prefix } = options;
      const pipeline = this.redis.pipeline();
      
      keyValuePairs.forEach(({ key, value }) => {
        const cacheKey = this.generateKey(tenantId, key, prefix);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(cacheKey, ttl, serializedValue);
      });
      
      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;
      return true;
    } catch (error) {
      console.error('Erro ao armazenar múltiplas chaves no cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Incrementa contador no cache
   */
  async increment(
    tenantId: string, 
    key: string, 
    increment: number = 1,
    options: TenantCacheOptions = {}
  ): Promise<number> {
    try {
      const { prefix } = options;
      const cacheKey = this.generateKey(tenantId, key, prefix);
      const result = await this.redis.incrby(cacheKey, increment);
      return result;
    } catch (error) {
      console.error('Erro ao incrementar contador no cache:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Define TTL para uma chave existente
   */
  async expire(
    tenantId: string, 
    key: string, 
    ttl: number,
    options: TenantCacheOptions = {}
  ): Promise<boolean> {
    try {
      const { prefix } = options;
      const cacheKey = this.generateKey(tenantId, key, prefix);
      const result = await this.redis.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      console.error('Erro ao definir TTL no cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Verifica se uma chave existe
   */
  async exists(
    tenantId: string, 
    key: string,
    options: TenantCacheOptions = {}
  ): Promise<boolean> {
    try {
      const { prefix } = options;
      const cacheKey = this.generateKey(tenantId, key, prefix);
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Erro ao verificar existência no cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Reseta estatísticas
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * Fecha conexão com Redis
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Testa conectividade com Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Erro ao testar conexão Redis:', error);
      return false;
    }
  }
}

// Instância singleton
export const tenantCache = new TenantCache();

// Fechar conexão quando aplicação terminar
process.on('SIGINT', async () => {
  console.log('Fechando conexão Redis...');
  await tenantCache.disconnect();
});

process.on('SIGTERM', async () => {
  console.log('Fechando conexão Redis...');
  await tenantCache.disconnect();
});