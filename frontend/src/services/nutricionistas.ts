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

export interface NutricionistaInput {
  nome: string;
  crn: string;
  crn_regiao: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  especialidade?: string;
  ativo?: boolean;
}

export async function listarNutricionistas(ativo?: boolean): Promise<Nutricionista[]> {
  const params = ativo !== undefined ? { ativo } : {};
  const { data } = await apiWithRetry.get('/nutricionistas', { params });
  return data.success && Array.isArray(data.data) ? data.data : [];
}

export async function buscarNutricionista(id: number): Promise<Nutricionista> {
  const { data } = await apiWithRetry.get(`/nutricionistas/${id}`);
  return data.success && data.data ? data.data : data;
}

export async function criarNutricionista(nutricionista: NutricionistaInput): Promise<Nutricionista> {
  const { data } = await apiWithRetry.post('/nutricionistas', nutricionista);
  return data.success && data.data ? data.data : data;
}

export async function editarNutricionista(id: number, nutricionista: Partial<NutricionistaInput>): Promise<Nutricionista> {
  const { data } = await apiWithRetry.put(`/nutricionistas/${id}`, nutricionista);
  return data.success && data.data ? data.data : data;
}

export async function removerNutricionista(id: number): Promise<void> {
  await apiWithRetry.delete(`/nutricionistas/${id}`);
}

export async function desativarNutricionista(id: number): Promise<Nutricionista> {
  const { data } = await apiWithRetry.patch(`/nutricionistas/${id}/desativar`);
  return data.success && data.data ? data.data : data;
}
