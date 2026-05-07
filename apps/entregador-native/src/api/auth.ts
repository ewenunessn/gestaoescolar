import { api } from './client';

export interface LoginResponse {
  token: string;
  nome: string;
  email?: string;
  tipo: string;
  isSystemAdmin?: boolean;
}

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, senha });
  return data.data || data;
}

export async function logout() {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  try {
    await api.post('/auth/logout');
  } catch {
    // Local logout must still work when the device is offline or the token is already invalid.
  }
  await AsyncStorage.removeItem('token');
}
