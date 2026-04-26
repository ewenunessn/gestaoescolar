import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRelatorioAlunosHistoricoParams,
  normalizeHistoricoRow,
} from './escolaModalidadeHistoricoService';

describe('escolaModalidadeHistoricoService', () => {
  it('builds a parameterized report filter using today when no date is provided', () => {
    const params = buildRelatorioAlunosHistoricoParams({});

    assert.equal(params.values.length, 1);
    assert.match(String(params.values[0]), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(params.whereSql, /h\.vigente_de <= \$1::date/);
  });

  it('adds escola and modalidade filters with parameter placeholders', () => {
    const params = buildRelatorioAlunosHistoricoParams({
      data_referencia: '2026-02-01',
      escola_id: '10',
      modalidade_id: '20',
    });

    assert.deepEqual(params.values, ['2026-02-01', 10, 20]);
    assert.match(params.whereSql, /h\.escola_id = \$2/);
    assert.match(params.whereSql, /h\.modalidade_id = \$3/);
  });

  it('defaults the report to active schools and accepts inactive schools explicitly', () => {
    const activeParams = buildRelatorioAlunosHistoricoParams({});
    const inactiveParams = buildRelatorioAlunosHistoricoParams({ escola_ativo: 'false' });
    const allParams = buildRelatorioAlunosHistoricoParams({ escola_ativo: 'todas' });

    assert.equal(activeParams.escolaAtivoWhereSql, 'e.ativo = true');
    assert.equal(inactiveParams.escolaAtivoWhereSql, 'e.ativo = false');
    assert.equal(allParams.escolaAtivoWhereSql, 'TRUE');
  });

  it('ignores invalid numeric filters instead of interpolating them into SQL', () => {
    const params = buildRelatorioAlunosHistoricoParams({
      data_referencia: '2026-02-01',
      escola_id: 'abc',
      modalidade_id: '20; DROP TABLE escolas;',
    });

    assert.deepEqual(params.values, ['2026-02-01']);
    assert.doesNotMatch(params.whereSql, /DROP TABLE/);
  });

  it('normalizes postgres numeric fields to numbers', () => {
    const row = normalizeHistoricoRow({
      escola_id: '1',
      modalidade_id: '2',
      quantidade_alunos: '35',
      total_escolas: '4',
      total_modalidades: '3',
      total_geral: '350',
    });

    assert.equal(row.escola_id, 1);
    assert.equal(row.modalidade_id, 2);
    assert.equal(row.quantidade_alunos, 35);
    assert.equal(row.total_escolas, 4);
    assert.equal(row.total_modalidades, 3);
    assert.equal(row.total_geral, 350);
  });
});
