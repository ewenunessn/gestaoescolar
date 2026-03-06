import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure com seu IP local ou URL de produção
// Para desenvolvimento, use seu IP local
// export const API_URL = __DEV__ 
//   ? 'http://192.168.18.12:3000/api' // ALTERE PARA SEU IP LOCAL
//   : 'https://gestaoescolar-backend.vercel.app/api';

// Forçando produção (Vercel)
export const API_URL = 'https://gestaoescolar-backend.vercel.app/api';

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
  console.log('Erro completo:', JSON.stringify(error, null, 2));
  
  if (error.response) {
    const errorMsg = error.response.data?.error || error.response.data?.message || 'Erro no servidor';
    console.log('Erro da resposta:', errorMsg);
    console.log('Status:', error.response.status);
    console.log('Data completa:', error.response.data);
    return errorMsg;
  } else if (error.request) {
    console.log('Erro de requisição:', error.request);
    return 'Sem conexão com o servidor';
  } else {
    console.log('Erro genérico:', error.message);
    return error.message || 'Erro desconhecido';
  }
}
