import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../../../database';
import { listarFuncoes } from './adminUsuariosController';

test('listarFuncoes returns roles with permissions using one database query', async () => {
  const originalQuery = db.query;
  const calls: string[] = [];
  const createdAt = '2026-04-01T00:00:00.000Z';
  const updatedAt = '2026-04-02T00:00:00.000Z';

  (db as any).query = async (sql: string) => {
    calls.push(sql);

    if (calls.length === 1) {
      return {
        rows: [
          { id: 2, nome: 'Operador', descricao: null, ativo: true, created_at: createdAt, updated_at: updatedAt, modulo_id: 10, modulo_nome: 'Compras', modulo_slug: 'compras', nivel_permissao_id: 2, nivel_nome: 'Escrita', nivel_slug: 'escrita', nivel: 2 },
          { id: 2, nome: 'Operador', descricao: null, ativo: true, created_at: createdAt, updated_at: updatedAt, modulo_id: 11, modulo_nome: 'Guias', modulo_slug: 'guias', nivel_permissao_id: 1, nivel_nome: 'Leitura', nivel_slug: 'leitura', nivel: 1 },
          { id: 1, nome: 'Sem permissao', descricao: 'Basico', ativo: true, created_at: createdAt, updated_at: updatedAt, modulo_id: null, modulo_nome: null, modulo_slug: null, nivel_permissao_id: null, nivel_nome: null, nivel_slug: null, nivel: null },
        ],
      };
    }

    throw new Error('listarFuncoes should not query permissions per role');
  };

  try {
    const response = await invokeListarFuncoes();

    assert.equal(calls.length, 1);
    assert.equal(response.success, true);
    assert.deepEqual(response.data, [
      {
        id: 2,
        nome: 'Operador',
        descricao: null,
        ativo: true,
        created_at: createdAt,
        updated_at: updatedAt,
        permissoes: [
          { modulo_id: 10, modulo_nome: 'Compras', modulo_slug: 'compras', nivel_permissao_id: 2, nivel_nome: 'Escrita', nivel_slug: 'escrita', nivel: 2 },
          { modulo_id: 11, modulo_nome: 'Guias', modulo_slug: 'guias', nivel_permissao_id: 1, nivel_nome: 'Leitura', nivel_slug: 'leitura', nivel: 1 },
        ],
      },
      {
        id: 1,
        nome: 'Sem permissao',
        descricao: 'Basico',
        ativo: true,
        created_at: createdAt,
        updated_at: updatedAt,
        permissoes: [],
      },
    ]);
  } finally {
    (db as any).query = originalQuery;
  }
});

function invokeListarFuncoes(): Promise<any> {
  return new Promise((resolve, reject) => {
    const res = {
      json: (body: any) => {
        resolve(body);
        return res;
      },
      status: () => res,
    };

    listarFuncoes({} as any, res as any, reject);
  });
}
