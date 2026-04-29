import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  confirmarEntregaItem,
  confirmarFotoComprovanteUpload,
  solicitarFotoComprovanteUploadUrl,
  type ConfirmarEntregaData,
} from '../api/rotas';
import { API_URL } from '../api/client';
import {
  enqueueDeliveryOperation,
  loadDeliveryOutboxOperations,
  saveDeliveryOutboxOperations,
} from '../services/deliveryOutbox';
import {
  applyComprovanteCreated,
  applyDeliveryAccepted,
  applyDeliveryPhotoUploaded,
  applySyncError,
  getOutboxSummary,
  getSyncableOperations,
  markOperationsSyncing,
  type DeliveryComprovanteData,
  type DeliveryOutboxOperation,
} from '../services/deliveryOutboxCore';
import { uploadDeliveryPhotoToSignedUrl } from '../services/deliveryPhotoUpload';
import { syncRemoteDeliveryChanges } from '../services/deliveryRemoteChanges';

interface OfflineContextData {
  isOnline: boolean;
  pendingOperations: number;
  failedOperations: number;
  totalOperations: number;
  isSyncing: boolean;
  lastSyncError?: string;
  lastSyncAt?: number;
  syncVersion: number;
  addOperation: (
    itemId: number,
    data: ConfirmarEntregaData,
    comprovanteData?: DeliveryComprovanteData,
  ) => Promise<void>;
  syncPendingOperations: () => Promise<void>;
  refreshOfflineState: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextData>({} as OfflineContextData);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [failedOperations, setFailedOperations] = useState(0);
  const [totalOperations, setTotalOperations] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | undefined>();
  const [lastSyncAt, setLastSyncAt] = useState<number | undefined>();
  const [syncVersion, setSyncVersion] = useState(0);
  const isSyncingRef = useRef(false);
  const lastSyncTimestampRef = useRef(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyOperationsState = useCallback((operations: DeliveryOutboxOperation[]) => {
    const summary = getOutboxSummary(operations);
    setPendingOperations(summary.pendingOperations);
    setFailedOperations(summary.failedOperations);
    setTotalOperations(summary.totalOpenOperations);
    setLastSyncError(summary.lastError);
  }, []);

  const refreshOfflineState = useCallback(async () => {
    const operations = await loadDeliveryOutboxOperations();
    applyOperationsState(operations);
  }, [applyOperationsState]);

  const addOperation = useCallback(
    async (itemId: number, data: ConfirmarEntregaData, comprovanteData?: DeliveryComprovanteData) => {
      await enqueueDeliveryOperation(itemId, data, comprovanteData);
      const operations = await loadDeliveryOutboxOperations();
      applyOperationsState(operations);
      setSyncVersion((version) => version + 1);
    },
    [applyOperationsState],
  );

  const syncPendingOperations = useCallback(async () => {
    if (isSyncingRef.current) {
      console.log('Sincronizacao ja em andamento, ignorando novo pedido.');
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    const syncStartedAt = Date.now();
    setLastSyncAt(syncStartedAt);
    lastSyncTimestampRef.current = syncStartedAt;

    try {
      let operations = await loadDeliveryOutboxOperations();
      applyOperationsState(operations);

      const deliveryOperations = getSyncableOperations(operations, syncStartedAt).filter(
        (operation) => !operation.historicoId,
      );

      if (deliveryOperations.length > 0) {
        operations = markOperationsSyncing(
          operations,
          deliveryOperations.map((operation) => operation.id),
          Date.now(),
        );
        operations = await saveDeliveryOutboxOperations(operations);
        applyOperationsState(operations);

        for (const operation of deliveryOperations) {
          const currentOperation = operations.find((candidate) => candidate.id === operation.id) || operation;

          try {
            const response = await confirmarEntregaItem(currentOperation.itemId, currentOperation.data);
            operations = replaceOperation(
              operations,
              applyDeliveryAccepted(currentOperation, response?.historico_id),
            );
          } catch (error) {
            operations = replaceOperation(operations, applySyncError(currentOperation, error, Date.now()));
          }

          operations = await saveDeliveryOutboxOperations(operations);
          applyOperationsState(operations);
          setSyncVersion((version) => version + 1);
        }
      }

      const comprovanteOperations = getSyncableOperations(operations, Date.now()).filter(
        (operation) => !!operation.historicoId && !!operation.comprovanteData,
      );

      if (comprovanteOperations.length > 0) {
        const groups = groupComprovanteOperations(comprovanteOperations);
        operations = markOperationsSyncing(
          operations,
          comprovanteOperations.map((operation) => operation.id),
          Date.now(),
        );
        operations = await saveDeliveryOutboxOperations(operations);
        applyOperationsState(operations);

        for (const group of groups) {
          const currentGroup = group.map(
            (operation) => operations.find((candidate) => candidate.id === operation.id) || operation,
          );

          try {
            const comprovanteId =
              currentGroup.find((operation) => operation.comprovanteId)?.comprovanteId ||
              await criarComprovanteOffline(currentGroup);
            const groupAfterComprovante = currentGroup.map((operation) =>
              applyComprovanteCreated(operation, comprovanteId || undefined),
            );

            operations = replaceOperations(operations, groupAfterComprovante);
            operations = await saveDeliveryOutboxOperations(operations);
            applyOperationsState(operations);

            const fotoPendingGroup = groupAfterComprovante.filter((operation) => operation.status === 'foto_pending');
            if (fotoPendingGroup.length > 0) {
              await sincronizarFotoComprovanteOffline(fotoPendingGroup);
              operations = replaceOperations(operations, fotoPendingGroup.map(applyDeliveryPhotoUploaded));
            }
          } catch (error) {
            const failedGroup = currentGroup.map(
              (operation) => operations.find((candidate) => candidate.id === operation.id) || operation,
            );
            operations = replaceOperations(
              operations,
              failedGroup.map((operation) => applySyncError(operation, error, Date.now())),
            );
          }

          operations = await saveDeliveryOutboxOperations(operations);
          applyOperationsState(operations);
          setSyncVersion((version) => version + 1);
        }
      }

      operations = await saveDeliveryOutboxOperations(operations);
      applyOperationsState(operations);

      try {
        const result = await syncRemoteDeliveryChanges();
        if (result.appliedItems > 0) {
          setSyncVersion((version) => version + 1);
        }
      } catch (error) {
        console.error('Erro ao aplicar mudancas remotas de entregas:', error);
      }
    } catch (error) {
      console.error('Erro durante sincronizacao offline:', error);
      const message = error instanceof Error ? error.message : 'Falha ao sincronizar entregas.';
      setLastSyncError(message);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      setSyncVersion((version) => version + 1);
    }
  }, [applyOperationsState]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true;

      setIsOnline((wasOnline) => {
        if (online && !wasOnline) {
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }

          syncTimeoutRef.current = setTimeout(() => {
            const elapsed = Date.now() - lastSyncTimestampRef.current;
            if (elapsed > 5000) {
              syncPendingOperations();
            }
          }, 3000);
        }

        return online;
      });
    });

