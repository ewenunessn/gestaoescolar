import { apiWithRetry } from './api';
import {
  PedidoPendente,
  ItemRecebimento,
  RegistrarRecebimentoRequest,
  HistoricoRecebimento,
  EstatisticasRecebimento,
  RecebimentoDetalhes,
  FiltrosRecebimento
} from '../types/recebimentoSimplificado';

// Serviço de Recebimentos
export const recebimentoSimplificadoService = {
  // Listar pedidos com itens pendentes
  async listarPedidosPendentes(filtros?: FiltrosRecebimento): Promise<PedidoPendente[]> {
    console.log('🌐 Fazendo requisição para:', '/recebimento-simples/pedidos-pendentes');
    console.log('🔧 Filtros:', filtros);
    const response = await apiWithRetry.get('/recebimento-simples/pedidos-pendentes', {
      params: filtros
    });
    console.log('📦 Resposta recebida:', response.data);
    return response.data.data || [];
  },

  // Listar pedidos recebidos
  async listarPedidosRecebidos(filtros?: FiltrosRecebimento): Promise<PedidoPendente[]> {
    const response = await apiWithRetry.get('/recebimento-simples/pedidos-recebidos', {
      params: filtros
    });
    return response.data.data || [];
  },

  // Listar itens de um pedido para recebimento
  async listarItensPedido(pedidoId: number): Promise<{ itens: ItemRecebimento[]; estatisticas: EstatisticasRecebimento }> {
    const response = await apiWithRetry.get(`/recebimento-simples/pedido/${pedidoId}/itens`);
    return response.data.data || { itens: [], estatisticas: {} as EstatisticasRecebimento };
  },

  // Registrar recebimento de um item
  async receberItem(pedidoItemId: number, dados: RegistrarRecebimentoRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiWithRetry.post(`/recebimento-simples/item/${pedidoItemId}/receber`, dados);
    return response.data;
  },

  // Confirmar recebimento de pedido
  async confirmarRecebimento(dados: { pedido_id: number; itens_recebidos: any[]; observacoes?: string }): Promise<{ success: boolean; message: string }> {
    const response = await apiWithRetry.post('/recebimento-simples/confirmar', dados);
    return response.data;
  },

  // Buscar detalhes de recebimento de um pedido
  async buscarRecebimento(pedidoId: number): Promise<RecebimentoDetalhes> {
    const response = await apiWithRetry.get(`/recebimento-simples/${pedidoId}`);
    return response.data.data;
  },

  // Buscar histórico de recebimentos de um item
  async buscarHistoricoItem(pedidoItemId: number): Promise<HistoricoRecebimento[]> {
    const response = await apiWithRetry.get(`/recebimento-simples/item/${pedidoItemId}/historico`);
    return response.data.data || [];
  },

  // Buscar estatísticas de um pedido
  async buscarEstatisticas(pedidoId: number): Promise<EstatisticasRecebimento> {
    const response = await apiWithRetry.get(`/recebimento-simples/${pedidoId}/estatisticas`);
    return response.data.data;
  },

  // Inicializar sistema (executar uma vez)
  async inicializar(): Promise<{ success: boolean; message: string }> {
    const response = await apiWithRetry.post('/recebimento-simples/init');
    return response.data;
  }
};

export default recebimentoSimplificadoService;