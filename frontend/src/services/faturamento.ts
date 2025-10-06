import api from './api';
import {
  Faturamento,
  FaturamentoDetalhado,
  FaturamentoPrevia,
  FaturamentoResumo,
  GerarFaturamentoRequest
} from '../types/faturamento';

export const faturamentoService = {
  // Calcular prévia do faturamento
  async calcularPrevia(pedidoId: number): Promise<FaturamentoPrevia> {
    const response = await api.get(`/pedidos/${pedidoId}/faturamento/previa`);
    return response.data.data;
  },

  // Gerar faturamento definitivo
  async gerar(dados: GerarFaturamentoRequest): Promise<{ faturamento: Faturamento; previa: FaturamentoPrevia }> {
    const response = await api.post(`/pedidos/${dados.pedido_id}/faturamento`, {
      observacoes: dados.observacoes
    });
    return response.data.data;
  },

  // Listar faturamentos
  async listar(filtros?: {
    pedido_id?: number;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    
    if (filtros?.pedido_id) params.append('pedido_id', filtros.pedido_id.toString());
    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
    if (filtros?.page) params.append('page', filtros.page.toString());
    if (filtros?.limit) params.append('limit', filtros.limit.toString());

    const queryString = params.toString();
    const url = `/faturamentos${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data;
  },

  // Buscar faturamento por ID
  async buscarPorId(id: number): Promise<FaturamentoDetalhado> {
    const response = await api.get(`/faturamentos/${id}`);
    return response.data.data;
  },

  // Buscar faturamentos por pedido
  async buscarPorPedido(pedidoId: number): Promise<Faturamento[]> {
    const response = await api.get(`/pedidos/${pedidoId}/faturamentos`);
    return response.data.data;
  },

  // Atualizar status do faturamento
  async atualizarStatus(id: number, status: string): Promise<void> {
    await api.patch(`/faturamentos/${id}/status`, { status });
  },

  // Excluir faturamento
  async excluir(id: number): Promise<void> {
    await api.delete(`/faturamentos/${id}`);
  },

  // Obter resumo do faturamento
  async obterResumo(id: number): Promise<{ faturamento: Faturamento; contratos: FaturamentoResumo[] }> {
    const response = await api.get(`/faturamentos/${id}/resumo`);
    return response.data.data;
  }
};

export default faturamentoService;