import Redis from 'ioredis';

/**
 * Configuração do Redis com fallback para memória
 * Se Redis não estiver disponível, usa cache em memória
 */

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Tentar conectar ao Redis
export const initRedis = async (): Promise<void> => {
  // Se não tiver configuração de Redis, usar memória
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    console.log('📦 Redis não configurado, usando cache em memória');
    return;
  }

  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('⚠️  Redis não disponível, usando cache em memória');
          return null; // Para de tentar
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      showFriendlyErrorStack: false // Desabilitar stack trace detalhado
    });

    // Silenciar erros de conexão (já tratamos com fallback)
    redisClient.on('error', () => {
      // Silencioso - já temos fallback
    });

    // Tentar conectar
    await redisClient.connect();
    
    redisClient.on('connect', () => {
      console.log('✅ Redis conectado');
      isRedisAvailable = true;
    });

    redisClient.on('close', () => {
      isRedisAvailable = false;
    });

    isRedisAvailable = true;
    console.log('✅ Redis inicializado com sucesso');
  } catch (error) {
    console.log('⚠️  Redis não disponível, usando cache em memória');
    redisClient = null;
    isRedisAvailable = false;
  }
};

/**
 * Verifica se Redis está disponível
 */
export const isRedisConnected = (): boolean => {
  return isRedisAvailable && redisClient !== null && redisClient.status === 'ready';
};

/**
 * Obtém o cliente Redis (ou null se não disponível)
 */
export const getRedisClient = (): Redis | null => {
  return isRedisConnected() ? redisClient : null;
};

/**
 * Operações Redis com fallback para memória
 */

// Cache em memória como fallback
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

// Limpar cache expirado a cada minuto
setInterval(() => {
  const now = Date.now();
  memoryCache.forEach((entry, key) => {
    if (entry.expiresAt < now) {
      memoryCache.delete(key);
    }
  });
}, 60000);

/**
 * GET - Buscar valor
 */
export const redisGet = async (key: string): Promise<string | null> => {
  const client = getRedisClient();
  
  if (client) {
    try {
      return await client.get(key);
    } catch (error) {
      console.error('Erro ao buscar do Redis:', error);
    }
  }
  
  // Fallback para memória
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  return null;
};

/**
 * SET - Definir valor
 */
export const redisSet = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  const client = getRedisClient();
  
  if (client) {
    try {
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      return;
    } catch (error) {
      console.error('Erro ao salvar no Redis:', error);
    }
  }
  
  // Fallback para memória
  const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Date.now() + (3600 * 1000);
  memoryCache.set(key, { value, expiresAt });
};

/**
 * DEL - Deletar chave
 */
export const redisDel = async (key: string): Promise<void> => {
  const client = getRedisClient();
  
  if (client) {
    try {
      await client.del(key);
      return;
    } catch (error) {
      console.error('Erro ao deletar do Redis:', error);
    }
  }
  
  // Fallback para memória
  memoryCache.delete(key);
};

/**
 * INCR - Incrementar contador
 */
export const redisIncr = async (key: string): Promise<number> => {
  const client = getRedisClient();
  
  if (client) {
    try {
      return await client.incr(key);
    } catch (error) {
      console.error('Erro ao incrementar no Redis:', error);
    }
  }
  
  // Fallback para memória
  const cached = memoryCache.get(key);
  const currentValue = cached ? parseInt(cached.value) : 0;
  const newValue = currentValue + 1;
  memoryCache.set(key, {
    value: newValue.toString(),
    expiresAt: cached?.expiresAt || Date.now() + (3600 * 1000)
  });
  return newValue;
};

/**
 * EXPIRE - Definir expiração
 */
export const redisExpire = async (key: string, seconds: number): Promise<void> => {
  const client = getRedisClient();
  
  if (client) {
    try {
      await client.expire(key, seconds);
      return;
    } catch (error) {
      console.error('Erro ao definir expiração no Redis:', error);
    }
  }
  
  // Fallback para memória
  const cached = memoryCache.get(key);
  if (cached) {
    cached.expiresAt = Date.now() + (seconds * 1000);
  }
};

/**
 * KEYS - Buscar chaves por padrão
 */
export const redisKeys = async (pattern: string): Promise<string[]> => {
  const client = getRedisClient();
  
  if (client) {
    try {
      return await client.keys(pattern);
    } catch (error) {
      console.error('Erro ao buscar chaves no Redis:', error);
    }
  }
  
  // Fallback para memória
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  return Array.from(memoryCache.keys()).filter(key => regex.test(key));
};

/**
 * Estatísticas
 */
export const getRedisStats = () => {
  return {
    type: isRedisConnected() ? 'redis' : 'memory',
    connected: isRedisConnected(),
    memoryKeys: memoryCache.size,
    memorySizeMB: (JSON.stringify(Array.from(memoryCache.entries())).length / 1024 / 1024).toFixed(2)
  };
};

/**
 * Fechar conexão Redis
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
};
