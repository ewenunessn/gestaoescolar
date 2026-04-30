import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSolicitacaoAnalysisUnit } from './SolicitacaoEmergencialService';

describe('SolicitacaoEmergencialService helpers', () => {
  it('prefers the official product unit over the unit stored in an old request', () => {
    assert.equal(
      resolveSolicitacaoAnalysisUnit({ unidade: 'Cuba', produto_unidade: 'UNIDADE' }),
      'UNIDADE',
    );
  });

  it('falls back to the stored request unit when the product unit is unavailable', () => {
    assert.equal(
      resolveSolicitacaoAnalysisUnit({ unidade: 'Kg', produto_unidade: null }),
      'Kg',
    );
  });
});
