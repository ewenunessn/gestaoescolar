export type SolicitacaoItemStatusColor = 'warning' | 'success' | 'error' | 'default';

export interface SolicitacaoItemStatusView {
  label: string;
  color: SolicitacaoItemStatusColor;
}

const ITEM_STATUS_VIEW: Record<string, SolicitacaoItemStatusView> = {
  pendente: { label: 'Pendente', color: 'warning' },
  aceito: { label: 'Aceito', color: 'success' },
  contemplado: { label: 'Contemplado', color: 'success' },
  recusado: { label: 'Recusado', color: 'error' },
};

export function getSolicitacaoItemStatusView(
  itemStatus: string,
  solicitacaoStatus?: string,
): SolicitacaoItemStatusView {
  if (solicitacaoStatus === 'cancelada' && itemStatus === 'pendente') {
    return { label: 'Cancelado', color: 'default' };
  }

  return ITEM_STATUS_VIEW[itemStatus] ?? { label: itemStatus, color: 'default' };
}
