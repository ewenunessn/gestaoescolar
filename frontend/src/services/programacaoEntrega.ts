import { apiWithRetry } from './api';

export interface ProgramacaoEscola {
  id?: number;
  escola_id: number;
  escola_nome?: string;
  quantidade: number;
}

export interface ProgramacaoEntrega {
  id?: number;
  pedido_item_id?: number;
  data_entrega: string;
  observacoes?: string;
  quantidade_total?: number;
  escolas: ProgramacaoEscola[];
}

export async function listarProgramacoes(pedidoItemId: number): Promise<ProgramacaoEntrega[]> {
  const { data } = await apiWithRetry.get(`/compras/itens/${pedidoItemId}/programacoes`);
  return data.data || [];
}

export async function salvarProgramacoes(
  pedidoItemId: number,
  programacoes: ProgramacaoEntrega[]
): Promise<ProgramacaoEntrega[]> {
  const { data } = await apiWithRetry.put(`/compras/itens/${pedidoItemId}/programacoes`, { programacoes });
  return data.data || [];
}
