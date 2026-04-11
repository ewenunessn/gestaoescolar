import { createCrudService, extractResponseData } from './createCrudService';
import { apiWithRetry } from './api';

export interface Nutricionista {
  id: number;
  nome: string;
  crn: string;
  crn_regiao: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  especialidade?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type NutricionistaCreate = Omit<Nutricionista, 'id' | 'created_at' | 'updated_at'>;
export type NutricionistaUpdate = Partial<NutricionistaCreate>;

// CRUD básico via factory
export const nutricionistaService = createCrudService<Nutricionista, NutricionistaCreate, NutricionistaUpdate>('nutricionistas');

// Operações específicas com filtragem
export const nutricionistaServiceExtended = {
  ...nutricionistaService,

  listarPorAtivo: async (ativo: boolean): Promise<Nutricionista[]> => {
    const { data } = await apiWithRetry.get('/nutricionistas', { params: { ativo } });
    return extractResponseData<Nutricionista[]>(data, []);
  },

  desativarNutricionista: async (id: number): Promise<Nutricionista> => {
    const { data } = await apiWithRetry.patch(`/nutricionistas/${id}/desativar`);
    return extractResponseData<Nutricionista>(data);
  },
};
