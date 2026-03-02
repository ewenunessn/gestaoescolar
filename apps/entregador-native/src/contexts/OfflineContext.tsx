import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { confirmarEntregaItem, ConfirmarEntregaData } from '../api/rotas';

interface OfflineOperation {
  id: string;
  type: 'confirmar_entrega';
  itemId: number;
  data: ConfirmarEntregaData;
  timestamp: number;
  status?: 'pending' | 'syncing' | 'synced' | 'failed';
}

interface OfflineContextData {
  isOnline: boolean;
  pendingOperations: number;
  addOperation: (itemId: number, data: ConfirmarEntregaData) => Promise<void>;
  syncPendingOperations: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextData>({} as OfflineContextData);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Monitorar status de conexão
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      
      console.log('📡 Status de conexão:', online ? 'ONLINE ✅' : 'OFFLINE ❌');
      
      setIsOnline(prevOnline => {
        // Detectar transição de offline para online
        if (online && !prevOnline) {
          console.log('🔄 Transição detectada: OFFLINE → ONLINE');
          
          // Limpar timeout anterior se existir
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          
          // Agendar sincronização com debounce
          syncTimeoutRef.current = setTimeout(() => {
            const now = Date.now();
            const timeSinceLastSync = now - lastSyncTimestamp;
            
            // Só sincronizar se passou pelo menos 5 segundos desde a última sincronização
            if (timeSinceLastSync > 5000) {
              console.log('⏰ Iniciando sincronização agendada...');
              syncPendingOperations();
            } else {
              console.log(`⏸️ Sincronização ignorada (última há ${Math.round(timeSinceLastSync / 1000)}s)`);
            }
          }, 3000); // Delay de 3 segundos
        }
        
        return online;
      });
    });

    // Carregar contagem de operações pendentes
    loadPendingCount();

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []); // Remover isOnline da dependência para evitar loops

  const loadPendingCount = async () => {
    try {
      const queue = await AsyncStorage.getItem('offline_queue');
      if (queue) {
        const operations: OfflineOperation[] = JSON.parse(queue);
        setPendingOperations(operations.length);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem de operações:', error);
    }
  };

  const addOperation = async (itemId: number, data: ConfirmarEntregaData) => {
    try {
      const queue = await AsyncStorage.getItem('offline_queue');
      const operations: OfflineOperation[] = queue ? JSON.parse(queue) : [];

      // Criar um hash único baseado nos dados da operação para detectar duplicatas
      const operationHash = `${itemId}_${data.quantidade_entregue}_${data.nome_quem_recebeu}_${data.nome_quem_entregou}`;
      
      // Verificar se já existe uma operação pendente ou em sincronização com os mesmos dados
      const existingOperation = operations.find(
        op => {
          const existingHash = `${op.itemId}_${op.data.quantidade_entregue}_${op.data.nome_quem_recebeu}_${op.data.nome_quem_entregou}`;
          return existingHash === operationHash && (op.status === 'pending' || op.status === 'syncing');
        }
      );

      if (existingOperation) {
        console.log(`⚠️ Operação duplicada detectada para item ${itemId}, ignorando...`);
        console.log(`   Hash: ${operationHash}`);
        console.log(`   Status existente: ${existingOperation.status}`);
        return;
      }

      const newOperation: OfflineOperation = {
        id: `${Date.now()}_${itemId}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'confirmar_entrega',
        itemId,
        data,
        timestamp: Date.now(),
        status: 'pending',
      };

      operations.push(newOperation);
      await AsyncStorage.setItem('offline_queue', JSON.stringify(operations));
      setPendingOperations(operations.length);

      console.log(`✅ Operação adicionada à fila offline: ${newOperation.id}`);
      console.log(`   Item: ${itemId}, Quantidade: ${data.quantidade_entregue}`);
    } catch (error) {
      console.error('❌ Erro ao adicionar operação à fila:', error);
      throw error;
    }
  };

  const syncPendingOperations = async () => {
    if (isSyncing) {
      console.log('⚠️ Sincronização já em andamento, ignorando...');
      return;
    }

    try {
      setIsSyncing(true);
      setLastSyncTimestamp(Date.now());
      console.log('🔄 Iniciando sincronização...');
      
      const queue = await AsyncStorage.getItem('offline_queue');
      
      if (!queue) {
        console.log('✓ Nenhuma operação pendente para sincronizar');
        return;
      }

      const operations: OfflineOperation[] = JSON.parse(queue);
      console.log(`📋 Total de operações na fila: ${operations.length}`);
      
      // Filtrar apenas operações pendentes (não em sincronização)
      const pendingOps = operations.filter(op => op.status === 'pending' || !op.status);
      console.log(`📋 Operações pendentes para sincronizar: ${pendingOps.length}`);
      
      if (pendingOps.length === 0) {
        console.log('✓ Nenhuma operação pendente para sincronizar');
        return;
      }

      // Atualizar status de todas as operações pendentes para 'syncing' ANTES de começar
      const updatedOps = operations.map(op => {
        if (op.status === 'pending' || !op.status) {
          return { ...op, status: 'syncing' as const };
        }
        return op;
      });
      await AsyncStorage.setItem('offline_queue', JSON.stringify(updatedOps));

      const failedOperations: OfflineOperation[] = [];
      const syncedIds: string[] = [];

      for (const operation of pendingOps) {
        try {
          console.log(`🔄 Sincronizando operação ${operation.id} (item ${operation.itemId})...`);
          
          if (operation.type === 'confirmar_entrega') {
            await confirmarEntregaItem(operation.itemId, operation.data);
            console.log(`✅ Operação ${operation.id} sincronizada com sucesso`);
            syncedIds.push(operation.id);
          }
        } catch (error: any) {
          console.error(`❌ Erro ao sincronizar operação ${operation.id}:`, error?.message || error);
          // Marcar como failed
          const failedOp = updatedOps.find(op => op.id === operation.id);
          if (failedOp) {
            failedOp.status = 'failed';
            failedOperations.push(failedOp);
          }
        }
      }

      // Manter apenas operações que falharam (não remover as sincronizadas com sucesso)
      const remainingOps = updatedOps.filter(op => 
        !syncedIds.includes(op.id)
      );
      
      console.log(`📊 Resultado: ${syncedIds.length} sucesso, ${failedOperations.length} falhas, ${remainingOps.length} restantes`);
      
      await AsyncStorage.setItem('offline_queue', JSON.stringify(remainingOps));
      setPendingOperations(remainingOps.length);

    } catch (error) {
      console.error('❌ Erro durante sincronização:', error);
    } finally {
      setIsSyncing(false);
      console.log('✓ Sincronização finalizada');
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingOperations,
        addOperation,
        syncPendingOperations,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline deve ser usado dentro de OfflineProvider');
  }
  return context;
}
