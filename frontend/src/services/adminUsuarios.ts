import { apiWithRetry } from "./api";

const BASE = "/admin";

export interface Modulo { id: number; nome: string; slug: string; icone?: string; ordem: number; }
export interface NivelPermissao { id: number; nome: string; slug: string; nivel: number; }
export interface FuncaoPermissao { modulo_id: number; modulo_nome: string; modulo_slug: string; nivel_permissao_id: number; nivel_nome: string; nivel: number; }
export interface Funcao { id: number; nome: string; descricao?: string; ativo: boolean; permissoes: FuncaoPermissao[]; }
export interface Usuario { id: number; nome: string; email: string; tipo: string; ativo: boolean; funcao_id?: number; funcao_nome?: string; created_at: string; }

// Usuários
export const getUsuarios = async (): Promise<Usuario[]> => {
  const res = await apiWithRetry.get<{ data: Usuario[] }>(`${BASE}/usuarios`);
  return res.data.data;
};

export const criarUsuario = async (payload: Partial<Usuario> & { senha: string }): Promise<Usuario> => {
  const res = await apiWithRetry.post<{ data: Usuario }>(`${BASE}/usuarios`, payload);
  return res.data.data;
};

export const atualizarUsuario = async (id: number, payload: Partial<Usuario> & { senha?: string }): Promise<Usuario> => {
  const res = await apiWithRetry.put<{ data: Usuario }>(`${BASE}/usuarios/${id}`, payload);
  return res.data.data;
};

export const excluirUsuario = async (id: number): Promise<void> => {
  await apiWithRetry.delete(`${BASE}/usuarios/${id}`);
};

// Funções
export const getFuncoes = async (): Promise<Funcao[]> => {
  const res = await apiWithRetry.get<{ data: Funcao[] }>(`${BASE}/funcoes`);
  return res.data.data;
};

export const criarFuncao = async (payload: { nome: string; descricao?: string; permissoes: { modulo_id: number; nivel_permissao_id: number }[] }): Promise<Funcao> => {
  const res = await apiWithRetry.post<{ data: Funcao }>(`${BASE}/funcoes`, payload);
  return res.data.data;
};

export const atualizarFuncao = async (id: number, payload: any): Promise<Funcao> => {
  const res = await apiWithRetry.put<{ data: Funcao }>(`${BASE}/funcoes/${id}`, payload);
  return res.data.data;
};

export const excluirFuncao = async (id: number): Promise<void> => {
  await apiWithRetry.delete(`${BASE}/funcoes/${id}`);
};

// Auxiliares
export const getModulos = async (): Promise<Modulo[]> => {
  const res = await apiWithRetry.get<{ data: Modulo[] }>(`${BASE}/modulos`);
  return res.data.data;
};

export const getNiveis = async (): Promise<NivelPermissao[]> => {
  const res = await apiWithRetry.get<{ data: NivelPermissao[] }>(`${BASE}/niveis-permissao`);
  return res.data.data;
};
