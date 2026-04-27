import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDeliveryAccepted,
  classifySyncError,
  getOutboxSummary,
  mergeItemsWithOutbox,
  type DeliveryOutboxOperation,
} from './deliveryOutboxCore';
import type { ItemEntrega } from '../api/rotas';

const baseOperation: DeliveryOutboxOperation = {
  id: 'op-1',
  type: 'confirmar_entrega',
  itemId: 10,
  timestamp: 1_000,
  status: 'pending',
  attemptCount: 0,
  data: {
    quantidade_entregue: 5,
    nome_quem_entregou: 'Entregador',
    nome_quem_recebeu: 'Recebedor',
    client_operation_id: 'op-1',
  },
  comprovanteData: {
    escola_id: 7,
    escola_nome: 'Escola Central',
    nome_quem_entregou: 'Entregador',
    nome_quem_recebeu: 'Recebedor',
    produto_nome: 'Arroz',
    quantidade_entregue: 5,
    unidade: 'kg',
  },
};

test('summary retries failed and stale syncing operations used by manual sync', () => {
  const now = 10 * 60 * 1_000;
  const summary = getOutboxSummary(
    [
      { ...baseOperation, id: 'failed', status: 'failed_retryable', lastError: '500' },
      { ...baseOperation, id: 'stale-sync', status: 'syncing', lastAttemptAt: now - 6 * 60 * 1_000 },
      { ...baseOperation, id: 'action', status: 'failed_needs_action', lastError: 'saldo insuficiente' },
      { ...baseOperation, id: 'synced', status: 'synced' },
    ],
    now,
  );

  assert.equal(summary.pendingOperations, 2);
  assert.equal(summary.failedOperations, 1);
  assert.equal(summary.totalOpenOperations, 3);
  assert.equal(summary.lastError, 'saldo insuficiente');
});

test('merge applies local pending deliveries over cached server items', () => {
  const serverItems: ItemEntrega[] = [
    {
      id: 10,
      produto_nome: 'Arroz',
      quantidade: 5,
      unidade: 'kg',
      entrega_confirmada: false,
      quantidade_ja_entregue: 0,
      saldo_pendente: 5,
      historico_entregas: [],
    },
  ];
  const merged = mergeItemsWithOutbox(
    serverItems,
    [baseOperation],
    { escolaId: 7 },
  );

  assert.equal(merged[0].entrega_confirmada, true);
  assert.equal(merged[0].quantidade_ja_entregue, 5);
  assert.equal(merged[0].saldo_pendente, 0);
  assert.equal(merged[0].offline_status, 'pending');
  assert.equal(merged[0].historico_entregas?.[0].nome_quem_recebeu, 'Recebedor');
});

test('delivery accepted keeps operation open until comprovante is created', () => {
  const updated = applyDeliveryAccepted(baseOperation, 99);

  assert.equal(updated.status, 'comprovante_pending');
  assert.equal(updated.historicoId, 99);
});

test('sync error classification separates retryable server errors from action errors', () => {
  assert.equal(classifySyncError({ response: { status: 500, data: { error: 'falha' } } }).status, 'failed_retryable');
  assert.equal(classifySyncError({ response: { status: 400, data: { error: 'saldo insuficiente' } } }).status, 'failed_needs_action');
  assert.equal(classifySyncError({ message: 'Network Error' }).status, 'failed_retryable');
});
