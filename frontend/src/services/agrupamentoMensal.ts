import { apiWithRetry } from './api';
import {
  AgrupamentoMensal,
  AgrupamentoDetalhes,
  CriarAgrupamentoRequest,
  AdicionarPedidoAgrupamentoRequest,
  FiltrosAgrupamento,
  FiltrosPedidosPendentes,
  PedidoAgrupamento
} from '../types/agrupamentoMensal';

export const agrupamentoMensalService = {
  // Listar agrupamentos mensais
  async listarAgrupamentos(filtros?: FiltrosAgrupamento): Promise<AgrupamentoMensal[]> {
    const response = await apiWithRetry.get('/agrupamentos-mensais', {
      params: filtros
    });
    return response.data.data || [];
  },

  // Obter detalhes de um agrupamento mensal
  async obterAgrupamento(id: number): Promise<AgrupamentoDetalhes> {
    const response = await apiWithRetry.get(`/agrupamentos-mensais/${id}`);
    return response.data.data;
  },

  // Criar novo agrupamento mensal
  async criarAgrupamento(data: CriarAgrupamentoRequest): Promise<AgrupamentoMensal> {
    const response = await apiWithRetry.post('/agrupamentos-mensais', data);
    return response.data.data;
  },

  // Adicionar pedido ao agrupamento
  async adicionarPedido(data: AdicionarPedidoAgrupamentoRequest): Promise<void> {
    await apiWithRetry.post('/agrupamentos-mensais/adicionar-pedido', data);
  },



  // Listar pedidos pendentes para agrupamento
  async listarPedidosPendentes(filtros: FiltrosPedidosPendentes): Promise<PedidoAgrupamento[]> {
    const response = await apiWithRetry.get('/agrupamentos-mensais/pendentes', {
      params: filtros
    });
    return response.data.data || [];
  },

  

  // Utilitários
  getNomeMes(mes: number): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1] || '';
  },

  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDENTE':
        return '#f44336'; // Vermelho
      case 'PARCIAL':
        return '#ff9800'; // Laranja
      case 'COMPLETO':
        return '#4caf50'; // Verde
      default:
        return '#757575'; // Cinza
    }
  },

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente';
      case 'PARCIAL':
        return 'Parcial';
      case 'COMPLETO':
        return 'Completo';
      default:
        return status;
    }
  },

  formatarValor(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  },

  formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR');
  },

  formatarDataHora(data: string): string {
    return new Date(data).toLocaleString('pt-BR');
  }
};