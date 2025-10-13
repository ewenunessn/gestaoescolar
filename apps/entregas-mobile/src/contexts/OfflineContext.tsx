import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineService } from '../services/offlineService';
import { entregaServiceHybrid } from '../services/entregaServiceHybrid';

interface OfflineContextData {
  isOnline: boolean;
  isOffline: boolean;
  operacoesPendentes: number;
  ultimaSync: Date | null;
  sincronizando: boolean;
  sincronizarAgora: () => Promise<void>;
  atualizarStatusOperacoes: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextData>({} as OfflineContextData);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [operacoesPendentes, setOperacoesPendentes] = useState(0);
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    // Listener para mudanças de conectividade
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isOnline;
      const online = state.isConnected ?? false;
      setIsOnline(online);
      
      console.log(`📶 Status de conectividade: ${online ? 'ONLINE' : 'OFFLINE'}`);
      
      // Se voltou online, sincronizar e atualizar dados
      if (wasOffline && online) {
        console.log('🔄 Voltou online! Sincronizando automaticamente...');
        sincronizarAutomatico();
      }
      
      // Atualizar status das operações
      if (online) {
        atualizarStatusOperacoes();
      }
    });

    // Carregar status inicial
    carregarStatusInicial();

    return () => unsubscribe();
  }, []);

  const carregarStatusInicial = async () => {
    try {
      // Verificar conectividade inicial
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected ?? false);
      
      // Carregar dados do cache
      await atualizarStatusOperacoes();
    } catch (error) {
      console.error('Erro ao carregar status inicial:', error);
    }
  };

  const atualizarStatusOperacoes = async () => {
    try {
      const [fila, ultimaSyncData] = await Promise.all([
        offlineService.obterFilaSincronizacao(),
        offlineService.obterUltimaSync(),
      ]);
      
      setOperacoesPendentes(fila.length);
      setUltimaSync(ultimaSyncData);
    } catch (error) {
      console.error('Erro ao atualizar status das operações:', error);
    }
  };

  const sincronizarAgora = async () => {
    if (!isOnline || sincronizando) {
      return;
    }

    setSincronizando(true);
    
    try {
      console.log('🔄 Iniciando sincronização manual...');
      await offlineService.sincronizarFilaPendente();
      await atualizarStatusOperacoes();
      console.log('✅ Sincronização manual concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização manual:', error);
      throw error;
    } finally {
      setSincronizando(false);
    }
  };

  const sincronizarAutomatico = async () => {
    if (!isOnline || sincronizando) {
      return;
    }

    setSincronizando(true);
    
    try {
      console.log('🔄 Iniciando sincronização automática...');
      
      // 1. Sincronizar operações pendentes primeiro
      await offlineService.sincronizarFilaPendente();
      
      // 2. Atualizar cache com dados mais recentes
      await entregaServiceHybrid.preCarregarDados();
      
      await atualizarStatusOperacoes();
      console.log('✅ Sincronização automática concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização automática:', error);
    } finally {
      setSincronizando(false);
    }
  };

  const value: OfflineContextData = {
    isOnline,
    isOffline: !isOnline,
    operacoesPendentes,
    ultimaSync,
    sincronizando,
    sincronizarAgora,
    atualizarStatusOperacoes,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = (): OfflineContextData => {
  const context = useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOffline deve ser usado dentro de um OfflineProvider');
  }
  
  return context;
};