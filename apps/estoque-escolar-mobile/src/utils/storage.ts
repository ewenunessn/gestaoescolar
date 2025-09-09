import { Platform } from 'react-native';

// Polyfill para AsyncStorage no web
const createWebStorage = () => {
  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('Erro ao obter item do localStorage:', error);
        return null;
      }
    },
    
    async setItem(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('Erro ao salvar item no localStorage:', error);
      }
    },
    
    async removeItem(key: string): Promise<void> {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Erro ao remover item do localStorage:', error);
      }
    },
    
    async clear(): Promise<void> {
      try {
        localStorage.clear();
      } catch (error) {
        console.warn('Erro ao limpar localStorage:', error);
      }
    }
  };
};

// Função para obter o storage apropriado
const getStorage = () => {
  if (Platform.OS === 'web') {
    return createWebStorage();
  }
  
  // Para React Native (iOS/Android)
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage;
  } catch (error) {
    console.warn('AsyncStorage não disponível, usando fallback:', error);
    return createWebStorage();
  }
};

export const storage = getStorage();