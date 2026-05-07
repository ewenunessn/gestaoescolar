import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
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
  const [configModuloSaldo, setConfigModuloSaldo] = useState<ConfiguracaoModuloSaldo>({
    modulo_principal: 'modalidades',
    mostrar_ambos: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callbacksRef = React.useRef<Array<() => void>>([]);

  const recarregarConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const config = await configService.buscarConfiguracaoModuloSaldo();
      setConfigModuloSaldo(config);
    } catch (err) {
      console.error('Erro ao carregar configuracao do saldo de contratos:', err);
      setError('Erro ao carregar configuracao');
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizarConfig = useCallback(async (novaConfig: ConfiguracaoModuloSaldo) => {
    const result = await configService.salvarConfiguracaoModuloSaldo(novaConfig);
    setConfigModuloSaldo(result.config);
    callbacksRef.current.forEach((callback) => callback());
  }, []);

  useEffect(() => {
    recarregarConfig();
  }, [recarregarConfig]);

  const value: ConfigContextType = useMemo(() => ({
    configModuloSaldo,
    loading,
    error,
    recarregarConfig,
    atualizarConfig,
    onConfigChanged: (callback: () => void) => {
      callbacksRef.current.push(callback);
    },
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
