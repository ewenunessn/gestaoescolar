import { useEffect, useState } from 'react';
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

let cachedUser: CurrentUser | null = null;
let currentUserRequest: Promise<CurrentUser | null> | null = null;
let lastUserFetchAt = 0;
const USER_CACHE_TTL_MS = 60_000;

function readInitialUser(): CurrentUser | null {
  try {
    const token = getToken();
    if (!token) return null;

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }

    const tokenPayload = JSON.parse(atob(token.split('.')[1]));
    if (tokenPayload) {
      return {
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
    }
  } catch (err) {
    console.error('Erro ao carregar usuario inicial:', err);
  }

  return null;
}

async function fetchCurrentUserOnce(force = false): Promise<CurrentUser | null> {
  const token = getToken();
  if (!token) {
    cachedUser = null;
    return null;
  }

  const now = Date.now();
  if (!force && cachedUser && now - lastUserFetchAt < USER_CACHE_TTL_MS) {
    return cachedUser;
  }

  if (currentUserRequest) {
    return currentUserRequest;
  }

  currentUserRequest = apiWithRetry
    .get('/usuarios/me')
    .then((response) => {
      const userData = response.data?.data || response.data;
      if (!userData) {
        cachedUser = null;
        return null;
      }

      userData.perfil = userData.tipo;
      userData.isSystemAdmin = userData.tipo === 'admin';
      localStorage.setItem('user', JSON.stringify(userData));
      cachedUser = userData;
      lastUserFetchAt = Date.now();
      return userData;
    })
    .finally(() => {
      currentUserRequest = null;
    });

  return currentUserRequest;
}

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    cachedUser = cachedUser ?? readInitialUser();
    return cachedUser;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const userData = await fetchCurrentUserOnce(force);
      setUser(userData);
    } catch {
      setError('Erro ao carregar dados do usuario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    const isLoginPage = window.location.pathname.includes('/login');

    if (token && !isLoginPage) {
      void fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = () => {
    void fetchUser(true);
  };

  return {
    user,
    loading,
    error,
    refreshUser,
  };
};
