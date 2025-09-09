import { apiService } from './api';
import { storage } from '../utils/storage';

export interface Escola {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    escola: Escola;
    token: string;
  };
}

export interface SessaoGestor {
  escola: Escola;
  token: string;
  codigo_acesso: string;
  timestamp: number;
}

// Listar todas as escolas para seleção
export const listarEscolas = async (): Promise<Escola[]> => {
  try {
    return await apiService.listarEscolas();
  } catch (error) {
    console.error('Erro ao listar escolas:', error);
    throw error;
  }
};

// Autenticar gestor com código de acesso
export const autenticarGestor = async (escola_id: number, codigo_acesso: string): Promise<AuthResponse> => {
  try {
    return await apiService.autenticarGestor(escola_id, codigo_acesso);
  } catch (error: any) {
    console.error('Erro na autenticação:', error);
    throw error;
  }
};

// Verificar se o acesso ainda é válido
export const verificarAcesso = async (escola_id: number, codigo_acesso: string): Promise<boolean> => {
  try {
    return await apiService.verificarAcesso(escola_id, codigo_acesso);
  } catch (error) {
    return false;
  }
};

// Funções para gerenciar sessão local (usando AsyncStorage)
export const salvarSessaoGestor = async (escola: Escola, token: string, codigo_acesso: string): Promise<void> => {
  try {
    const sessao: SessaoGestor = {
      escola,
      token,
      codigo_acesso,
      timestamp: Date.now()
    };
    await storage.setItem('gestor_escola', JSON.stringify(sessao));
  } catch (error) {
    console.error('Erro ao salvar sessão:', error);
  }
};

export const obterSessaoGestor = async (): Promise<SessaoGestor | null> => {
  try {
    const sessaoString = await storage.getItem('gestor_escola');
    if (!sessaoString) return null;
    
    const sessao: SessaoGestor = JSON.parse(sessaoString);
    
    // Verificar se a sessão não expirou (24 horas)
    const agora = Date.now();
    const tempoExpiracao = 24 * 60 * 60 * 1000; // 24 horas
    
    if (agora - sessao.timestamp > tempoExpiracao) {
      await limparSessaoGestor();
      return null;
    }
    
    return sessao;
  } catch (error) {
    console.error('Erro ao obter sessão:', error);
    return null;
  }
};

export const limparSessaoGestor = async (): Promise<void> => {
  try {
    await storage.removeItem('gestor_escola');
    await apiService.removeToken();
  } catch (error) {
    console.error('Erro ao limpar sessão:', error);
  }
};