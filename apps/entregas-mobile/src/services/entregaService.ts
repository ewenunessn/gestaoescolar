import api from './api';

export interface EscolaEntrega {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  total_itens: number;
  itens_entregues: number;
  percentual_entregue: number;
  latitude?: number;
  longitude?: number;
}

export interface ItemEntrega {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  entrega_confirmada: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  produto_nome: string;
  produto_unidade: string;
  mes: number;
  ano: number;
  guia_observacao?: string;
}

export interface ConfirmarEntregaData {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string;
  foto_comprovante?: string;
  latitude?: number;
  longitude?: number;
}

export interface EstatisticasEntregas {
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
  itens_pendentes: number;
  percentual_entregue: number;
}

export interface RotaEntrega {
  id: number;
  nome: string;
  cor: string;
  descricao?: string;
  total_escolas: number;
  total_itens: number;
  itens_entregues: number;
}

class EntregaService {
  // Listar rotas disponíveis para entrega
  async listarRotas(): Promise<RotaEntrega[]> {
    try {
      const response = await api.get('/entregas/rotas-entregas');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar rotas:', error);
      throw error;
    }
  }

  // Listar escolas de uma rota com itens para entrega
  async listarEscolasRota(rotaId?: number, guiaId?: number): Promise<EscolaEntrega[]> {
    try {
      const params = new URLSearchParams();
      if (rotaId) params.append('rotaId', rotaId.toString());
      if (guiaId) params.append('guiaId', guiaId.toString());
      
      const response = await api.get(`/entregas/escolas?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar escolas:', error);
      throw error;
    }
  }

  // Obter estatísticas gerais de entregas
  async obterEstatisticas(guiaId?: number, rotaId?: number): Promise<EstatisticasEntregas> {
    try {
      const params = new URLSearchParams();
      if (guiaId) params.append('guiaId', guiaId.toString());
      if (rotaId) params.append('rotaId', rotaId.toString());
      
      const response = await api.get(`/entregas/estatisticas?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  // Listar itens para entrega de uma escola específica
  async listarItensEscola(escolaId: number, guiaId?: number): Promise<ItemEntrega[]> {
    try {
      const params = new URLSearchParams();
      if (guiaId) params.append('guiaId', guiaId.toString());
      
      const response = await api.get(`/entregas/escolas/${escolaId}/itens?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar itens da escola:', error);
      throw error;
    }
  }

  // Buscar detalhes de um item específico
  async buscarItem(itemId: number): Promise<ItemEntrega> {
    try {
      const response = await api.get(`/entregas/itens/${itemId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      throw error;
    }
  }

  // Confirmar entrega de um item
  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<{ message: string; item: ItemEntrega }> {
    try {
      const response = await api.post(`/entregas/itens/${itemId}/confirmar`, dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      throw error;
    }
  }

  // Cancelar entrega de um item
  async cancelarEntrega(itemId: number): Promise<{ message: string; item: ItemEntrega }> {
    try {
      const response = await api.post(`/entregas/itens/${itemId}/cancelar`);
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar entrega:', error);
      throw error;
    }
  }

  // Upload de foto de comprovante
  async uploadFotoComprovante(itemId: number, fotoUri: string): Promise<{ url: string }> {
    try {
      const formData = new FormData();
      formData.append('foto', {
        uri: fotoUri,
        type: 'image/jpeg',
        name: `comprovante_${itemId}_${Date.now()}.jpg`,
      } as any);

      const response = await api.post(`/entregas/itens/${itemId}/foto`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    }
  }
}

export const entregaService = new EntregaService();