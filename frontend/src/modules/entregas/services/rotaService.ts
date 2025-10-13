import api from '../../../services/api';
import { RotaEntrega, RotaEscola, PlanejamentoEntrega, CreateRotaData, CreatePlanejamentoData, RotaComEntregas } from '../types/rota';

export const rotaService = {
  // Rotas de Entrega
  async listarRotas(): Promise<RotaEntrega[]> {
    const response = await api.get('/entregas/rotas');
    return response.data;
  },

  async buscarRota(id: number): Promise<RotaEntrega> {
    const response = await api.get(`/entregas/rotas/${id}`);
    return response.data;
  },

  async criarRota(data: CreateRotaData): Promise<{ message: string; rota: RotaEntrega }> {
    const response = await api.post('/entregas/rotas', data);
    return response.data;
  },

  async atualizarRota(id: number, data: Partial<CreateRotaData>): Promise<{ message: string; rota: RotaEntrega }> {
    const response = await api.put(`/entregas/rotas/${id}`, data);
    return response.data;
  },

  async deletarRota(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/entregas/rotas/${id}`);
    return response.data;
  },

  // Escolas da Rota
  async listarEscolasRota(rotaId: number): Promise<RotaEscola[]> {
    const response = await api.get(`/entregas/rotas/${rotaId}/escolas`);
    return response.data;
  },

  async adicionarEscolaRota(rotaId: number, escolaId: number, ordem?: number, observacao?: string): Promise<{ message: string; escolaRota: RotaEscola }> {
    const response = await api.post(`/entregas/rotas/${rotaId}/escolas`, {
      escolaId,
      ordem,
      observacao
    });
    return response.data;
  },

  async removerEscolaRota(rotaId: number, escolaId: number): Promise<{ message: string }> {
    const response = await api.delete(`/entregas/rotas/${rotaId}/escolas/${escolaId}`);
    return response.data;
  },

  async atualizarOrdemEscolas(rotaId: number, escolasOrdem: { escolaId: number, ordem: number }[]): Promise<{ message: string }> {
    const response = await api.put(`/entregas/rotas/${rotaId}/escolas/ordem`, {
      escolasOrdem
    });
    return response.data;
  },

  // Planejamento de Entregas
  async listarPlanejamentos(guiaId?: number, rotaId?: number): Promise<PlanejamentoEntrega[]> {
    const params = new URLSearchParams();
    if (guiaId) params.append('guiaId', guiaId.toString());
    if (rotaId) params.append('rotaId', rotaId.toString());
    
    const response = await api.get(`/entregas/planejamentos?${params.toString()}`);
    return response.data;
  },

  async criarPlanejamento(data: CreatePlanejamentoData): Promise<{ message: string; planejamento: PlanejamentoEntrega }> {
    const response = await api.post('/entregas/planejamentos', data);
    return response.data;
  },

  async atualizarPlanejamento(id: number, data: Partial<CreatePlanejamentoData & { status: string }>): Promise<{ message: string; planejamento: PlanejamentoEntrega }> {
    const response = await api.put(`/entregas/planejamentos/${id}`, data);
    return response.data;
  },

  async deletarPlanejamento(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/entregas/planejamentos/${id}`);
    return response.data;
  },

  // Escolas disponíveis
  async listarEscolasDisponiveis(): Promise<any[]> {
    const response = await api.get('/entregas/escolas-disponiveis');
    return response.data;
  },

  async verificarEscolaEmRota(escolaId: number): Promise<{ emRota: boolean; rotaNome?: string; rotaId?: number }> {
    const response = await api.get(`/entregas/escolas/${escolaId}/verificar-rota`);
    return response.data;
  },

  // Para o módulo de entregas
  async listarRotasComEntregas(guiaId?: number): Promise<RotaComEntregas[]> {
    const params = new URLSearchParams();
    if (guiaId) params.append('guiaId', guiaId.toString());
    
    const response = await api.get(`/entregas/rotas-entregas?${params.toString()}`);
    return response.data;
  }
};