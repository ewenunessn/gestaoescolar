import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../../../database';
import { listarProdutosPorRefeicoes } from './refeicaoProdutoController';

test('listarProdutosPorRefeicoes groups products for multiple meals using one database query', async () => {
  const originalQuery = db.query;
  const calls: Array<{ sql: string; params: unknown[] }> = [];

  (db as any).query = async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });

    if (calls.length > 1) {
      throw new Error('batch product listing should use one query');
    }

    return {
      rows: [
        {
          id: 7,
          refeicao_id: 10,
          produto_id: 30,
          per_capita: '120',
          tipo_medida: 'gramas',
          produto: { id: 30, nome: 'Arroz', unidade: 'KG', fator_correcao: '1', ativo: true },
          per_capita_por_modalidade: null,
        },
        {
          id: 8,
          refeicao_id: 11,
          produto_id: 31,
          per_capita: '80',
          tipo_medida: 'gramas',
          produto: { id: 31, nome: 'Feijao', unidade: 'KG', fator_correcao: '1', ativo: true },
          per_capita_por_modalidade: [],
        },
      ],
    };
  };

  try {
    const response = await invokeListarProdutosPorRefeicoes('10,11,10,abc');

    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /ANY\(\$1::int\[\]\)/);
    assert.deepEqual(calls[0].params, [[10, 11]]);
    assert.deepEqual(response, {
      '10': [
        {
          id: 7,
          refeicao_id: 10,
          produto_id: 30,
          per_capita: '120',
          tipo_medida: 'gramas',
          produto: { id: 30, nome: 'Arroz', unidade: 'KG', fator_correcao: '1', ativo: true },
          per_capita_por_modalidade: null,
        },
      ],
      '11': [
        {
          id: 8,
          refeicao_id: 11,
          produto_id: 31,
          per_capita: '80',
          tipo_medida: 'gramas',
          produto: { id: 31, nome: 'Feijao', unidade: 'KG', fator_correcao: '1', ativo: true },
          per_capita_por_modalidade: [],
        },
      ],
    });
  } finally {
    (db as any).query = originalQuery;
  }
});

function invokeListarProdutosPorRefeicoes(ids: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const res = {
      json: (body: any) => {
        resolve(body);
        return res;
      },
      status: () => res,
    };

    listarProdutosPorRefeicoes({ query: { ids } } as any, res as any).catch(reject);
  });
}
