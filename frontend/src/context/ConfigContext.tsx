import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import configService, { ConfiguracaoModuloSaldo } from '../services/configService';

interface ConfigContextType {
  configModuloSaldo: ConfiguracaoModuloSaldo;
  loading: boolean;
  error: string | null;
  recarregarConfig: () => Promise<void>;
  atualizarConfig: (novaConfig: ConfiguracaoModuloSaldo) => Promise<void>;
  onConfigChanged?: (callback: () => void) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  // Configuração fixa: sempre usar modalidades
  const [configModuloSaldo] = useState<ConfiguracaoModuloSaldo>({
    modulo_principal: 'modalidades',
    mostrar_ambos: false
  });
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const recarregarConfig = useCallback(async () => {
    // Não faz nada, configuração é fixa
  }, []);

  const atualizarConfig = useCallback(async (novaConfig: ConfiguracaoModuloSaldo) => {
    // Não faz nada, configuração é fixa
    console.log('Configuração é fixa em modalidades');
  }, []);

  const value: ConfigContextType = useMemo(() => ({
    configModuloSaldo,
    loading,
    error,
    recarregarConfig,
    atualizarConfig,
    onConfigChanged: (callback: () => void) => {}
  }), [configModuloSaldo, loading, error, recarregarConfig, atualizarConfig]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfigContext = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfigContext deve ser usado dentro de um ConfigProvider');
  }
  return context;
};