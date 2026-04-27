import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupItemsBySchool,
  mergeChangedItemsIntoCachedItems,
  type ItemEntregaWithEscola,
} from './deliveryIncrementalSyncCore';
import type { ItemEntrega } from '../api/rotas';

const cachedItems: ItemEntrega[] = [
  { id: 1, escola_id: 10, produto_nome: 'Arroz', quantidade: 5, unidade: 'kg' } as ItemEntrega,
  { id: 2, escola_id: 10, produto_nome: 'Feijao', quantidade: 2, unidade: 'kg' } as ItemEntrega,
];

test('mergeChangedItemsIntoCachedItems replaces only changed item and preserves order', () => {
  const merged = mergeChangedItemsIntoCachedItems(cachedItems, [
    { id: 2, escola_id: 10, produto_nome: 'Feijao', quantidade: 2, unidade: 'kg', entrega_confirmada: true } as ItemEntrega,
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 1);
  assert.equal(merged[1].entrega_confirmada, true);
});

test('groupItemsBySchool groups changed items by escola_id', () => {
  const groups = groupItemsBySchool([
    { id: 1, escola_id: 10, produto_nome: 'Arroz', quantidade: 5, unidade: 'kg' } as ItemEntregaWithEscola,
    { id: 2, escola_id: 11, produto_nome: 'Feijao', quantidade: 2, unidade: 'kg' } as ItemEntregaWithEscola,
    { id: 3, escola_id: 10, produto_nome: 'Macarrao', quantidade: 1, unidade: 'kg' } as ItemEntregaWithEscola,
  ]);

  assert.equal(groups.get(10)?.length, 2);
  assert.equal(groups.get(11)?.length, 1);
});
