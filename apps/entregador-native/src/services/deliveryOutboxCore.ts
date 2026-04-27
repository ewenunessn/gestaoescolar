import type { ConfirmarEntregaData, ItemEntrega } from '../api/rotas';

export const STALE_SYNCING_MS = 2 * 60 * 1000;

export type DeliveryOutboxStatus =
  | 'pending'
  | 'syncing'
  | 'failed_retryable'
  | 'failed_needs_action'
  | 'comprovante_pending'
  | 'synced';

type LegacyDeliveryOutboxStatus = DeliveryOutboxStatus | 'failed';

export interface DeliveryComprovanteData {
  escola_id: number;
  escola_nome?: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string;
  assinatura_base64?: string;
  produto_nome: string;
  quantidade_entregue: number;
  unidade?: string;
  lote?: string;
  batch_id?: string;
}

export interface DeliveryOutboxOperation {
  id: string;
  type: 'confirmar_entrega';
  itemId: number;
  data: ConfirmarEntregaData;
  timestamp: number;
  status: DeliveryOutboxStatus;
  attemptCount: number;
  lastAttemptAt?: number;
  lastError?: string;
  historicoId?: number;
  comprovanteData?: DeliveryComprovanteData;
}

export interface DeliveryOutboxSummary {
  pendingOperations: number;
  syncingOperations: number;
  failedOperations: number;
  comprovantePendingOperations: number;
  totalOpenOperations: number;
  lastError?: string;
}

export interface OfflineItemFields {
  offline_status?: DeliveryOutboxStatus;
  offline_error?: string;
  offline_operation_id?: string;
}

export interface PendingComprovanteDraft {
  id: number;
  numero_comprovante: string;
  escola_nome: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  data_entrega: string;
  observacao?: string;
  assinatura_base64?: string;
  total_itens: number;
  itens: Array<{
    produto_nome: string;
    quantidade_entregue: number;
    unidade: string;
    lote?: string;
  }>;
  offline_status: DeliveryOutboxStatus;
  offline_error?: string;
  client_operation_ids: string[];
}

export interface SyncErrorClassification {
  status: 'failed_retryable' | 'failed_needs_action';
  message: string;
  httpStatus?: number;
}

export function normalizeOutboxOperations(rawOperations: unknown[]): DeliveryOutboxOperation[] {
  return rawOperations
    .filter((operation): operation is Record<string, any> => !!operation && typeof operation === 'object')
    .map((operation) => {
      const legacyStatus = operation.status as LegacyDeliveryOutboxStatus | undefined;
      const status: DeliveryOutboxStatus =
        legacyStatus === 'failed' ? 'failed_retryable' : legacyStatus || 'pending';
      const clientOperationId =
        operation.data?.client_operation_id ||
        operation.id ||
        `${operation.timestamp || Date.now()}_${operation.itemId || 'item'}`;

      return {
        id: String(operation.id || clientOperationId),
        type: 'confirmar_entrega' as const,
        itemId: Number(operation.itemId),
        data: {
          ...(operation.data || {}),
          client_operation_id: String(clientOperationId),
        },
        timestamp: Number(operation.timestamp || Date.now()),
        status,
        attemptCount: Number(operation.attemptCount || 0),
        lastAttemptAt: operation.lastAttemptAt ? Number(operation.lastAttemptAt) : undefined,
        lastError: operation.lastError ? String(operation.lastError) : undefined,
        historicoId: operation.historicoId ? Number(operation.historicoId) : undefined,
        comprovanteData: operation.comprovanteData,
      };
    })
    .filter((operation) => Number.isFinite(operation.itemId) && operation.data.quantidade_entregue > 0);
}

export function getOutboxSummary(
  operations: DeliveryOutboxOperation[],
  now = Date.now(),
): DeliveryOutboxSummary {
  return operations.reduce<DeliveryOutboxSummary>(
    (summary, operation) => {
      if (operation.status === 'synced') {
        return summary;
      }

      summary.totalOpenOperations += 1;

      if (operation.status === 'failed_needs_action') {
        summary.failedOperations += 1;
        summary.lastError = operation.lastError || summary.lastError;
        return summary;
      }

      if (operation.status === 'syncing' && !isStaleSyncingOperation(operation, now)) {
        summary.syncingOperations += 1;
        return summary;
      }

      if (operation.status === 'comprovante_pending') {
        summary.comprovantePendingOperations += 1;
      }

      summary.pendingOperations += 1;
      summary.lastError = operation.lastError || summary.lastError;
      return summary;
    },
    {
      pendingOperations: 0,
      syncingOperations: 0,
      failedOperations: 0,
      comprovantePendingOperations: 0,
      totalOpenOperations: 0,
    },
  );
}

