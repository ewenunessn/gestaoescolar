import api from './api';
import {
  Pedido,
  PedidoDetalhado,
  CriarPedidoDTO,
  AtualizarPedidoDTO,
  PedidoFiltros,
  PedidoEstatisticas,
  ContratoProduto
} from '../types/pedido';

export const pedidosService = {
  // Listar pedidos com filtros
  async listar(filtros?: PedidoFiltros) {
    const params = new URLSearchParams();
    
    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.contrato_id) params.append('contrato_id', filtros.contrato_id.toString());
    if (filtros?.escola_id) params.append('escola_id', filtros.escola_id.toString());
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const queryString = params.toString();
    const url = `/pedidos${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  // Buscar pedido por ID
  async buscarPorId(id: number): Promise<PedidoDetalhado> {
    const response = await api.get(`/pedidos/${id}`);
    return response.data.data;
  },

  // Criar novo pedido
  async criar(dados: CriarPedidoDTO): Promise<Pedido> {
    const response = await api.post('/pedidos', dados);
    return response.data.data;
  },

  // Atualizar pedido
  async atualizar(id: number, dados: AtualizarPedidoDTO): Promise<Pedido> {
    const response = await api.put(`/pedidos/${id}`, dados);
    return response.data.data;
  },

  // Atualizar status do pedido
  async atualizarStatus(id: number, status: string): Promise<Pedido> {
    const response = await api.patch(`/pedidos/${id}/status`, { status });
    return response.data.data;
  },

  // Cancelar pedido
  async cancelar(id: number, motivo: string): Promise<Pedido> {
    const response = await api.post(`/pedidos/${id}/cancelar`, { motivo });
    return response.data.data;
  },

  // Obter estatísticas
  async obterEstatisticas(): Promise<PedidoEstatisticas> {
    const response = await api.get('/pedidos/estatisticas');
    return response.data.data;
  },

  // Listar produtos disponíveis no contrato
  async listarProdutosContrato(contratoId: number): Promise<ContratoProduto[]> {
    const response = await api.get(`/pedidos/contrato/${contratoId}/produtos`);
    return response.data.data;
  },

  // Listar todos os produtos disponíveis de todos os contratos ativos
  async listarTodosProdutosDisponiveis(): Promise<ContratoProduto[]> {
    const response = await api.get('/pedidos/produtos-disponiveis');
    return response.data.data;
  },

  // Atualizar itens do pedido
  async atualizarItens(id: number, itens: any[]): Promise<void> {
    await api.put(`/pedidos/${id}/itens`, { itens });
  },

  // Excluir pedido (rascunho ou cancelado)
  async excluirPedido(id: number): Promise<void> {
    await api.delete(`/pedidos/${id}`);
  }
};

export default pedidosService;
