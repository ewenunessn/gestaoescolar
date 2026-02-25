import api from '../../../services/api';
import { EscolaEntrega, ItemEntrega, ConfirmarEntregaData, EstatisticasEntregas } from '../types';

export const entregaService = {
  // Listar escolas com itens para entrega
  async listarEscolas(guiaId?: number, rotaId?: number, dataEntrega?: string, dataInicio?: string, dataFim?: string, somentePendentes?: boolean): Promise<EscolaEntrega[]> {
    const params = new URLSearchParams();
    if (guiaId) params.append('guiaId', guiaId.toString());
    if (rotaId) params.append('rotaId', rotaId.toString());
    if (dataEntrega) params.append('dataEntrega', dataEntrega);
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (somentePendentes) params.append('somentePendentes', 'true');
    
    const response = await api.get(`/entregas/escolas?${params.toString()}`);
    return response.data;
  },

  // Obter estatísticas gerais
  async obterEstatisticas(guiaId?: number, rotaId?: number, dataEntrega?: string, dataInicio?: string, dataFim?: string, somentePendentes?: boolean): Promise<EstatisticasEntregas> {
    const params = new URLSearchParams();
    if (guiaId) params.append('guiaId', guiaId.toString());
    if (rotaId) params.append('rotaId', rotaId.toString());
    if (dataEntrega) params.append('dataEntrega', dataEntrega);
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (somentePendentes) params.append('somentePendentes', 'true');
    
    const response = await api.get(`/entregas/estatisticas?${params.toString()}`);
    return response.data;
  },

  // Listar itens para entrega de uma escola
  async listarItensPorEscola(escolaId: number, guiaId?: number, dataEntrega?: string, dataInicio?: string, dataFim?: string, somentePendentes?: boolean): Promise<ItemEntrega[]> {
    const params = new URLSearchParams();
    if (guiaId) params.append('guiaId', guiaId.toString());
    if (dataEntrega) params.append('dataEntrega', dataEntrega);
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (somentePendentes) params.append('somentePendentes', 'true');
    
    const response = await api.get(`/entregas/escolas/${escolaId}/itens?${params.toString()}`);
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
