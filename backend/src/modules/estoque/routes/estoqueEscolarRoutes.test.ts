import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import estoqueEscolarRoutes from './estoqueEscolarRoutes';

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = estoqueEscolarRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || '<anonymous>');
}

describe('estoqueEscolarRoutes auth contract', () => {
  it('uses JWT authentication for school stock reads', () => {
    assert.deepEqual(routeMiddlewareNames('/escolas/:escolaId', 'get').slice(0, 1), [
      'authenticateToken',
    ]);
  });

  it('uses JWT authentication for school stock writes', () => {
    assert.deepEqual(routeMiddlewareNames('/escolas/:escolaId/movimentacoes', 'post').slice(0, 1), [
      'authenticateToken',
    ]);
  });
});
