import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import disparosNotificacaoRoutes from './disparosNotificacaoRoutes';

function routeMiddlewareNames(path: string, method: string): string[] {
  const layer = disparosNotificacaoRoutes.stack.find((item: any) => (
    item.route?.path === path && item.route?.methods?.[method]
  )) as any;

  assert.ok(layer, `Route ${method.toUpperCase()} ${path} should exist`);
  return layer.route.stack.map((item: any) => item.handle.name || '<anonymous>');
}

describe('disparosNotificacaoRoutes authorization contract', () => {
  it('requires authentication and notifications write permission for creating notification broadcasts', () => {
    assert.deepEqual(routeMiddlewareNames('/', 'post').slice(0, 2), [
      'authenticateToken',
      'requireNotificacoesWrite',
    ]);
  });

  it('requires authentication and notifications read permission for listing notification broadcasts', () => {
    assert.deepEqual(routeMiddlewareNames('/', 'get').slice(0, 2), [
      'authenticateToken',
      'requireNotificacoesRead',
    ]);
  });
});
