import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConfirmarEntregaData } from '../api/rotas';
import {
  getOutboxSummary,
  normalizeOutboxOperations,
  type DeliveryComprovanteData,
  type DeliveryOutboxOperation,
  type DeliveryOutboxSummary,
} from './deliveryOutboxCore';

const OUTBOX_STORAGE_KEY = 'offline_queue';

export function createDeliveryBatchId(): string {
  return `${Date.now()}_batch_${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadDeliveryOutboxOperations(): Promise<DeliveryOutboxOperation[]> {
  try {
    const rawQueue = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!rawQueue) {
      return [];
    }

    const parsed = JSON.parse(rawQueue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return normalizeOutboxOperations(parsed);
  } catch (error) {
    console.error('Erro ao carregar outbox de entregas:', error);
    return [];
  }
}

export async function saveDeliveryOutboxOperations(
  operations: DeliveryOutboxOperation[],
): Promise<DeliveryOutboxOperation[]> {
  const openOperations = operations.filter((operation) => operation.status !== 'synced');
  await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(openOperations));
  return openOperations;
}

export async function getDeliveryOutboxSummary(now = Date.now()): Promise<DeliveryOutboxSummary> {
  const operations = await loadDeliveryOutboxOperations();
  return getOutboxSummary(operations, now);
}

export async function enqueueDeliveryOperation(
  itemId: number,
  data: ConfirmarEntregaData,
  comprovanteData?: DeliveryComprovanteData,
): Promise<DeliveryOutboxOperation> {
  const operations = await loadDeliveryOutboxOperations();
  const clientOperationId =
    data.client_operation_id || `${Date.now()}_${itemId}_${Math.random().toString(36).slice(2, 11)}`;
  const dataWithOperationId = {
    ...data,
    client_operation_id: clientOperationId,
  };

  const existingOperation = operations.find(
    (operation) =>
      operation.status !== 'synced' &&
      (operation.id === clientOperationId || operation.data.client_operation_id === clientOperationId),
  );

  if (existingOperation) {
    return existingOperation;
  }

  const newOperation: DeliveryOutboxOperation = {
    id: clientOperationId,
    type: 'confirmar_entrega',
    itemId,
    data: dataWithOperationId,
    timestamp: Date.now(),
    status: 'pending',
    attemptCount: 0,
    comprovanteData,
  };

  await saveDeliveryOutboxOperations([...operations, newOperation]);
  return newOperation;
}
