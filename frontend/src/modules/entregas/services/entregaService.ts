import api from '../../../services/api';
import { EscolaEntrega, ItemEntrega, ConfirmarEntregaData, EstatisticasEntregas } from '../types';

export const entregaService = {
  // Listar escolas com itens para entrega
  async listarEscolas(): Promise<EscolaEntrega[]> {
    const response = await api.get('/entregas/escolas');
    return response.data;
  },

  // Obter estatísticas gerais
  async obterEstatisticas(): Promise<EstatisticasEntregas> {
    const response = await api.get('/entregas/estatisticas');
    return response.data;
  },

  // Listar itens para entrega de uma escola
  async listarItensPorEscola(escolaId: number): Promise<ItemEntrega[]> {
    const response = await api.get(`/entregas/escolas/${escolaId}/itens`);
    return response.data;
  },

  // Buscar um item específico
  async buscarItem(itemId: number): Promise<ItemEntrega> {
    const response = await api.get(`/entregas/itens/${itemId}`);
    return response.data;
  },

  // Confirmar entrega
  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<{ message: string; item: ItemEntrega }> {
    const response = await api.post(`/entregas/itens/${itemId}/confirmar`, dados);
    return response.data;
  },

  // Cancelar entrega
  async cancelarEntrega(itemId: number): Promise<{ message: string; item: ItemEntrega }> {
    const response = await api.post(`/entregas/itens/${itemId}/cancelar`);
    return response.data;
  }
};