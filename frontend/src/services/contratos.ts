import { apiWithRetry } from "./api";
import { requestQueue } from "../utils/requestQueue";

export const contratosService = {
  async listar(filtros?: { status?: string }) {
    const params = new URLSearchParams();
    if (filtros?.status) params.append('status', filtros.status);
    const queryString = params.toString();
    const url = `/contratos${queryString ? `?${queryString}` : ''}`;
    
    return requestQueue.enqueue(`contratos-list-${queryString}`, async () => {
      const { data } = await apiWithRetry.get(url);
      return data;
    });
  }
};

export async function listarContratos() {
  return requestQueue.enqueue('contratos-list', async () => {
    const { data } = await apiWithRetry.get("/contratos");
    return data.data || [];
  });
}

export async function buscarContrato(id: number) {
  return requestQueue.enqueue(`contrato-${id}`, async () => {
    const { data } = await apiWithRetry.get(`/contratos/${id}`);
    return data.data || null;
  });
}

export async function criarContrato(contrato: any) {
  // Limpar cache ao criar
  requestQueue.clearCache('contratos-list');
  const { data } = await apiWithRetry.post("/contratos", contrato);
  return data.data || data;
}

export async function editarContrato(id: number, contrato: Record<string, unknown>) {
  // Limpar cache ao editar
  requestQueue.clearCache(`contrato-${id}`);
  requestQueue.clearCache('contratos-list');
  const { data } = await apiWithRetry.put(`/contratos/${id}`, contrato);
  return data.data || data;
}

export async function removerContrato(id: number, force: boolean = false) {
  // Limpar cache ao remover
  requestQueue.clearCache(`contrato-${id}`);
  requestQueue.clearCache('contratos-list');
  const url = force ? `/contratos/${id}?force=true` : `/contratos/${id}`;
  const { data } = await apiWithRetry.delete(url);
  return data;
}

export async function listarContratoProdutos(contrato_id: number) {
  return requestQueue.enqueue(`contrato-produtos-${contrato_id}`, async () => {
    const { data } = await apiWithRetry.get(
      `/contrato-produtos/contrato/${contrato_id}`
    );
    return data.data || [];
  });
}

export async function adicionarContratoProduto(produto: any) {
  // Limpar cache ao adicionar produto
  requestQueue.clearCache(`contrato-produtos-${produto.contrato_id}`);
  const { data } = await apiWithRetry.post(`/contrato-produtos`, produto);
  return data.data || data;
}

export async function editarContratoProduto(id: number, produto: Record<string, unknown>) {
  // Limpar cache ao editar produto
  if (produto.contrato_id) {
    requestQueue.clearCache(`contrato-produtos-${produto.contrato_id}`);
  }
  const { data } = await apiWithRetry.put(`/contrato-produtos/${id}`, produto);
  return data.data || data;
}

export async function removerContratoProduto(id: number) {
  // Cache será limpo quando recarregar a lista
  const { data } = await apiWithRetry.delete(`/contrato-produtos/${id}`);
  return data;
}

export async function listarContratosPorFornecedor(fornecedor_id: number) {
  return requestQueue.enqueue(`contratos-fornecedor-${fornecedor_id}`, async () => {
    const { data } = await apiWithRetry.get(`/contratos/fornecedor/${fornecedor_id}`);
    return data.data || [];
  });
}

export async function buscarContratosPorProduto(termo: string) {
  return requestQueue.enqueue(`contratos-produto-${termo}`, async () => {
    const { data } = await apiWithRetry.get(`/contratos/buscar-por-produto?termo=${encodeURIComponent(termo)}`);
    return data.data || [];
  });
}
