import { apiWithRetry } from "./api";

export async function listarContratos() {
  const { data } = await apiWithRetry.get("/contratos");
  return data.data || []; // Return the actual array from the response
}

export async function buscarContrato(id: number) {
  const { data } = await apiWithRetry.get(`/contratos/${id}`);
  return data.data || null; // Return the actual data from the response
}

export async function criarContrato(contrato: any) {
  const { data } = await apiWithRetry.post("/contratos", contrato);
  return data.data || data; // Return the actual data from the response
}

export async function editarContrato(id: number, contrato: any) {
  const { data } = await apiWithRetry.put(`/contratos/${id}`, contrato);
  return data.data || data; // Return the actual data from the response
}

export async function removerContrato(id: number, force: boolean = false) {
  const url = force ? `/contratos/${id}?force=true` : `/contratos/${id}`;
  const { data } = await apiWithRetry.delete(url);
  return data; // Return the response data
}

export async function listarContratoProdutos(contrato_id: number) {
  const { data } = await apiWithRetry.get(
    `/contrato-produtos/contrato/${contrato_id}`
  );
  return data.data || []; // Return the actual array from the response
}

export async function adicionarContratoProduto(produto: any) {
  const { data } = await apiWithRetry.post(`/contrato-produtos`, produto);
  return data.data || data; // Return the actual data from the response
}

export async function editarContratoProduto(id: number, produto: any) {
  const { data } = await apiWithRetry.put(`/contrato-produtos/${id}`, produto);
  return data.data || data; // Return the actual data from the response
}

export async function removerContratoProduto(id: number) {
  const { data } = await apiWithRetry.delete(`/contrato-produtos/${id}`);
  return data;
}

export async function listarContratosPorFornecedor(fornecedor_id: number) {
  const { data } = await apiWithRetry.get(`/contratos/fornecedor/${fornecedor_id}`);
  return data.data || []; // Return the actual array from the response
}