export function getSyncableOperations(
  operations: DeliveryOutboxOperation[],
  now = Date.now(),
): DeliveryOutboxOperation[] {
  return operations.filter((operation) => {
    if (operation.status === 'pending' || operation.status === 'failed_retryable') {
      return true;
    }

    if (operation.status === 'comprovante_pending') {
      return !!operation.historicoId && !!operation.comprovanteData;
    }

    return operation.status === 'syncing' && isStaleSyncingOperation(operation, now);
  });
}

export function markOperationsSyncing(
  operations: DeliveryOutboxOperation[],
  operationIds: string[],
  now = Date.now(),
): DeliveryOutboxOperation[] {
  const ids = new Set(operationIds);
  return operations.map((operation) => {
    if (!ids.has(operation.id)) {
      return operation;
    }

    return {
      ...operation,
      status: 'syncing',
      attemptCount: operation.attemptCount + 1,
      lastAttemptAt: now,
      lastError: undefined,
    };
  });
}

export function applyDeliveryAccepted(
  operation: DeliveryOutboxOperation,
  historicoId?: number,
): DeliveryOutboxOperation {
  if (operation.comprovanteData) {
    if (!historicoId) {
      return {
        ...operation,
        status: 'failed_retryable',
        lastError: 'Servidor confirmou a entrega sem retornar o historico da entrega.',
      };
    }

    return {
      ...operation,
      status: 'comprovante_pending',
      historicoId,
      lastError: undefined,
    };
  }

  return {
    ...operation,
    status: 'synced',
    historicoId,
    lastError: undefined,
  };
}

export function applyComprovanteCreated(operation: DeliveryOutboxOperation): DeliveryOutboxOperation {
  return {
    ...operation,
    status: 'synced',
    lastError: undefined,
  };
}

export function applySyncError(
  operation: DeliveryOutboxOperation,
  error: unknown,
  now = Date.now(),
): DeliveryOutboxOperation {
  const classification = classifySyncError(error);
  return {
    ...operation,
    status: classification.status,
    lastAttemptAt: now,
    lastError: classification.message,
  };
}

export function classifySyncError(error: any): SyncErrorClassification {
  const httpStatus = Number(error?.response?.status || error?.status || 0) || undefined;
  const message =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Falha ao sincronizar entrega.';

  if (!httpStatus || httpStatus === 408 || httpStatus === 429 || httpStatus >= 500) {
    return {
      status: 'failed_retryable',
      message: String(message),
      httpStatus,
    };
  }

  return {
    status: 'failed_needs_action',
    message: String(message),
    httpStatus,
  };
}

export function mergeItemsWithOutbox<T extends ItemEntrega>(
  items: T[],
  operations: DeliveryOutboxOperation[],
  options: { escolaId?: number } = {},
): Array<T & OfflineItemFields> {
  const visibleOperations = operations
    .filter((operation) => operation.status !== 'synced')
    .filter((operation) => {
      if (!options.escolaId || !operation.comprovanteData?.escola_id) {
        return true;
      }

      return operation.comprovanteData.escola_id === options.escolaId;
    })
    .sort((left, right) => left.timestamp - right.timestamp);

  const operationsByItem = new Map<number, DeliveryOutboxOperation[]>();
  for (const operation of visibleOperations) {
    const current = operationsByItem.get(operation.itemId) || [];
    current.push(operation);
    operationsByItem.set(operation.itemId, current);
  }

  return items.map((item) => {
    const itemOperations = operationsByItem.get(item.id);
    if (!itemOperations?.length) {
      return { ...item };
    }

    return itemOperations.reduce<T & OfflineItemFields>((merged, operation) => {
      const quantidadeEntregueAgora = Number(operation.data.quantidade_entregue || 0);
      const quantidadeJaEntregue = Number(merged.quantidade_ja_entregue || 0);
      const quantidadeOriginal = Number(merged.quantidade || 0);
      const saldoAtual =
        merged.saldo_pendente !== undefined && merged.saldo_pendente !== null
          ? Number(merged.saldo_pendente)
          : Math.max(0, quantidadeOriginal - quantidadeJaEntregue);
      const novoSaldo = Math.max(0, saldoAtual - quantidadeEntregueAgora);
      const historicoOffline = {
        id: -stableNumericId(operation.id),
        quantidade_entregue: quantidadeEntregueAgora,
        nome_quem_entregou: operation.data.nome_quem_entregou,
        nome_quem_recebeu: operation.data.nome_quem_recebeu,
        data_entrega: new Date(operation.timestamp).toISOString(),
        observacao: operation.data.observacao,
      };
      const historicoAtual = merged.historico_entregas || [];
      const historicoExiste = historicoAtual.some((historico) => historico.id === historicoOffline.id);

      return {
        ...merged,
        quantidade_ja_entregue: quantidadeJaEntregue + quantidadeEntregueAgora,
        saldo_pendente: novoSaldo,
        entrega_confirmada: novoSaldo <= 0.01,
        historico_entregas: historicoExiste ? historicoAtual : [...historicoAtual, historicoOffline],
        offline_status: operation.status,
        offline_error: operation.lastError,
        offline_operation_id: operation.id,
      };
    }, { ...item });
  });
}

