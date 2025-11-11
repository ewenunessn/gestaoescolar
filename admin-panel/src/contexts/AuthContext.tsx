import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    console.log('Logout chamado');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    console.log('AuthContext: Verificando autenticação...');
    const token = localStorage.getItem('admin_token');
    const userData = localStorage.getItem('admin_user');
    
    if (token && userData) {
      console.log('Token encontrado, restaurando sessão');
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    } else {
      console.log('Nenhum token encontrado');
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Tentando fazer login...');
      const response = await api.post('/system-admin/auth/login', {
        email,
        password
      });

      const { token, admin } = response.data.data;

      console.log('Login bem-sucedido, salvando token');
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', JSON.stringify(admin));

      setIsAuthenticated(true);
      setUser(admin);
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw new Error(error.response?.data?.message || error.message || 'Erro ao fazer login');
    }
  };

  // Não renderizar nada até verificar autenticação
  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
