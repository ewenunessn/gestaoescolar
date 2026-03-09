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
  // Dados para criar comprovante após sincronização
  comprovanteData?: {
    escola_id: number;
    nome_quem_entregou: string;
    nome_quem_recebeu: string;
    observacao?: string;
    assinatura_base64: string;
    produto_nome: string;
    quantidade_entregue: number;
  };
}

interface OfflineContextData {
  isOnline: boolean;
  pendingOperations: number;
  addOperation: (itemId: number, data: ConfirmarEntregaData, comprovanteData?: any) => Promise<void>;
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

  const addOperation = async (itemId: number, data: ConfirmarEntregaData, comprovanteData?: any) => {
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
        comprovanteData, // Salvar dados do comprovante
      };

      operations.push(newOperation);
      await AsyncStorage.setItem('offline_queue', JSON.stringify(operations));
      setPendingOperations(operations.length);

      console.log(`✅ Operação adicionada à fila offline: ${newOperation.id}`);
      console.log(`   Item: ${itemId}, Quantidade: ${data.quantidade_entregue}`);
      if (comprovanteData) {
        console.log(`   📋 Dados do comprovante salvos para sincronização posterior`);
      }
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
      const syncedWithComprovante: Array<{ operation: OfflineOperation; historicoId: number }> = [];

      for (const operation of pendingOps) {
        try {
          console.log(`🔄 Sincronizando operação ${operation.id} (item ${operation.itemId})...`);
          
          if (operation.type === 'confirmar_entrega') {
            const response = await confirmarEntregaItem(operation.itemId, operation.data);
            console.log(`✅ Operação ${operation.id} sincronizada com sucesso`);
            syncedIds.push(operation.id);
            
            // Se tiver dados de comprovante e historico_id, guardar para criar comprovante depois
            if (operation.comprovanteData && response?.historico_id) {
              syncedWithComprovante.push({ operation, historicoId: response.historico_id });
              console.log(`📋 Operação marcada para criação de comprovante (historico_id: ${response.historico_id})`);
            }
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

      // Criar comprovantes para entregas sincronizadas que têm dados de comprovante
      if (syncedWithComprovante.length > 0) {
        console.log(`📋 Criando comprovantes para ${syncedWithComprovante.length} entregas sincronizadas...`);
        await criarComprovantesOffline(syncedWithComprovante);
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

  const criarComprovantesOffline = async (syncedOps: Array<{ operation: OfflineOperation; historicoId: number }>) => {
    // Agrupar por escola_id para criar um comprovante por escola
    const porEscola = syncedOps.reduce((acc, { operation, historicoId }) => {
      const escolaId = operation.comprovanteData!.escola_id;
      if (!acc[escolaId]) {
        acc[escolaId] = [];
      }
      acc[escolaId].push({ operation, historicoId });
      return acc;
    }, {} as Record<number, Array<{ operation: OfflineOperation; historicoId: number }>>);

    for (const [escolaId, ops] of Object.entries(porEscola)) {
      try {
        const primeiraOp = ops[0].operation;
        const itensComprovante = ops.map(({ operation, historicoId }) => ({
          historico_entrega_id: historicoId,
          produto_nome: operation.comprovanteData!.produto_nome,
          quantidade_entregue: operation.comprovanteData!.quantidade_entregue,
        }));

        const comprovanteData = {
          escola_id: parseInt(escolaId),
          nome_quem_entregou: primeiraOp.comprovanteData!.nome_quem_entregou,
          nome_quem_recebeu: primeiraOp.comprovanteData!.nome_quem_recebeu,
          observacao: primeiraOp.comprovanteData!.observacao,
          assinatura_base64: primeiraOp.comprovanteData!.assinatura_base64,
          itens: itensComprovante,
        };

        console.log(`📤 Criando comprovante para escola ${escolaId} com ${itensComprovante.length} itens...`);

        const tokenData = await AsyncStorage.getItem('token');
        const token = tokenData ? JSON.parse(tokenData).token : null;
        const API_URL = 'https://gestaoescolar.ewertoncampos.com.br/api';

        const response = await fetch(`${API_URL}/entregas/comprovantes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(comprovanteData),
        });

        if (response.ok) {
          const comprovante = await response.json();
          console.log(`✅ Comprovante ${comprovante.numero_comprovante} criado com sucesso para escola ${escolaId}`);
        } else {
          const errorText = await response.text();
          console.error(`❌ Erro ao criar comprovante para escola ${escolaId}:`, errorText);
        }
      } catch (error) {
        console.error(`❌ Erro ao criar comprovante para escola ${escolaId}:`, error);
      }
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
