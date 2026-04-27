import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteSchoolProjections, upsertRouteSchoolProjection } from './deliveryRouteProjectionCore';

test('buildRouteSchoolProjections keeps route school metadata and embeds projection list', () => {
  const routeSchools = [
    { escola_id: 10, escola_nome: 'Escola A', escola_endereco: 'Rua 1', ordem: 1 },
    { escola_id: 11, escola_nome: 'Escola B', escola_endereco: 'Rua 2', ordem: 2 },
  ];
  const projectionsBySchool = new Map([
    [10, [{ id: 1, entrega_confirmada: false }]],
    [11, [{ id: 2, entrega_confirmada: true }]],
  ]);

  const result = buildRouteSchoolProjections(routeSchools, projectionsBySchool);

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    escola_id: 10,
    escola_nome: 'Escola A',
    escola_endereco: 'Rua 1',
    ordem: 1,
    projections: [{ id: 1, entrega_confirmada: false }],
  });
  assert.equal(result[1].projections[0].id, 2);
});

test('upsertRouteSchoolProjection replaces only the changed school and preserves order', () => {
  const current = [
    { escola_id: 10, escola_nome: 'Escola A', ordem: 1, projections: [{ id: 1, entrega_confirmada: false }] },
    { escola_id: 11, escola_nome: 'Escola B', ordem: 2, projections: [{ id: 2, entrega_confirmada: false }] },
  ];

  const result = upsertRouteSchoolProjection(current, {
    escola_id: 11,
    escola_nome: 'Escola B',
    ordem: 2,
    projections: [{ id: 2, entrega_confirmada: true }],
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].escola_id, 10);
  assert.equal(result[1].escola_id, 11);
  assert.equal(result[1].projections[0].entrega_confirmada, true);
});

test('upsertRouteSchoolProjection appends school when route snapshot does not contain it yet', () => {
  const current = [{ escola_id: 10, escola_nome: 'Escola A', ordem: 1, projections: [] }];

  const result = upsertRouteSchoolProjection(current, {
    escola_id: 12,
    escola_nome: 'Escola C',
    ordem: 3,
    projections: [{ id: 3, entrega_confirmada: false }],
  });

  assert.equal(result.length, 2);
  assert.equal(result[1].escola_id, 12);
});
