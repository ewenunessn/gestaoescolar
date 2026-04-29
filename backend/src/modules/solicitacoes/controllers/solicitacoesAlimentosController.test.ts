import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canRespondToSolicitacaoStatus } from './solicitacoesAlimentosController';

describe('solicitacoesAlimentosController helpers', () => {
  it('allows responses only while a solicitation is pending or partial', () => {
    assert.equal(canRespondToSolicitacaoStatus('pendente'), true);
    assert.equal(canRespondToSolicitacaoStatus('parcial'), true);
    assert.equal(canRespondToSolicitacaoStatus('cancelada'), false);
    assert.equal(canRespondToSolicitacaoStatus('concluida'), false);
  });
});
