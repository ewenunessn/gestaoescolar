import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../database';
import { criarNotificacao } from './notificacoesHelper';

test('criarNotificacao inserts notifications for explicit users with one query', async () => {
  const originalQuery = db.query;
  const calls: Array<{ sql: string; params: unknown[] }> = [];

  (db as any).query = async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });

    if (calls.length > 1) {
      throw new Error('notification creation should batch inserts in one query');
    }

    return { rows: [], rowCount: 3 };
  };

  try {
    await criarNotificacao({
      tipo: 'solicitacao_alimentos',
      titulo: 'Nova solicitacao',
      mensagem: 'Escola enviou solicitacao',
      link: '/solicitacoes-alimentos',
      usuarioIds: [1, 2, 3],
    });

    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /UNNEST\(\$1::int\[\]\)/);
    assert.deepEqual(calls[0].params, [
      [1, 2, 3],
      'solicitacao_alimentos',
      'Nova solicitacao',
      'Escola enviou solicitacao',
      '/solicitacoes-alimentos',
    ]);
  } finally {
    (db as any).query = originalQuery;
  }
});
