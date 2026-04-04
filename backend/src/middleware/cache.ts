import { Request, Response, NextFunction } from 'express';
import { redisGet, redisSet, redisDel, redisKeys } from '../config/redis';

/**
 * Cache HTTP com suporte a Redis e fallback para memória
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Limpar cache expirado a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (entry.expiresAt < now) {
      cache.delete(key);
    }
  });
}, 5 * 60 * 1000);

export interface CacheOptions {
  ttl?: number;  // Time to live em segundos (padrão: 5 minutos)
  keyGenerator?: (req: Request) => string;  // Função para gerar chave de cache
  condition?: (req: Request, res: Response) => boolean;  // Condição para cachear
}

/**
 * Gera chave de cache baseada na URL e query params
 */
const defaultKeyGenerator = (req: Request): string => {
  const url = req.originalUrl || req.url;
  const method = req.method;
  return `${method}:${url}`;
};

/**
 * Middleware de cache HTTP
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 300,  // 5 minutos
    keyGenerator = defaultKeyGenerator,
    condition = (req) => req.method === 'GET'
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Verificar se deve cachear
    if (!condition(req, res)) {
      return next();
    }

    const key = `cache:${keyGenerator(req)}`;
    const now = Date.now();

    try {
      // Verificar se existe no cache
      const cached = await redisGet(key);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Math.floor((now - data.timestamp) / 1000);
        
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Age', age.toString());
        res.setHeader('Cache-Control', `public, max-age=${ttl}`);
        
        return res.json(data.content);
      }
    } catch (error) {
      console.error('Erro ao buscar cache:', error);
    }

    // Interceptar resposta para cachear
    const originalJson = res.json.bind(res);
    (res.json as any) = async function(data: any) {
      // Apenas cachear respostas bem-sucedidas
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await redisSet(key, JSON.stringify({
            content: data,
            timestamp: now
          }), ttl);
        } catch (error) {
          console.error('Erro ao salvar cache:', error);
        }
      }

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      
      return originalJson(data);
    };

    next();
  };
};

/**
 * Caches pré-configurados
 */

// Cache curto (1 minuto) - dados que mudam frequentemente
export const shortCache = cacheMiddleware({
  ttl: 60
});

// Cache médio (5 minutos) - dados que mudam ocasionalmente
export const mediumCache = cacheMiddleware({
  ttl: 300
});

// Cache longo (1 hora) - dados estáticos
export const longCache = cacheMiddleware({
  ttl: 3600
});

// Cache para listas (5 minutos)
export const listCache = cacheMiddleware({
  ttl: 300,
  condition: (req) => req.method === 'GET' && !req.query.nocache
});

/**
 * Invalidar cache por padrão
 */
export const invalidateCache = async (pattern?: string | RegExp) => {
  if (!pattern) {
    // Limpar todo o cache
    const keys = await redisKeys('cache:*');
    for (const key of keys) {
      await redisDel(key);
    }
    cache.clear();
    return keys.length + cache.size;
  }

  let count = 0;
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  // Limpar Redis
  const keys = await redisKeys('cache:*');
  for (const key of keys) {
    if (regex.test(key)) {
      await redisDel(key);
      count++;
    }
  }
  
  // Limpar memória
  cache.forEach((_, key) => {
    if (regex.test(key)) {
      cache.delete(key);
      count++;
    }
  });

  return count;
};

/**
 * Invalidar cache por chave específica
 */
export const invalidateCacheKey = async (key: string) => {
  await redisDel(`cache:${key}`);
  return cache.delete(key);
};

/**
 * Obter estatísticas do cache
 */
export const getCacheStats = async () => {
  const now = Date.now();
  let expired = 0;
  let active = 0;
  let totalSize = 0;

  cache.forEach((entry) => {
    if (entry.expiresAt < now) {
      expired++;
    } else {
      active++;
    }
    totalSize += JSON.stringify(entry.data).length;
  });

  // Adicionar estatísticas do Redis
  const allRedisKeys = await redisKeys('cache:*');

  return {
    total: cache.size + allRedisKeys.length,
    memory: cache.size,
    redis: allRedisKeys.length,
    active,
    expired,
    sizeBytes: totalSize,
    sizeMB: (totalSize / 1024 / 1024).toFixed(2)
  };
};

/**
 * Middleware para invalidar cache em operações de escrita
 */
export const invalidateCacheOnWrite = (pattern: string | RegExp) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Apenas para operações de escrita
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalJson = res.json.bind(res);
      (res.json as any) = async function(data: any) {
        // Invalidar cache após resposta bem-sucedida
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await invalidateCache(pattern);
        }
        return originalJson(data);
      };
    }
    next();
  };
};