export function buildPendingComprovanteDrafts(
  operations: DeliveryOutboxOperation[],
  options: { onlyDate?: string } = {},
): PendingComprovanteDraft[] {
  const operationsWithComprovante = operations
    .filter((operation) => operation.status !== 'synced')
    .filter((operation) => !!operation.comprovanteData)
    .filter((operation) => {
      if (!options.onlyDate) {
        return true;
      }

      return toDateOnly(operation.timestamp) === options.onlyDate;
    });

  const groups = new Map<string, DeliveryOutboxOperation[]>();
  for (const operation of operationsWithComprovante) {
    const comprovanteData = operation.comprovanteData!;
    const groupKey =
      comprovanteData.batch_id ||
      `${comprovanteData.escola_id}:${comprovanteData.nome_quem_entregou}:${comprovanteData.nome_quem_recebeu}:${Math.floor(
        operation.timestamp / 60000,
      )}`;
    const current = groups.get(groupKey) || [];
    current.push(operation);
    groups.set(groupKey, current);
  }

  return Array.from(groups.values()).map((group) => {
    const firstOperation = group[0];
    const firstComprovante = firstOperation.comprovanteData!;
    const worstStatus = chooseWorstStatus(group.map((operation) => operation.status));

    return {
      id: -stableNumericId(group.map((operation) => operation.id).join('|')),
      numero_comprovante:
        worstStatus === 'comprovante_pending'
          ? 'Comprovante aguardando envio'
          : 'Entrega aguardando sincronizacao',
      escola_nome: firstComprovante.escola_nome || `Escola ${firstComprovante.escola_id}`,
      nome_quem_entregou: firstComprovante.nome_quem_entregou,
      nome_quem_recebeu: firstComprovante.nome_quem_recebeu,
      data_entrega: new Date(firstOperation.timestamp).toISOString(),
      observacao: firstComprovante.observacao,
      assinatura_base64: firstComprovante.assinatura_base64,
      total_itens: group.length,
      itens: group.map((operation) => ({
        produto_nome: operation.comprovanteData!.produto_nome,
        quantidade_entregue: operation.comprovanteData!.quantidade_entregue,
        unidade: operation.comprovanteData!.unidade || '',
        lote: operation.comprovanteData!.lote,
      })),
      offline_status: worstStatus,
      offline_error: group.find((operation) => operation.lastError)?.lastError,
      client_operation_ids: group.map((operation) => operation.id),
    };
  });
}

function isStaleSyncingOperation(operation: DeliveryOutboxOperation, now: number): boolean {
  const startedAt = operation.lastAttemptAt || operation.timestamp;
  return now - startedAt > STALE_SYNCING_MS;
}

function stableNumericId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.max(1, Math.abs(hash));
}

function toDateOnly(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function chooseWorstStatus(statuses: DeliveryOutboxStatus[]): DeliveryOutboxStatus {
  if (statuses.includes('failed_needs_action')) return 'failed_needs_action';
  if (statuses.includes('failed_retryable')) return 'failed_retryable';
  if (statuses.includes('syncing')) return 'syncing';
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('comprovante_pending')) return 'comprovante_pending';
  return 'synced';
}
