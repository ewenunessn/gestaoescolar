import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure com seu IP local ou URL de produção
// Forçando produção para usar com túnel Expo
export const API_URL = 'https://gestaoescolar-backend.vercel.app/api';

// Para desenvolvimento local, descomente a linha abaixo e ajuste o IP:
// export const API_URL = __DEV__ 
//   ? 'http://192.168.1.100:3000/api' // ALTERE PARA SEU IP LOCAL
//   : 'https://gestaoescolar-backend.vercel.app/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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
    return error.response.data?.message || 'Erro no servidor';
  } else if (error.request) {
    return 'Sem conexão com o servidor';
  } else {
    return error.message || 'Erro desconhecido';
  }
}
