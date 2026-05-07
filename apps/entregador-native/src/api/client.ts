import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ApiUrlEnv {
  [key: string]: string | undefined;
  EXPO_PUBLIC_API_URL?: string;
}

export function getApiUrl(env: ApiUrlEnv = process.env): string {
  return env.EXPO_PUBLIC_API_URL || 'https://gestaoescolar-backend.vercel.app/bff/app';
}

// Configure com seu IP local ou URL de produção
// Para desenvolvimento, use seu IP local
// export const API_URL = __DEV__ 
//   ? 'http://192.168.1.111:3000/api' // IP local atualizado
//   : 'https://gestaoescolar-backend.vercel.app/bff/app';

// Forçando produção (Vercel)
export const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 segundos
});

// Interceptor para adicionar token
api.interceptors.request.use(async (config) => {
  try {
    const tokenData = await AsyncStorage.getItem('token');
    if (tokenData) {
      const { token } = JSON.parse(tokenData);
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Erro ao obter token:', error);
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido, redirecionar para login
      AsyncStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export function handleAxiosError(error: any): string {
  if (error.response) {
    return error.response.data?.error || error.response.data?.message || 'Erro no servidor';
  }

  if (error.request) {
    return 'Sem conexão com o servidor';
  }

  return error.message || 'Erro desconhecido';
}
