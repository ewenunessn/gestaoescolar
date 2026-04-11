import { createCrudService, extractResponseData } from './createCrudService';
import { apiWithRetry } from './api';

export interface GrupoItem {
  id: number;
  grupo_id: number;
  produto_id: number;
  produto_nome: string;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  fator_correcao?: number;
}

export interface Grupo {
  id: number;
  nome: string;
  descricao?: string;
  itens: GrupoItem[];
}

export type GrupoCreate = Pick<Grupo, 'nome'> & { descricao?: string };
export type GrupoUpdate = Partial<GrupoCreate>;

// CRUD básico via factory
export const grupoService = createCrudService<Grupo, GrupoCreate, GrupoUpdate>('grupos-ingredientes');

// Operações específicas
export const grupoServiceExtended = {
  ...grupoService,

  salvarItensGrupo: async (
    id: number,
    itens: Array<{ produto_id: number; per_capita: number; tipo_medida: string }>
  ): Promise<GrupoItem[]> => {
    const { data } = await apiWithRetry.put(`/grupos-ingredientes/${id}/itens`, { itens });
    return extractResponseData<GrupoItem[]>(data);
  },
};
