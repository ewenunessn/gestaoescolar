import { describe, expect, it } from 'vitest';
import {
  getItemDecisionText,
  getSolicitacaoDefaultExpanded,
  summarizeSolicitacaoItems,
} from './SolicitacaoEscolaDetalhe.helpers';
import type { SolicitacaoItem } from '../../../services/solicitacoesAlimentos';

const itemBase: SolicitacaoItem = {
  id: 1,
  solicitacao_id: 10,
  nome_produto: 'Arroz Parbolizado Tipo 1',
  quantidade: 10,
  unidade: 'KG',
  status: 'aceito',
  created_at: '2026-04-28T12:00:00.000Z',
};

describe('SolicitacaoEscolaDetalhe helpers', () => {
  it('keeps pending solicitacoes expanded and history collapsed by default', () => {
    expect(getSolicitacaoDefaultExpanded('pendente')).toBe(true);
    expect(getSolicitacaoDefaultExpanded('parcial')).toBe(true);
    expect(getSolicitacaoDefaultExpanded('concluida')).toBe(false);
    expect(getSolicitacaoDefaultExpanded('cancelada')).toBe(false);
  });

  it('summarizes long product lists without listing every item', () => {
    const summary = summarizeSolicitacaoItems([
      { ...itemBase, nome_produto: 'Arroz' },
      { ...itemBase, id: 2, nome_produto: 'Feijao' },
      { ...itemBase, id: 3, nome_produto: 'Frango' },
    ]);

    expect(summary).toBe('Arroz, Feijao +1 item');
  });

  it('formats emergency guide decision with approved quantity and date', () => {
    expect(getItemDecisionText({
      ...itemBase,
      atendimento_tipo: 'emergencial',
      quantidade_aprovada: 10,
      data_entrega_prevista: '2026-04-29',
    })).toBe('Guia emergencial - 10 KG em 29/04/2026');
  });
});
