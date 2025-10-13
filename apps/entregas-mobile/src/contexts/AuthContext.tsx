import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';
import { entregaService, User } from '../services/entregaService';
import api from '../services/api';

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
      const [storedUser, storedToken] = await Promise.all([
        AsyncStorage.getItem('@entregas:user'),
        AsyncStorage.getItem('@entregas:token')
      ]);
      
      if (storedUser && storedToken) {
        // Configurar token no header da API
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        try {
          // Verificar se o token ainda é válido buscando dados atualizados do usuário
          const userData = await entregaService.buscarUsuario();
          setUser(userData);
          
          // Se usuário já está logado, pré-carregar dados em background
          setTimeout(() => {
            preCarregarDadosAutomatico();
          }, 2000);
        } catch (error) {
          console.log('Token expirado ou inválido, fazendo logout');
          await signOut();
        }
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
      
      // Fazer login real na API
      const loginResponse = await entregaService.login(email, password);
      
      // Salvar token no AsyncStorage PRIMEIRO
      await AsyncStorage.setItem('@entregas:token', loginResponse.token);
      
      // Configurar token no header da API (backup para requisições imediatas)
      api.defaults.headers.common['Authorization'] = `Bearer ${loginResponse.token}`;
      
      // Buscar dados completos do usuário
      const userData = await entregaService.buscarUsuario();
      
      // Salvar dados do usuário no AsyncStorage
      await AsyncStorage.setItem('@entregas:user', JSON.stringify(userData));
      
      setUser(userData);

      // Pré-carregar dados automaticamente após login (em background)
      setTimeout(() => {
        preCarregarDadosAutomatico();
      }, 1000);
    } catch (error: any) {
      console.error('Erro no login:', error);
      throw new Error(error?.response?.data?.message || 'Erro ao fazer login');
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
      await Promise.all([
        AsyncStorage.removeItem('@entregas:user'),
        AsyncStorage.removeItem('@entregas:token')
      ]);
      
      // Remover token do header da API
      delete api.defaults.headers.common['Authorization'];
      
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