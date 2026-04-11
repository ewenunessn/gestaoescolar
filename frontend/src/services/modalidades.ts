import { createCrudService } from './createCrudService';
import { apiWithRetry } from './api';

export interface Modalidade {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  parcelas?: number;
  ativo: boolean;
  total_alunos?: number;
  total_escolas?: number;
  created_at?: string;
  updated_at?: string;
}

export type ModalidadeInput = Omit<Modalidade, 'id' | 'created_at' | 'updated_at' | 'total_alunos' | 'total_escolas'>;

// CRUD básico via factory
export const modalidadeService = createCrudService<Modalidade, ModalidadeInput, Partial<ModalidadeInput>>('modalidades');
