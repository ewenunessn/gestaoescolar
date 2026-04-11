import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken } from '../services/auth';

interface AuthContextType {
  isReady: boolean;
  hasToken: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isReady: false,
  hasToken: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Aguardar um pouco para garantir que o localStorage está sincronizado
    const timer = setTimeout(() => {
      const token = getToken();
      setHasToken(!!token);
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Listener para mudanças no localStorage (quando faz login)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getToken();
      setHasToken(!!token);
    };

    window.addEventListener('storage', handleStorageChange);

    // Também escutar mudanças customizadas (para mesma aba)
    window.addEventListener('auth-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleStorageChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isReady, hasToken }}>
      {children}
    </AuthContext.Provider>
  );
};
