import { createCrudService, extractResponseData } from './createCrudService';
import { apiWithRetry } from './api';

export interface Cardapio {
  id: number;
  nome: string;
  mes: number;
  ano: number;
  observacao?: string;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type CardapioCreate = Pick<Cardapio, 'nome' | 'mes' | 'ano'> & { observacao?: string };
export type CardapioUpdate = Partial<CardapioCreate>;

// CRUD básico via factory
export const cardapioService = createCrudService<Cardapio, CardapioCreate, CardapioUpdate>('cardapios');

// Operações específicas de cardápio
export const cardapioServiceExtended = {
  ...cardapioService,

  listarRefeicoes: async (cardapioId: number) => {
    const { data } = await apiWithRetry.get(`/cardapios/${cardapioId}/refeicoes`);
    return extractResponseData(data, []);
  },

  adicionarRefeicao: async (cardapioRefeicao: any) => {
    if (!cardapioRefeicao.cardapio_id) throw new Error('cardapio_id é obrigatório');
    const { data } = await apiWithRetry.post(
      `/cardapios/${cardapioRefeicao.cardapio_id}/refeicoes`,
      cardapioRefeicao
    );
    return extractResponseData(data);
  },

  atualizarRefeicao: async (id: number, cardapioRefeicao: any) => {
    const { data } = await apiWithRetry.put(`/cardapios/refeicoes/${id}`, cardapioRefeicao);
    return extractResponseData(data);
  },

  deletarRefeicao: async (cardapioId: number, refeicaoId: number) => {
    await apiWithRetry.delete(`/cardapios/${cardapioId}/refeicoes/${refeicaoId}`);
  },

  calcularNecessidades: async (cardapioId: number) => {
    const { data } = await apiWithRetry.get(`/cardapios/${cardapioId}/necessidades`);
    return extractResponseData(data);
  },

  calcularCustoRefeicoes: async (cardapioId: number) => {
    const { data } = await apiWithRetry.get(`/cardapios/${cardapioId}/custo-refeicoes`);
    return extractResponseData(data);
  },

  calcularCustoCardapio: async (cardapioId: number) => {
    const { data } = await apiWithRetry.get(`/cardapios/${cardapioId}/custo`);
    return extractResponseData(data);
  },
};
