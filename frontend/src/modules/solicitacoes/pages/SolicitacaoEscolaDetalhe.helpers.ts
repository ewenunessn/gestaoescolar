import type { Solicitacao, SolicitacaoItem } from '../../../services/solicitacoesAlimentos';

export function formatQty(value: number | undefined, unidade?: string): string {
  return Number(value ?? 0).toLocaleString('pt-BR') + (unidade ? ' ' + unidade : '');
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateBR(value?: string | null): string {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString('pt-BR') : '';
}

export function toDateInputValue(value?: string | null): string {
  return parseDateOnly(value) ? String(value).slice(0, 10) : '';
}

export function getSolicitacaoDefaultExpanded(status: Solicitacao['status'] | string): boolean {
  return status === 'pendente' || status === 'parcial';
}

export function summarizeSolicitacaoItems(
  itens: Array<Pick<SolicitacaoItem, 'nome_produto'>>,
  maxVisible = 2,
): string {
  if (itens.length === 0) return 'Nenhum item';

  const visible = itens.slice(0, maxVisible).map((item) => item.nome_produto).join(', ');
  const remaining = itens.length - maxVisible;

  if (remaining <= 0) return visible;
  return `${visible} +${remaining} ${remaining === 1 ? 'item' : 'itens'}`;
}

export function getItemDecisionText(
  item: Pick<
    SolicitacaoItem,
    | 'status'
    | 'atendimento_tipo'
    | 'quantidade_aprovada'
    | 'quantidade'
    | 'unidade'
    | 'data_entrega_prevista'
    | 'justificativa_recusa'
    | 'observacao_aprovacao'
  >,
): string {
  if (item.status === 'aceito' && item.atendimento_tipo === 'emergencial') {
    const decision = `Guia emergencial - ${formatQty(item.quantidade_aprovada ?? item.quantidade, item.unidade)}`;
    const date = formatDateBR(item.data_entrega_prevista);
    return date ? `${decision} em ${date}` : decision;
  }

  if (item.status === 'contemplado') {
    return 'Atendido por guia existente';
  }

  return item.justificativa_recusa || item.observacao_aprovacao || '-';
}
