import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSolicitacaoItemData,
  canRespondToSolicitacaoStatus,
} from './solicitacoesAlimentosController';

describe('solicitacoesAlimentosController helpers', () => {
  it('allows responses only while a solicitation is pending or partial', () => {
    assert.equal(canRespondToSolicitacaoStatus('pendente'), true);
    assert.equal(canRespondToSolicitacaoStatus('parcial'), true);
    assert.equal(canRespondToSolicitacaoStatus('cancelada'), false);
    assert.equal(canRespondToSolicitacaoStatus('concluida'), false);
  });

  it('uses the official product unit when creating solicitation items', () => {
    const item = buildSolicitacaoItemData(
      { produto_id: 15, nome_produto: 'Ovo digitado', quantidade: '1', unidade: 'Cuba' },
      { id: 15, nome: 'Ovo De Galinha', unidade: 'UNIDADE' },
    );

    assert.deepEqual(item, {
      produto_id: 15,
      nome_produto: 'Ovo De Galinha',
      quantidade: 1,
      unidade: 'UNIDADE',
    });
  });

  it('requires a catalog product to avoid free unit requests', () => {
    assert.throws(
      () => buildSolicitacaoItemData({ nome_produto: 'Ovo De Galinha', quantidade: 1, unidade: 'Cuba' }, null),
      /Selecione um produto cadastrado/,
    );
  });
});
