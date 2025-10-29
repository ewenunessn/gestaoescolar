/**
 * Sistema de cache inteligente para otimização de performance
 * Implementa cache em memória com TTL e invalidação automática
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em milissegundos
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

class IntelligentCache {
  private cache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };

  /**
   * Armazena um item no cache com TTL
   */
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000; // Converter para milissegundos
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    // Limpar cache expirado periodicamente
    this.cleanExpired();
  }

  /**
   * Recupera um item do cache se ainda válido
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Verificar se expirou
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
   * Remove um item específico do cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Invalida cache por padrão (ex: "estoque:*")
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    this.stats.deletes += deleted;
    this.stats.size = this.cache.size;
    return deleted;
  }

  /**
   * Limpa itens expirados
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
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
    this.stats.size = 0;
  }

  /**
   * Retorna estatísticas do cache
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
   * Função helper para cache com callback
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttlMinutes: number = 5
  ): Promise<T> {
    // Tentar buscar do cache primeiro
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Se não encontrou, executar função e cachear resultado
    const data = await fetchFunction();
    this.set(key, data, ttlMinutes);
    return data;
  }
}

// Instância singleton do cache
const cache = new IntelligentCache();

// ============================================================================
// FUNÇÕES ESPECÍFICAS PARA ESTOQUE
// ============================================================================

/**
 * Cache para resumo do estoque escolar
 */
export const cacheEstoqueResumo = {
  key: 'estoque:resumo',
  ttl: 2, // 2 minutos
  
  async get() {
    return cache.get(this.key);
  },
  
  async set(data: any) {
    cache.set(this.key, data, this.ttl);
  },
  
  invalidate() {
    cache.delete(this.key);
  }
};

/**
 * Cache para detalhes de produto específico
 */
export const cacheEstoqueProduto = {
  getKey: (produtoId: number) => `estoque:produto:${produtoId}`,
  ttl: 3, // 3 minutos
  
  async get(produtoId: number) {
    return cache.get(this.getKey(produtoId));
  },
  
  async set(produtoId: number, data: any) {
    cache.set(this.getKey(produtoId), data, this.ttl);
  },
  
  invalidate(produtoId: number) {
    cache.delete(this.getKey(produtoId));
  },
  
  invalidateAll() {
    cache.invalidatePattern('estoque:produto:*');
  }
};

/**
 * Cache para matriz de estoque
 */
export const cacheMatrizEstoque = {
  getKey: (produtoIds?: number[]) => {
    const suffix = produtoIds ? produtoIds.sort().join(',') : 'all';
    return `estoque:matriz:${suffix}`;
  },
  ttl: 5, // 5 minutos
  
  async get(produtoIds?: number[]) {
    return cache.get(this.getKey(produtoIds));
  },
  
  async set(produtoIds: number[] | undefined, data: any) {
    cache.set(this.getKey(produtoIds), data, this.ttl);
  },
  
  invalidateAll() {
    cache.invalidatePattern('estoque:matriz:*');
  }
};

/**
 * Cache para estatísticas
 */
export const cacheEstatisticas = {
  key: 'estatisticas:estoque',
  ttl: 10, // 10 minutos
  
  async get() {
    return cache.get(this.key);
  },
  
  async set(data: any) {
    cache.set(this.key, data, this.ttl);
  },
  
  invalidate() {
    cache.delete(this.key);
  }
};

// ============================================================================
// MIDDLEWARE DE INVALIDAÇÃO AUTOMÁTICA
// ============================================================================

/**
 * Invalida cache quando há movimentações de estoque
 */
export const invalidateCacheOnEstoqueChange = () => {
  // Invalidar todos os caches relacionados ao estoque
  cacheEstoqueResumo.invalidate();
  cacheEstoqueProduto.invalidateAll();
  cacheMatrizEstoque.invalidateAll();
  cacheEstatisticas.invalidate();
  
  console.log('🗑️ Cache de estoque invalidado devido a mudanças');
};

/**
 * Middleware para invalidar cache automaticamente em rotas de modificação
 */
export const autoInvalidateCache = (req: any, res: any, next: any) => {
  // Interceptar resposta para invalidar cache em caso de sucesso
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Se foi uma operação de modificação bem-sucedida
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const method = req.method.toUpperCase();
      
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        // Invalidar cache baseado na rota
        if (req.path.includes('/estoque')) {
          invalidateCacheOnEstoqueChange();
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

export default cache;
export {
  IntelligentCache,
  cacheEstoqueResumo,
  cacheEstoqueProduto,
  cacheMatrizEstoque,
  cacheEstatisticas,
  invalidateCacheOnEstoqueChange,
  autoInvalidateCache
};

/**
 * Função helper para usar cache em controllers
 */
export const withCache = async <T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttlMinutes: number = 5
): Promise<T> => {
  return cache.getOrSet(cacheKey, fetchFunction, ttlMinutes);
};