import { useState, useEffect } from 'react';
import { apiWithRetry } from '../services/api';
import { getToken } from '../services/auth';

export interface CurrentUser {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  perfil?: string;
  escola_id?: number;
  isSystemAdmin?: boolean;
  tipo_secretaria?: string;
  institution_id?: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useCurrentUser = () => {
  // Inicializar com dados do localStorage se disponíveis
  const [user, setUser] = useState<CurrentUser | null>(() => {
    try {
      const token = getToken();
      if (!token) return null;
      
      // Tentar carregar do localStorage primeiro
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        return userData;
      }
      
      // Tentar extrair do token JWT
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      if (tokenPayload) {
        const userData = {
          id: tokenPayload.id,
          nome: tokenPayload.nome,
          email: tokenPayload.email,
          tipo: tokenPayload.tipo,
          perfil: tokenPayload.tipo,
          escola_id: tokenPayload.escola_id,
          isSystemAdmin: tokenPayload.isSystemAdmin,
          tipo_secretaria: tokenPayload.tipo_secretaria,
          institution_id: tokenPayload.institution_id,
        };
        return userData;
      }
    } catch (err) {
      console.error('❌ [INIT] Erro ao carregar usuário inicial:', err);
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false); // Mudar para false já que carregamos do localStorage
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const response = await apiWithRetry.get('/usuarios/me');
      const userData = response.data?.data || response.data;
      
      // Mapear campos para compatibilidade
      if (userData) {
        userData.perfil = userData.tipo;
        userData.isSystemAdmin = userData.tipo === 'admin';
        // Atualizar localStorage com dados frescos
        localStorage.setItem('user', JSON.stringify(userData));
      }
      
      setUser(userData);
    } catch (err: any) {
      console.error('Erro ao buscar dados do usuário:', err);
      setError('Erro ao carregar dados do usuário');
      // Não limpar o user do estado se já temos dados do localStorage
      if (!user) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só buscar do servidor se temos token
    const token = getToken();
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = () => {
    fetchUser();
  };

  return {
    user,
    loading,
    error,
    refreshUser
  };
};