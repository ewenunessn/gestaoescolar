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
  const [configModuloSaldo, setConfigModuloSaldo] = useState<ConfiguracaoModuloSaldo>({
    modulo_principal: 'modalidades',
    mostrar_ambos: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onConfigChanged, setOnConfigChanged] = useState<(() => void) | undefined>();

  const carregarConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const config = await configService.buscarConfiguracaoModuloSaldo();
      
      // Só atualizar se a configuração realmente mudou
      setConfigModuloSaldo(prevConfig => {
        const configChanged = JSON.stringify(prevConfig) !== JSON.stringify(config);
        if (configChanged) {
          console.log('Configuração carregada do servidor:', config);
          return config;
        }
        return prevConfig;
      });
    } catch (err: any) {
      console.error('Erro ao carregar configuração do módulo de saldo:', err);
      setError('Erro ao carregar configurações');
      // Manter configuração padrão em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  const recarregarConfig = useCallback(async () => {
    await carregarConfig();
  }, [carregarConfig]);

  const atualizarConfig = useCallback(async (novaConfig: ConfiguracaoModuloSaldo) => {
    try {
      await configService.salvarConfiguracaoModuloSaldo(novaConfig);
      
      // Limpar cache
      configService.limparCache();
      
      // Atualizar estado local imediatamente
      console.log('Atualizando configuração para:', novaConfig);
      setConfigModuloSaldo(novaConfig);
      
      // Chamar callback se definido
      if (onConfigChanged) {
        onConfigChanged();
      }
    } catch (err: any) {
      console.error('Erro ao atualizar configuração:', err);
      throw err;
    }
  }, [onConfigChanged]);

  useEffect(() => {
    // Só carregar configurações se houver token E tenant (usuário autenticado e tenant resolvido)
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('currentTenantId');
    
    if (token && tenantId) {
      carregarConfig();
    } else {
      // Se não houver token ou tenant, apenas marcar como não carregando
      setLoading(false);
    }
  }, [carregarConfig]);

  const value: ConfigContextType = useMemo(() => ({
    configModuloSaldo,
    loading,
    error,
    recarregarConfig,
    atualizarConfig,
    onConfigChanged: (callback: () => void) => setOnConfigChanged(() => callback)
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