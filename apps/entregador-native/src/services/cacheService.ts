import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const cacheService = {
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const storageKey = `${CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        const current: CacheEntry<T> = JSON.parse(cached);
        if (JSON.stringify(current.data) === JSON.stringify(data)) {
          await AsyncStorage.setItem(storageKey, JSON.stringify({ data, timestamp: Date.now() }));
          return;
        }
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
      console.log(`Cache salvo: ${key}`);
    } catch (error) {
      console.error(`Erro ao salvar cache ${key}:`, error);
    }
  },

  async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) {
        return null;
      }

      return JSON.parse(cached);
    } catch (error) {
      console.error(`Erro ao recuperar entrada de cache ${key}:`, error);
      return null;
    }
  },

  async isFresh(key: string, maxAgeMs: number): Promise<boolean> {
    const entry = await this.getEntry(key);
    if (!entry) {
      return false;
    }

    return Date.now() - entry.timestamp <= maxAgeMs;
  },

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      // Verificar se o cache expirou
      if (age > CACHE_EXPIRY) {
        console.log(`Cache expirado: ${key}`);
        await this.remove(key);
        return null;
      }

      console.log(`Cache recuperado: ${key} (idade: ${Math.round(age / 1000)}s)`);
      return entry.data;
    } catch (error) {
      console.error(`Erro ao recuperar cache ${key}:`, error);
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
      console.log(`Cache removido: ${key}`);
    } catch (error) {
      console.error(`Erro ao remover cache ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`${cacheKeys.length} cache(s) limpo(s)`);
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  },
};
