/**
 * Sistema de fila de requisições para evitar sobrecarga do servidor
 * Implementa cache em memória e controle de requisições simultâneas
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private queue: QueueItem[] = [];
  private activeRequests = 0;
  private readonly maxConcurrent: number;
  private readonly cacheDuration: number;

  constructor(maxConcurrent = 3, cacheDuration = 5 * 60 * 1000) {
    this.maxConcurrent = maxConcurrent;
    this.cacheDuration = cacheDuration;
  }

  /**
   * Adiciona uma requisição à fila com cache
   */
  async enqueue<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Verificar cache
    const cached = this.getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Adicionar à fila
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: async () => {
          try {
            const result = await fn();
            this.setCache(key, result);
            return result;
          } catch (error) {
            throw error;
          }
        },
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  /**
   * Processa a fila de requisições
   */
  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeRequests++;

    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  /**
   * Obtém dados do cache se ainda válidos
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Armazena dados no cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpa o cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Limpa cache expirado
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheDuration) {
        this.cache.delete(key);
      }
    }
  }
}

// Instância global
export const requestQueue = new RequestQueue(3, 5 * 60 * 1000); // 3 requisições simultâneas, cache de 5 minutos

// Limpar cache expirado a cada 1 minuto
setInterval(() => {
  requestQueue.cleanExpiredCache();
}, 60 * 1000);
