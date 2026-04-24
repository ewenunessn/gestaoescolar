import { createCrudService } from './createCrudService';
import { apiWithRetry } from './api';

export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  categoria_financeira_id: number;
  categoria_financeira_nome?: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  parcelas?: number;
  ativo: boolean;
  total_alunos?: number;
  total_escolas?: number;
  created_at?: string;
  updated_at?: string;
}

export type ModalidadeInput = Omit<Modalidade, 'id' | 'created_at' | 'updated_at' | 'total_alunos' | 'total_escolas' | 'categoria_financeira_nome'>;

export interface CategoriaFinanceiraModalidade {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  parcelas?: number;
  ativo: boolean;
}

export type CategoriaFinanceiraModalidadeInput = Omit<CategoriaFinanceiraModalidade, 'id'>;

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
};
