import api from "./api";
import { 
  Pedido, 
  CriarPedidoRequest,
  ItemPedido,
  StatusItemPedido,
  HistoricoPedido
} from '../types/pedido';

export interface PedidoFilters {
  status?: string;
  fornecedor_id?: number;
  data_inicio?: string;
  data_fim?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export async function listarPedidos(
  pagination: PaginationParams = {},
  filters: PedidoFilters = {}
): Promise<Pedido[]> {
  const params = new URLSearchParams();
  
  if (pagination.page) params.append('page', pagination.page.toString());
  if (pagination.limit) params.append('limit', pagination.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.fornecedor_id) params.append('fornecedor_id', filters.fornecedor_id.toString());
  if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
  if (filters.data_fim) params.append('data_fim', filters.data_fim);

  // Agora usa o sistema moderno
  const { data } = await api.get(`/pedidos-modernos?${params.toString()}`);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function listarProdutosPedido(pedido_id: number): Promise<ItemPedido[]> {
  const { data } = await api.get(`/pedidos-modernos/${pedido_id}/produtos`);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function cancelarPedido(pedido_id: number, justificativa: string): Promise<void> {
  await api.put(`/pedidos-modernos/${pedido_id}/cancelar`, { justificativa });
}

export async function criarPedido(pedido: CriarPedidoRequest): Promise<Pedido> {
  const { data } = await api.post("/pedidos-modernos", pedido);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function listarContratosFornecedor(fornecedor_id: number): Promise<any[]> {
  const { data } = await api.get(`/pedidos-modernos/fornecedor/${fornecedor_id}/contratos`);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function listarContratoProdutos(contrato_id: number): Promise<any[]> {
  const { data } = await api.get(`/contrato-produtos/contrato/${contrato_id}`);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function iniciarRecebimento(pedido_id: number): Promise<any> {
  const { data } = await api.post("/recebimentos/iniciar", { pedido_id });
  return data.data || data; // Handle both new format {success, data} and old format
}
