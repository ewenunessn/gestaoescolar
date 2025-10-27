import { useState, useEffect } from 'react';
import { apiWithRetry } from '../services/api';
import { getToken } from '../services/auth';

export interface CurrentUser {
  id: number;
  nome: string;
  email: string;
  tipo: string; // Campo que vem do backend
  perfil?: string; // Campo mapeado para compatibilidade
  telefone?: string;
  cargo?: string;
  departamento?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
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
      
      // Mapear o campo 'tipo' para 'perfil' para compatibilidade
      if (userData) {
        userData.perfil = userData.tipo;
      }
      
      setUser(userData);
    } catch (err: any) {
      console.error('Erro ao buscar dados do usuário:', err);
      setError('Erro ao carregar dados do usuário');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
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