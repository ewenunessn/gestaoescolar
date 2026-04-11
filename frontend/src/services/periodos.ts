import { createCrudService, extractResponseData } from './createCrudService';
import api from './api';

export interface Periodo {
  id: number;
  ano: number;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  fechado: boolean;
  ocultar_dados: boolean;
  created_at: string;
  updated_at: string;
  total_pedidos?: number;
  total_guias?: number;
  total_cardapios?: number;
}

export type PeriodoCreate = Pick<Periodo, 'ano' | 'data_inicio' | 'data_fim'> & { descricao?: string };
export type PeriodoUpdate = Pick<Periodo, 'data_inicio' | 'data_fim' | 'ocultar_dados'> & { descricao?: string };

// CRUD básico via factory
export const periodoService = createCrudService<Periodo, PeriodoCreate, PeriodoUpdate>('periodos');

// Operações específicas do período
export const periodoServiceExtended = {
  ...periodoService,

  obterPeriodoAtivo: async (): Promise<Periodo> => {
    const { data } = await api.get('/periodos/ativo');
    return extractResponseData<Periodo>(data);
  },

  ativarPeriodo: async (id: number): Promise<Periodo> => {
    const { data } = await api.patch(`/periodos/${id}/ativar`);
    return extractResponseData<Periodo>(data);
  },

  fecharPeriodo: async (id: number): Promise<Periodo> => {
    const { data } = await api.patch(`/periodos/${id}/fechar`);
    return extractResponseData<Periodo>(data);
  },

  reabrirPeriodo: async (id: number): Promise<Periodo> => {
    const { data } = await api.patch(`/periodos/${id}/reabrir`);
    return extractResponseData<Periodo>(data);
  },

  selecionarPeriodo: async (periodoId: number): Promise<Periodo> => {
    const { data } = await api.post('/periodos/selecionar', { periodoId });
    return extractResponseData<Periodo>(data);
  },
};
