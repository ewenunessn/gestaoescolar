import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';

interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'entregador' | 'escola';
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@entregas:user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        
        // Se usuário já está logado, pré-carregar dados em background
        setTimeout(() => {
          preCarregarDadosAutomatico();
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Simulação de login - substituir pela API real
      const mockUser: User = {
        id: 1,
        nome: 'Entregador Teste',
        email: email,
        tipo: 'entregador'
      };

      await AsyncStorage.setItem('@entregas:user', JSON.stringify(mockUser));
      setUser(mockUser);

      // Pré-carregar dados automaticamente após login (em background)
      setTimeout(() => {
        preCarregarDadosAutomatico();
      }, 1000);
    } catch (error) {
      throw new Error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const preCarregarDadosAutomatico = async () => {
    try {
      console.log('🔄 Iniciando pré-carregamento automático de dados...');
      await entregaServiceHybrid.preCarregarDados();
      console.log('✅ Dados pré-carregados automaticamente! App pronto para uso offline.');
    } catch (error) {
      console.log('⚠️ Erro no pré-carregamento automático (normal se offline):', error);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('@entregas:user');
      setUser(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};