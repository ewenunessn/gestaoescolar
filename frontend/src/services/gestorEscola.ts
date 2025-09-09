import axios from 'axios';

const API_BASE_URL = '/api';

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

// Listar todas as escolas para seleção
export const listarEscolas = async (): Promise<Escola[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gestor-escola/escolas`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao listar escolas:', error);
    throw error;
  }
};

// Autenticar gestor com código de acesso
export const autenticarGestor = async (escola_id: number, codigo_acesso: string): Promise<AuthResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/gestor-escola/autenticar`, {
      escola_id,
      codigo_acesso
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data;
    }
    throw { success: false, message: 'Erro de conexão' };
  }
};

// Verificar se o acesso ainda é válido
export const verificarAcesso = async (escola_id: number, codigo_acesso: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gestor-escola/verificar/${escola_id}`, {
      params: { codigo_acesso }
    });
    return response.data.success;
  } catch (error) {
    return false;
  }
};

// Funções para gerenciar sessão local
export const salvarSessaoGestor = (escola: Escola, token: string, codigo_acesso: string) => {
  localStorage.setItem('gestor_escola', JSON.stringify({
    escola,
    token,
    codigo_acesso,
    timestamp: Date.now()
  }));
};

export const obterSessaoGestor = () => {
  try {
    const sessao = localStorage.getItem('gestor_escola');
    if (!sessao) return null;
    
    const dados = JSON.parse(sessao);
    
    // Verificar se a sessão não expirou (24 horas)
    const agora = Date.now();
    const tempoExpiracao = 24 * 60 * 60 * 1000; // 24 horas
    
    if (agora - dados.timestamp > tempoExpiracao) {
      limparSessaoGestor();
      return null;
    }
    
    return dados;
  } catch (error) {
    return null;
  }
};

export const limparSessaoGestor = () => {
  localStorage.removeItem('gestor_escola');
};