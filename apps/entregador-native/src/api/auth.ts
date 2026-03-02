import { api } from './client';

export interface LoginResponse {
  token: string;
  nome: string;
  email: string;
}

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, senha });
  return data;
}

export async function logout() {
  // Limpar token do AsyncStorage
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  await AsyncStorage.removeItem('token');
}
