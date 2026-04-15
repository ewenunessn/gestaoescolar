import api from './api';

export interface ItemGuia {
  id: number;
  produto_nome: string;
  quantidade: number;
  unidade: string;
  lote?: string;
  escola_nome: string;
  escola_id: number;
  produto_id: number;
  guia_id: number;
}

class ItemGuiaService {
  async listarItensPorGuia(guiaId: number): Promise<ItemGuia[]> {
    const response = await api.get(`/guias/${guiaId}/itens`);
    return response.data.data || response.data;
  }

  async listarItensPorGuiaERotas(guiaId: number, rotaIds: number[]): Promise<ItemGuia[]> {
    try {
      const params = new URLSearchParams();
      params.append('guiaId', guiaId.toString());
      rotaIds.forEach(rotaId => params.append('rotaIds[]', rotaId.toString()));
      
      const response = await api.get(`/entregas/itens-por-rotas?${params.toString()}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Erro ao buscar itens por rotas:', error);
      throw error;
    }
  }
}

export const itemGuiaService = new ItemGuiaService();