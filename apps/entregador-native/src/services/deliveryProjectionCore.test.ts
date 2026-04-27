import test from 'node:test';
import assert from 'node:assert/strict';
import type { ItemEntrega } from '../api/rotas';
import {
  buildSchoolItemProjections,
  countPendingItemsFromProjection,
  hasPendingItemsFromProjection,
  isSchoolFullyDeliveredOnDateFromProjection,
} from './deliveryProjectionCore';

const projectedItems: ItemEntrega[] = [
  {
    id: 1,
    produto_nome: 'Arroz',
    quantidade: 10,
    unidade: 'kg',
    entrega_confirmada: false,
    saldo_pendente: 10,
    historico_entregas: [],
  },
  {
    id: 2,
    produto_nome: 'Feijao',
    quantidade: 5,
    unidade: 'kg',
    entrega_confirmada: true,
    saldo_pendente: 0,
    data_entrega: '2026-04-27T09:00:00.000Z',
    historico_entregas: [
      {
        id: 20,
        quantidade_entregue: 5,
        nome_quem_entregou: 'Ewerton',
        nome_quem_recebeu: 'Escola',
        data_entrega: '2026-04-27T09:00:00.000Z',
      },
    ],
  },
  {
    id: 3,
    produto_nome: 'Macarrao',
    quantidade: 8,
    unidade: 'kg',
    entrega_confirmada: true,
    saldo_pendente: 2,
    data_entrega: '2026-04-20T09:00:00.000Z',
    historico_entregas: [
      {
        id: 30,
        quantidade_entregue: 6,
        nome_quem_entregou: 'Ewerton',
        nome_quem_recebeu: 'Escola',
        data_entrega: '2026-04-20T09:00:00.000Z',
      },
    ],
  },
];

test('buildSchoolItemProjections keeps only fields needed for list projections', () => {
  const projections = buildSchoolItemProjections(projectedItems);

  assert.deepEqual(projections[0], {
    id: 1,
    entrega_confirmada: false,
    saldo_pendente: 10,
    data_entrega: undefined,
    latest_historico_entrega_date: undefined,
  });
  assert.equal(projections[1].latest_historico_entrega_date, '2026-04-27T09:00:00.000Z');
});

test('countPendingItemsFromProjection follows current filter behavior without full item payload', () => {
  const projections = buildSchoolItemProjections(projectedItems);
  const filtro = {
    dataInicio: '2026-04-27T00:00:00.000Z',
    dataFim: '2026-04-27T23:59:59.999Z',
  };

  assert.equal(countPendingItemsFromProjection(projections), 2);
  assert.equal(countPendingItemsFromProjection(projections, filtro), 1);
  assert.equal(hasPendingItemsFromProjection(projections, filtro), true);
});

test('isSchoolFullyDeliveredOnDateFromProjection only returns true when every item closed on that date', () => {
  const projections = buildSchoolItemProjections(projectedItems);
  const fullyDelivered = buildSchoolItemProjections([
    {
      id: 10,
      produto_nome: 'Arroz',
      quantidade: 4,
      unidade: 'kg',
      entrega_confirmada: true,
      saldo_pendente: 0,
      historico_entregas: [
        {
          id: 100,
          quantidade_entregue: 4,
          nome_quem_entregou: 'Ewerton',
          nome_quem_recebeu: 'Escola',
          data_entrega: '2026-04-27T11:00:00.000Z',
        },
      ],
    },
    {
      id: 11,
      produto_nome: 'Feijao',
      quantidade: 4,
      unidade: 'kg',
      entrega_confirmada: true,
      saldo_pendente: 0,
      historico_entregas: [
        {
          id: 101,
          quantidade_entregue: 4,
          nome_quem_entregou: 'Ewerton',
          nome_quem_recebeu: 'Escola',
          data_entrega: '2026-04-27T12:00:00.000Z',
        },
      ],
    },
  ]);

  assert.equal(isSchoolFullyDeliveredOnDateFromProjection(projections, new Date('2026-04-27T00:00:00.000Z')), false);
  assert.equal(
    isSchoolFullyDeliveredOnDateFromProjection(fullyDelivered, new Date('2026-04-27T00:00:00.000Z')),
    true,
  );
});
