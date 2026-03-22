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

export async function listarGrupos(): Promise<Grupo[]> {
  const { data } = await apiWithRetry.get('/grupos-ingredientes');
  return data.data || [];
}

export async function criarGrupo(nome: string, descricao?: string): Promise<Grupo> {
  const { data } = await apiWithRetry.post('/grupos-ingredientes', { nome, descricao });
  return data.data;
}

export async function atualizarGrupo(id: number, nome: string, descricao?: string): Promise<Grupo> {
  const { data } = await apiWithRetry.put(`/grupos-ingredientes/${id}`, { nome, descricao });
  return data.data;
}

export async function excluirGrupo(id: number): Promise<void> {
  await apiWithRetry.delete(`/grupos-ingredientes/${id}`);
}

export async function salvarItensGrupo(
  id: number,
  itens: Array<{ produto_id: number; per_capita: number; tipo_medida: string }>
): Promise<GrupoItem[]> {
  const { data } = await apiWithRetry.put(`/grupos-ingredientes/${id}/itens`, { itens });
  return data.data;
}
