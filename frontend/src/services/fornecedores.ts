import { apiWithRetry } from "./api";

export async function listarFornecedores() {
  const { data } = await apiWithRetry.get("/fornecedores");
  return data.data || []; // Return the actual array from the response
}

export async function buscarFornecedor(id: number) {
  const { data } = await apiWithRetry.get(`/fornecedores/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarFornecedor(fornecedor: any) {
  const { data } = await apiWithRetry.post("/fornecedores", fornecedor);
  return data.data || data; // Return the actual data from the response
}

export async function editarFornecedor(id: number, fornecedor: any) {
  const { data } = await apiWithRetry.put(`/fornecedores/${id}`, fornecedor);
  return data.data || data; // Return the actual data from the response
}

export async function verificarRelacionamentosFornecedor(id: number) {
  const { data } = await apiWithRetry.get(`/fornecedores/${id}/relacionamentos`);
  return data.data || data;
}

export async function removerFornecedor(id: number) {
  await apiWithRetry.delete(`/fornecedores/${id}`);
}

// Importar fornecedores em lote (sempre substitui existentes)
export async function importarFornecedoresLote(fornecedores: any[]) {
  const { data } = await apiWithRetry.post("/fornecedores/importar-lote", { fornecedores });
  return data.data || data; // Handle both new format {success, data} and old format
}