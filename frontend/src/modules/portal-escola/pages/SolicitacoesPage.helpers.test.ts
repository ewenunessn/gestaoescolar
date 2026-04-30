import { describe, expect, it } from 'vitest';

import { buildNovoItemSolicitacao, getProdutoUnidadeSolicitacao } from './SolicitacoesPage.helpers';

describe('SolicitacoesPage helpers', () => {
  it('builds requested items with the catalog product unit', () => {
    const item = buildNovoItemSolicitacao(
      { id: 15, nome: 'Ovo De Galinha', unidade: 'UNIDADE' },
      1,
    );

    expect(item).toEqual({
      produto_id: 15,
      nome_produto: 'Ovo De Galinha',
      quantidade: 1,
      unidade: 'UNIDADE',
    });
  });

  it('falls back to UN when a product has no unit code', () => {
    expect(getProdutoUnidadeSolicitacao({})).toBe('UN');
  });
});
