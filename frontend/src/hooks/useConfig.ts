import { useState, useEffect } from 'react';
import configService, { ConfiguracaoModuloSaldo } from '../services/configService';

export const useConfigModuloSaldo = () => {
  const [config, setConfig] = useState<ConfiguracaoModuloSaldo>({
    modulo_principal: 'modalidades',
    mostrar_ambos: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const configuracao = await configService.buscarConfiguracaoModuloSaldo();
      setConfig(configuracao);
    } catch (err: any) {
      console.error('Erro ao carregar configuração do módulo de saldo:', err);
      setError('Erro ao carregar configurações');
      // Manter configuração padrão em caso de erro
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarConfig();
  }, []);

  const recarregar = () => {
    carregarConfig();
  };

  return {
    config,
    loading,
    error,
    recarregar
  };
};

export const useConfig = () => {
  const buscarConfiguracao = async (chave: string) => {
    try {
      return await configService.buscarConfiguracaoComCache(chave);
    } catch (error) {
      console.error(`Erro ao buscar configuração ${chave}:`, error);
      return null;
    }
  };

  const salvarConfiguracao = async (chave: string, valor: any) => {
    try {
      const valorString = typeof valor === 'string' ? valor : JSON.stringify(valor);
      await configService.atualizarConfiguracao(chave, valorString);
      configService.limparCache();
      return true;
    } catch (error) {
      console.error(`Erro ao salvar configuração ${chave}:`, error);
      return false;
    }
  };

  return {
    buscarConfiguracao,
    salvarConfiguracao
  };
};