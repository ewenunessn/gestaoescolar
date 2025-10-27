import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario } from '../types';
import { apiService } from '../services/api';

interface AuthContextData {
  usuario: Usuario | null;
  loading: boolean;
  loginGestor: (escolaId: number, codigoAcesso: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verificarSessao: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarSessao();
  }, []);



  const logout = async (): Promise<void> => {
    try {
      // Limpar token da API
      await apiService.logout();
      
      // Limpar sessão do gestor se existir
      const { limparSessaoGestor } = await import('../services/gestorEscola');
      await limparSessaoGestor();
      
      // Limpar estado do usuário
      setUsuario(null);
    } catch (error) {
      console.error('Erro no logout:', error);
      
      // Fazer logout local mesmo se houver erro
      try {
        const { limparSessaoGestor } = await import('../services/gestorEscola');
        await limparSessaoGestor();
      } catch (gestorError) {
        console.error('Erro ao limpar sessão do gestor:', gestorError);
      }
      
      setUsuario(null);
    }
  };

  const loginGestor = async (escolaId: number, codigoAcesso: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { autenticarGestor, salvarSessaoGestor } = await import('../services/gestorEscola');
      const response = await autenticarGestor(escolaId, codigoAcesso);
      
      if (response.success && response.data) {
        // Salvar sessão do gestor
        await salvarSessaoGestor(response.data.escola, response.data.token, codigoAcesso);
        
        // Garantir que o token seja definido no apiService
        await apiService.setToken(response.data.token);
        
        // Criar usuário gestor baseado nos dados da escola
        const usuarioGestor = {
          id: response.data.escola.id,
          nome: `Gestor - ${response.data.escola.nome}`,
          email: `gestor@${response.data.escola.nome.toLowerCase().replace(/\s+/g, '')}.edu.br`,
          tipo: 'gestor',
          ativo: true,
          escola: response.data.escola,
          escola_id: response.data.escola.id
        };
        
        setUsuario({ ...usuarioGestor, perfil: 'GESTOR' });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Erro no login do gestor:', error);
      
      // Limpar qualquer token inválido
      try {
        await apiService.removeToken();
        const { limparSessaoGestor } = await import('../services/gestorEscola');
        await limparSessaoGestor();
      } catch (cleanupError) {
        console.error('Erro ao limpar dados após falha no login:', cleanupError);
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verificarSessao = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Verificar sessão normal primeiro
      const response = await apiService.verificarSessao();
      
      if (response.valida && response.usuario) {
        setUsuario(response.usuario);
        return;
      }
      
      // Verificar sessão do gestor
      const { obterSessaoGestor } = await import('../services/gestorEscola');
      const sessaoGestor = await obterSessaoGestor();
      
      if (sessaoGestor) {
        // Garantir que o token seja definido no apiService
        await apiService.setToken(sessaoGestor.token);
        
        const usuarioGestor = {
          id: sessaoGestor.escola.id,
          nome: `Gestor - ${sessaoGestor.escola.nome}`,
          email: `gestor@${sessaoGestor.escola.nome.toLowerCase().replace(/\s+/g, '')}.edu.br`,
          tipo: 'gestor',
          ativo: true,
          escola: sessaoGestor.escola,
          escola_id: sessaoGestor.escola.id
        };
        
        setUsuario({ ...usuarioGestor, perfil: 'GESTOR' });
        return;
      }
      
      setUsuario(null);
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        loading,
        loginGestor,
        logout,
        verificarSessao,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;