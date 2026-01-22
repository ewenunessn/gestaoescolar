import { apiWithRetry } from "./api";

export interface Modalidade {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  ativo: boolean;
  total_alunos?: number;
}

export interface ModalidadeInput {
  nome: string;
  codigo_financeiro?: string;
  valor_repasse?: number;
}

export async function listarModalidades(): Promise<Modalidade[]> {
  const { data } = await apiWithRetry.get("/modalidades");
  // Verificar se a resposta tem o novo formato { success: true, data: [...] }
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  }
  // Fallback para o formato antigo (array direto)
  if (Array.isArray(data)) {
    return data; // Handle both new format {success, data} and old format
  }
  // Se não for nenhum dos formatos esperados, retornar array vazio
  console.warn('Formato de resposta inesperado para modalidades:', data);
  return [];
}

export async function buscarModalidade(id: number): Promise<Modalidade> {
  const { data } = await apiWithRetry.get(`/modalidades/${id}`);
  // Verificar se a resposta tem o novo formato { success: true, data: {...} }
  if (data.success && data.data) {
    return data.data;
  }
  // Fallback para o formato antigo (objeto direto)
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function criarModalidade(modalidade: ModalidadeInput): Promise<Modalidade> {
  const { data } = await apiWithRetry.post("/modalidades", modalidade);
  // Verificar se a resposta tem o novo formato { success: true, data: {...} }
  if (data.success && data.data) {
    return data.data;
  }
  // Fallback para o formato antigo (objeto direto)
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function editarModalidade(id: number, modalidade: ModalidadeInput): Promise<Modalidade> {
  const { data } = await apiWithRetry.put(`/modalidades/${id}`, modalidade);
  // Verificar se a resposta tem o novo formato { success: true, data: {...} }
  if (data.success && data.data) {
    return data.data;
  }
  // Fallback para o formato antigo (objeto direto)
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function removerModalidade(id: number): Promise<void> {
  await apiWithRetry.delete(`/modalidades/${id}`);
}
