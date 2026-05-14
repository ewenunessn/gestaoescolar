import { createCrudService } from './createCrudService';
import { apiWithRetry } from './api';

export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  categoria_financeira_id?: number;
  categorias_financeiras_ids?: number[];
  categorias_financeiras?: CategoriaFinanceiraModalidade[];
  categoria_financeira_nome?: string;
  codigo_financeiro?: string;
  valor_repasse?: number;
  parcelas?: number;
  ativo: boolean;
  total_alunos?: number;
  total_escolas?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ModalidadeInput {
  nome: string;
  descricao?: string;
  categorias_financeiras_ids: number[];
  ativo: boolean;
}

export interface CategoriaFinanceiraModalidade {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  parcelas?: number;
  origem_repasse_id?: number | null;
  origem_repasse_nome?: string;
  origem_repasse_codigo?: string;
  ativo: boolean;
}

export type CategoriaFinanceiraModalidadeInput = Omit<CategoriaFinanceiraModalidade, 'id'>;

export interface OrigemRepasse {
  id: number;
  nome: string;
  codigo?: string;
  customizada: boolean;
  ativo: boolean;
}

export type OrigemRepasseInput = Pick<OrigemRepasse, 'nome'> & Partial<Pick<OrigemRepasse, 'codigo'>>;

const crud = createCrudService<Modalidade, ModalidadeInput, Partial<ModalidadeInput>>('modalidades');

export const modalidadeService = {
  ...crud,
  listarCategoriasFinanceiras: async (): Promise<CategoriaFinanceiraModalidade[]> => {
    const response = await apiWithRetry.get('/modalidades/categorias-financeiras');
    return response.data.data || response.data;
  },
  criarCategoriaFinanceira: async (data: CategoriaFinanceiraModalidadeInput): Promise<CategoriaFinanceiraModalidade> => {
    const response = await apiWithRetry.post('/modalidades/categorias-financeiras', data);
    return response.data.data || response.data;
  },
  atualizarCategoriaFinanceira: async (id: number, data: CategoriaFinanceiraModalidadeInput): Promise<CategoriaFinanceiraModalidade> => {
    const response = await apiWithRetry.put(`/modalidades/categorias-financeiras/${id}`, data);
    return response.data.data || response.data;
  },
  removerCategoriaFinanceira: async (id: number): Promise<CategoriaFinanceiraModalidade> => {
    const response = await apiWithRetry.delete(`/modalidades/categorias-financeiras/${id}`);
    return response.data.data || response.data;
  },
  listarOrigensRepasse: async (): Promise<OrigemRepasse[]> => {
    const response = await apiWithRetry.get('/modalidades/origens-repasse');
    return response.data.data || response.data;
  },
  criarOrigemRepasse: async (data: OrigemRepasseInput): Promise<OrigemRepasse> => {
    const response = await apiWithRetry.post('/modalidades/origens-repasse', data);
    return response.data.data || response.data;
  },
};