    refreshOfflineState();

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [refreshOfflineState, syncPendingOperations]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingOperations,
        failedOperations,
        totalOperations,
        isSyncing,
        lastSyncError,
        lastSyncAt,
        syncVersion,
        addOperation,
        syncPendingOperations,
        refreshOfflineState,
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

function replaceOperation(
  operations: DeliveryOutboxOperation[],
  replacement: DeliveryOutboxOperation,
): DeliveryOutboxOperation[] {
  return operations.map((operation) => (operation.id === replacement.id ? replacement : operation));
}

function replaceOperations(
  operations: DeliveryOutboxOperation[],
  replacements: DeliveryOutboxOperation[],
): DeliveryOutboxOperation[] {
  const replacementsById = new Map(replacements.map((operation) => [operation.id, operation]));
  return operations.map((operation) => replacementsById.get(operation.id) || operation);
}

function groupComprovanteOperations(
  operations: DeliveryOutboxOperation[],
): DeliveryOutboxOperation[][] {
  const groups = new Map<string, DeliveryOutboxOperation[]>();

  for (const operation of operations) {
    const comprovanteData = operation.comprovanteData;
    if (!comprovanteData) {
      continue;
    }

    const key =
      comprovanteData.batch_id ||
      `${comprovanteData.escola_id}:${comprovanteData.nome_quem_entregou}:${comprovanteData.nome_quem_recebeu}:${Math.floor(
        operation.timestamp / 60000,
      )}`;
    const current = groups.get(key) || [];
    current.push(operation);
    groups.set(key, current);
  }

  return Array.from(groups.values());
}

async function criarComprovanteOffline(operations: DeliveryOutboxOperation[]): Promise<number | null> {
  const firstOperation = operations[0];
  const firstComprovante = firstOperation.comprovanteData;

  if (!firstComprovante) {
    return null;
  }

  const tokenData = await AsyncStorage.getItem('token');
  const token = tokenData ? JSON.parse(tokenData).token : null;

  if (!token) {
    throw buildFetchError(401, { error: 'Sessao expirada. Faca login novamente para sincronizar.' });
  }

  const comprovanteData = {
    escola_id: firstComprovante.escola_id,
    nome_quem_entregou: firstComprovante.nome_quem_entregou,
    nome_quem_recebeu: firstComprovante.nome_quem_recebeu,
    observacao: firstComprovante.observacao,
    assinatura_base64: firstComprovante.assinatura_base64,
    itens: operations.map((operation) => ({
      historico_entrega_id: operation.historicoId!,
      produto_nome: operation.comprovanteData!.produto_nome,
      quantidade_entregue: operation.comprovanteData!.quantidade_entregue,
      unidade: operation.comprovanteData!.unidade || '',
      lote: operation.comprovanteData!.lote,
    })),
  };

  const response = await fetch(`${API_URL}/entregas/comprovantes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(comprovanteData),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let body: unknown = { error: bodyText || 'Erro ao criar comprovante.' };
    try {
      body = JSON.parse(bodyText);
    } catch {
      // Keep plain-text response.
    }

    throw buildFetchError(response.status, body);
  }

  const body = await response.json();
  return Number(body?.id || body?.comprovante?.id || 0) || null;
}

async function sincronizarFotoComprovanteOffline(operations: DeliveryOutboxOperation[]): Promise<void> {
  const operationWithPhoto = operations.find(
    (operation) => operation.comprovanteId && operation.comprovanteData?.foto_local_uri,
  );
  const comprovanteId = operationWithPhoto?.comprovanteId;
  const foto = operationWithPhoto?.comprovanteData;

  if (!comprovanteId || !foto?.foto_local_uri || !foto.foto_content_type || !foto.foto_size_bytes) {
    return;
  }

  const uploadTarget = await solicitarFotoComprovanteUploadUrl(comprovanteId, {
    content_type: foto.foto_content_type,
    size_bytes: foto.foto_size_bytes,
  });

  await uploadDeliveryPhotoToSignedUrl({
    localUri: foto.foto_local_uri,
    uploadUrl: uploadTarget.upload_url,
    token: uploadTarget.upload_token,
    headers: uploadTarget.headers,
  });

  await confirmarFotoComprovanteUpload(comprovanteId, {
    storage_key: uploadTarget.storage_key,
  });
}

function buildFetchError(status: number, data: unknown): Error {
  const message =
    typeof data === 'object' && data && 'error' in data
      ? String((data as { error?: unknown }).error)
      : `Erro HTTP ${status}`;
  const error = new Error(message) as Error & { response?: { status: number; data: unknown } };
  error.response = { status, data };
  return error;
}
