/**
 * Hook para gerenciamento de sincronização inteligente
 * Implementa sincronização automática, offline-first e resolução de conflitos
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';
import { apiService } from '../services/api';

interface SyncItem {
  id: string;
  type: 'entrada' | 'saida' | 'ajuste';
  data: any;
  timestamp: number;
  tentativas: number;
  erro?: string;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingItems: number;
  errors: string[];
}

interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // minutos
  maxRetries: number;
  batchSize: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  autoSync: true,
  syncInterval: 5,
  maxRetries: 3,
  batchSize: 10
};

export const useSyncManager = (config: Partial<SyncConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    pendingItems: 0,
    errors: []
  });
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingItemsRef = useRef<SyncItem[]>([]);

  // ============================================================================
  // GERENCIAMENTO DE CONECTIVIDADE
  // ============================================================================

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !status.isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable;
      
      setStatus(prev => ({ ...prev, isOnline: isNowOnline }));
      
      // Se voltou online, tentar sincronizar
      if (wasOffline && isNowOnline && finalConfig.autoSync) {
        syncPendingItems();
      }
    });

    return unsubscribe;
  }, [status.isOnline, finalConfig.autoSync]);

  // ============================================================================
  // SINCRONIZAÇÃO AUTOMÁTICA
  // ============================================================================

  useEffect(() => {
    if (finalConfig.autoSync && status.isOnline) {
      syncIntervalRef.current = setInterval(() => {
        syncPendingItems();
      }, finalConfig.syncInterval * 60 * 1000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [finalConfig.autoSync, finalConfig.syncInterval, status.isOnline]);

  // ============================================================================
  // ARMAZENAMENTO LOCAL
  // ============================================================================

  const loadPendingItems = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('@sync_pending_items');
      if (stored) {
        pendingItemsRef.current = JSON.parse(stored);
        setStatus(prev => ({ 
          ...prev, 
          pendingItems: pendingItemsRef.current.length 
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar itens pendentes:', error);
    }
  }, []);

  const savePendingItems = useCallback(async () => {
    try {
      await AsyncStorage.setItem(
        '@sync_pending_items', 
        JSON.stringify(pendingItemsRef.current)
      );
      setStatus(prev => ({ 
        ...prev, 
        pendingItems: pendingItemsRef.current.length 
      }));
    } catch (error) {
      console.error('Erro ao salvar itens pendentes:', error);
    }
  }, []);

  const loadLastSync = useCallback(async () => {
    try {
      const lastSyncStr = await AsyncStorage.getItem('@last_sync');
      if (lastSyncStr) {
        setStatus(prev => ({ 
          ...prev, 
          lastSync: new Date(lastSyncStr) 
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar última sincronização:', error);
    }
  }, []);

  const saveLastSync = useCallback(async () => {
    try {
      const now = new Date();
      await AsyncStorage.setItem('@last_sync', now.toISOString());
      setStatus(prev => ({ ...prev, lastSync: now }));
    } catch (error) {
      console.error('Erro ao salvar última sincronização:', error);
    }
  }, []);

  // ============================================================================
  // ADIÇÃO DE ITENS PARA SINCRONIZAÇÃO
  // ============================================================================

  const addToSync = useCallback(async (
    type: 'entrada' | 'saida' | 'ajuste',
    data: any
  ) => {
    const syncItem: SyncItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      tentativas: 0
    };

    pendingItemsRef.current.push(syncItem);
    await savePendingItems();

    // Se estiver online, tentar sincronizar imediatamente
    if (status.isOnline) {
      syncPendingItems();
    }

    return syncItem.id;
  }, [status.isOnline, savePendingItems]);

  // ============================================================================
  // SINCRONIZAÇÃO DE ITENS PENDENTES
  // ============================================================================

  const syncPendingItems = useCallback(async () => {
    if (!status.isOnline || status.isSyncing || pendingItemsRef.current.length === 0) {
      return;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, errors: [] }));

    try {
      // Processar em lotes
      const batch = pendingItemsRef.current.slice(0, finalConfig.batchSize);
      const errors: string[] = [];
      const successIds: string[] = [];

      for (const item of batch) {
        try {
          await syncSingleItem(item);
          successIds.push(item.id);
        } catch (error) {
          item.tentativas++;
          item.erro = error instanceof Error ? error.message : 'Erro desconhecido';
          
          if (item.tentativas >= finalConfig.maxRetries) {
            errors.push(`Item ${item.id}: ${item.erro} (máx. tentativas excedidas)`);
            successIds.push(item.id); // Remover da fila mesmo com erro
          } else {
            errors.push(`Item ${item.id}: ${item.erro} (tentativa ${item.tentativas})`);
          }
        }
      }

      // Remover itens processados com sucesso ou que excederam tentativas
      pendingItemsRef.current = pendingItemsRef.current.filter(
        item => !successIds.includes(item.id)
      );

      await savePendingItems();
      
      if (successIds.length > 0) {
        await saveLastSync();
      }

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        errors
      }));

    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        errors: ['Erro geral na sincronização: ' + (error instanceof Error ? error.message : 'Erro desconhecido')]
      }));
    }
  }, [status.isOnline, status.isSyncing, finalConfig.batchSize, finalConfig.maxRetries, savePendingItems, saveLastSync]);

  // ============================================================================
  // SINCRONIZAÇÃO DE ITEM INDIVIDUAL
  // ============================================================================

  const syncSingleItem = async (item: SyncItem) => {
    switch (item.type) {
      case 'entrada':
        await apiService.movimentarEstoque({
          ...item.data,
          tipo_movimentacao: 'entrada'
        });
        break;
        
      case 'saida':
        await apiService.movimentarEstoque({
          ...item.data,
          tipo_movimentacao: 'saida'
        });
        break;
        
      case 'ajuste':
        await apiService.movimentarEstoque({
          ...item.data,
          tipo_movimentacao: 'ajuste'
        });
        break;
        
      default:
        throw new Error(`Tipo de sincronização não suportado: ${item.type}`);
    }
  };

  // ============================================================================
  // SINCRONIZAÇÃO MANUAL
  // ============================================================================

  const forcSync = useCallback(async () => {
    if (!status.isOnline) {
      throw new Error('Não é possível sincronizar offline');
    }
    
    await syncPendingItems();
  }, [status.isOnline, syncPendingItems]);

  // ============================================================================
  // LIMPEZA DE DADOS
  // ============================================================================

  const clearPendingItems = useCallback(async () => {
    pendingItemsRef.current = [];
    await savePendingItems();
  }, [savePendingItems]);

  const clearErrors = useCallback(() => {
    setStatus(prev => ({ ...prev, errors: [] }));
  }, []);

  // ============================================================================
  // INICIALIZAÇÃO
  // ============================================================================

  useEffect(() => {
    loadPendingItems();
    loadLastSync();
  }, [loadPendingItems, loadLastSync]);

  // ============================================================================
  // INTERFACE PÚBLICA
  // ============================================================================

  return {
    // Status
    status,
    
    // Ações
    addToSync,
    forcSync,
    clearPendingItems,
    clearErrors,
    
    // Configuração
    config: finalConfig,
    
    // Utilitários
    isOnline: status.isOnline,
    hasPendingItems: status.pendingItems > 0,
    hasErrors: status.errors.length > 0,
    
    // Estatísticas
    stats: {
      pendingItems: status.pendingItems,
      lastSync: status.lastSync,
      errors: status.errors.length,
      isHealthy: status.isOnline && status.errors.length === 0
    }
  };
};