import { apiWithRetry } from "./api";

export const escolasService = {
  async listar() {
    const { data } = await apiWithRetry.get("/escolas");
    return data.data || [];
  }
};

export async function listarEscolas() {
  const { data } = await apiWithRetry.get("/escolas");
  return data.data || []; // Return the actual array from the response
}

export async function buscarEscola(id: number) {
  const { data } = await apiWithRetry.get(`/escolas/${id}`);
  return data.data || null; // Return the actual data from the response
}

// Alias para compatibilidade
export async function obterEscola(id: number) {
  const { data } = await apiWithRetry.get(`/escolas/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarEscola(escola: any) {
  const { data } = await apiWithRetry.post("/escolas", escola);
  return data.data || data; // Return the actual data from the response
}

export async function editarEscola(id: number, escola: any) {
  const { data } = await apiWithRetry.put(`/escolas/${id}`, escola);
  return data.data || data; // Return the actual data from the response
}

// Alias para compatibilidade
export async function atualizarEscola(id: number, escola: any) {
  const { data } = await apiWithRetry.put(`/escolas/${id}`, escola);
  return data.data || data; // Return the actual data from the response
}

export async function removerEscola(id: number) {
  await apiWithRetry.delete(`/escolas/${id}`);
}

// Alias para manter compatibilidade com código existente
export async function deletarEscola(id: number) {
  await apiWithRetry.delete(`/escolas/${id}`);
}

export async function listarEscolaModalidades() {
  const { data } = await apiWithRetry.get("/escola-modalidades");
  return data.data || []; // Return the actual array from the response
}

export async function buscarEscolaModalidade(id: number) {
  const { data } = await apiWithRetry.get(`/escola-modalidades/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarEscolaModalidade(escolaModalidade: any) {
  const { data } = await apiWithRetry.post(
    "/escola-modalidades",
    escolaModalidade
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

// Alias para manter compatibilidade com código existente
export async function adicionarEscolaModalidade(
  escolaId: number,
  modalidadeId: number,
  alunos: number
) {
  const { data } = await apiWithRetry.post("/escola-modalidades", {
    escola_id: escolaId,
    modalidade_id: modalidadeId,
    quantidade_alunos: alunos,
  });
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function editarEscolaModalidade(
  id: number,
  escolaModalidade: any
) {
  const { data } = await apiWithRetry.put(
    `/escola-modalidades/${id}`,
    escolaModalidade
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function removerEscolaModalidade(id: number) {
  await apiWithRetry.delete(`/escola-modalidades/${id}`);
}

// Importar escolas em lote (sempre substitui existentes)
export async function importarEscolasLote(escolas: any[]) {
  // Usar timeout maior para importações grandes (5 minutos)
  const { data } = await apiWithRetry.post("/escolas/importar-lote", { escolas }, {
    timeout: 300000 // 5 minutos
  });
  return data.data || data; // Handle both new format {success, data} and old format
}

// Exportar escolas com dados completos
export async function exportarEscolas() {
  const { data } = await apiWithRetry.get("/escolas");
  return data.data || []; // Return the actual array from the response
}
