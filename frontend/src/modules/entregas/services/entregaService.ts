import api from "../../../services/api";
import { EscolaEntrega, ItemEntrega, ConfirmarEntregaData, EstatisticasEntregas, Rota } from "../types";

export const entregaService = {
  // Listar rotas disponíveis (compatível com app)
  async listarRotas(): Promise<Rota[]> {
    const response = await api.get('/entregas/rotas');
    return response.data;
  },

  // Listar escolas de uma rota específica (compatível com app)
  async listarEscolasDaRota(rotaId: number): Promise<EscolaEntrega[]> {
    const response = await api.get(`/entregas/rotas/${rotaId}/escolas`);
    return response.data;
  },

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

  // Listar itens para entrega de uma escola (compatível com app)
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

  // Confirmar entrega (compatível com app - retorna historico_id)
  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<{ message: string; item: ItemEntrega; historico_id?: number }> {
    const response = await api.post(`/entregas/itens/${itemId}/confirmar`, dados);
    return response.data;
  },

  // Cancelar entrega
  async cancelarEntrega(itemId: number): Promise<{ message: string; item: ItemEntrega }> {
    const response = await api.post(`/entregas/itens/${itemId}/cancelar`);
    return response.data;
  },

  // Cancelar item de entrega de forma segura (mantém integridade do comprovante)
  async cancelarItemEntrega(historicoEntregaId: number, motivo?: string): Promise<{ message: string; sucesso: boolean }> {
    const response = await api.post('/entregas/comprovantes/cancelar-item', {
      historico_entrega_id: historicoEntregaId,
      motivo
    });
    return response.data;
  },

  // Criar comprovante de entrega (compatível com app)
  async criarComprovante(dados: {
    escola_id: number;
    nome_quem_entregou: string;
    nome_quem_recebeu: string;
    observacao?: string;
    assinatura_base64: string;
    itens: Array<{
      historico_entrega_id: number;
      produto_nome: string;
      quantidade_entregue: number;
      unidade: string;
      lote?: string;
    }>;
  }): Promise<{ numero_comprovante: string }> {
    const response = await api.post('/entregas/comprovantes', dados);
    return response.data;
  },

  // Obter localização GPS (placeholder para compatibilidade)
  async obterLocalizacaoGPS(): Promise<{ latitude: number; longitude: number; precisao: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precisao: position.coords.accuracy
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }
};
