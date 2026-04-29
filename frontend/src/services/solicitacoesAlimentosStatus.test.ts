import { describe, expect, it } from 'vitest';
import { getSolicitacaoItemStatusView } from './solicitacoesAlimentosStatus';

describe('solicitacoesAlimentosStatus', () => {
  it('shows pending items as canceled when the solicitation is canceled', () => {
    expect(getSolicitacaoItemStatusView('pendente', 'cancelada')).toEqual({
      label: 'Cancelado',
      color: 'default',
    });
  });

  it('keeps accepted item status when the solicitation is concluded', () => {
    expect(getSolicitacaoItemStatusView('aceito', 'concluida')).toEqual({
      label: 'Aceito',
      color: 'success',
    });
  });
});
