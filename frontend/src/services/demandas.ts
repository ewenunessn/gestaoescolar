import api from './api';
import { Demanda } from '../types/demanda';

export const demandasService = {
  async criar(dados: Partial<Demanda>): Promise<Demanda> {
    const response = await api.post('/demandas', dados);
    return response.data.data;
  },

  async listar(filtros?: {
    escola_id?: number;
    escola_nome?: string;
    objeto?: string;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<Demanda[]> {
    const params = new URLSearchParams();
    
    if (filtros?.escola_id) params.append('escola_id', filtros.escola_id.toString());
    if (filtros?.escola_nome) params.append('escola_nome', filtros.escola_nome);
    if (filtros?.objeto) params.append('objeto', filtros.objeto);
    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

    const queryString = params.toString();
    const url = `/demandas${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data.data;
  },

  async listarSolicitantes(): Promise<string[]> {
    const response = await api.get('/demandas/solicitantes');
    return response.data.data;
  },

  async buscarPorId(id: number): Promise<Demanda> {
    const response = await api.get(`/demandas/${id}`);
    return response.data.data;
  },

  async atualizar(id: number, dados: Partial<Demanda>): Promise<Demanda> {
    const response = await api.put(`/demandas/${id}`, dados);
    return response.data.data;
  },

  async excluir(id: number): Promise<void> {
    await api.delete(`/demandas/${id}`);
  },

  async atualizarStatus(id: number, status: string, data_resposta_semead?: string, observacoes?: string): Promise<Demanda> {
    const response = await api.patch(`/demandas/${id}/status`, {
      status,
      data_resposta_semead,
      observacoes
    });
    return response.data.data;
  }
};

export default demandasService;
