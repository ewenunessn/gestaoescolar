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

  const { data } = await apiWithRetry.get(`/pedidos?${params.toString()}`);
  return data;
}

// Buscar pedido por ID
export async function buscarPorId(id: number): Promise<PedidoDetalhado> {
  const { data } = await apiWithRetry.get(`/pedidos/${id}`);
  return data.data;
}

// Criar novo pedido
export async function criar(pedido: any) {
  const { data } = await apiWithRetry.post('/pedidos', pedido);
  return data.data;
}

// Atualizar pedido
export async function atualizar(id: number, pedido: any) {
  const { data } = await apiWithRetry.put(`/pedidos/${id}`, pedido);
  return data.data;
}

// Atualizar status do pedido
export async function atualizarStatus(id: number, status: string, motivo?: string) {
  const { data } = await apiWithRetry.patch(`/pedidos/${id}/status`, { status, motivo });
  return data.data;
}

// Excluir pedido
export async function excluirPedido(id: number) {
  const { data } = await apiWithRetry.delete(`/pedidos/${id}`);
  return data;
}

// Listar todos os produtos disponíveis
export async function listarTodosProdutosDisponiveis() {
  const { data } = await apiWithRetry.get('/pedidos/produtos-disponiveis');
  return data.data;
}

// Resumo de compras por tipo de fornecedor em um pedido
export async function resumoTipoFornecedorPedido(pedidoId: number) {
  const { data } = await apiWithRetry.get(`/pedidos/${pedidoId}/resumo-tipo-fornecedor`);
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
