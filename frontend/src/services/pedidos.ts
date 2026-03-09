import { apiWithRetry } from "./api";
import { Pedido, PedidoDetalhado, PedidoFiltros } from "../types/pedido";

// Listar pedidos com filtros
export async function listar(filtros?: PedidoFiltros) {
  const params = new URLSearchParams();
  
  if (filtros?.status) params.append('status', filtros.status);
  if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
  if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
  if (filtros?.page) params.append('page', filtros.page.toString());
  if (filtros?.limit) params.append('limit', filtros.limit.toString());

  const { data } = await apiWithRetry.get(`/compras?${params.toString()}`);
  return data;
}

// Buscar compra por ID
export async function buscarPorId(id: number): Promise<PedidoDetalhado> {
  const { data } = await apiWithRetry.get(`/compras/${id}`);
  return data.data;
}

// Criar nova compra
export async function criar(compra: any) {
  const { data } = await apiWithRetry.post('/compras', compra);
  return data.data;
}

// Atualizar compra
export async function atualizar(id: number, compra: any) {
  const { data } = await apiWithRetry.put(`/compras/${id}`, compra);
  return data.data;
}

// Atualizar status da compra
export async function atualizarStatus(id: number, status: string, motivo?: string) {
  const { data } = await apiWithRetry.patch(`/compras/${id}/status`, { status, motivo });
  return data.data;
}

// Excluir compra
export async function excluirPedido(id: number) {
  const { data } = await apiWithRetry.delete(`/compras/${id}`);
  return data;
}

// Listar todos os produtos disponíveis
export async function listarTodosProdutosDisponiveis() {
  const { data } = await apiWithRetry.get('/compras/produtos-disponiveis');
  return data.data;
}

// Resumo de compras por tipo de fornecedor em uma compra
export async function resumoTipoFornecedorPedido(pedidoId: number) {
  const { data } = await apiWithRetry.get(`/compras/${pedidoId}/resumo-tipo-fornecedor`);
  return data.success ? data.data : [];
}

export default {
  listar,
  buscarPorId,
  criar,
  atualizar,
  atualizarStatus,
  excluirPedido,
  listarTodosProdutosDisponiveis,
  resumoTipoFornecedorPedido
};
