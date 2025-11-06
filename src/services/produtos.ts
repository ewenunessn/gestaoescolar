import { apiWithRetry } from "./api";
import { 
  Produto, 
  CriarProdutoRequest, 
  AtualizarProdutoRequest,
  ComposicaoNutricional,
  ImportarProdutoRequest,
  ImportarProdutosResponse
} from '../types/produto';

export async function listarProdutos(): Promise<Produto[]> {
  const { data } = await apiWithRetry.get("/produtos");
  return data.data || []; // Return the actual array from the response
}

export async function buscarProduto(id: number): Promise<Produto | null> {
  const { data } = await apiWithRetry.get(`/produtos/${id}`);
  return data.data || null; // Return the actual data from the response
}

// Alias para compatibilidade
export const getProdutoById = buscarProduto;

export async function criarProduto(produto: CriarProdutoRequest): Promise<Produto> {
  const { data } = await apiWithRetry.post("/produtos", produto);
  return data.data || data; // Return the actual data from the response
}

export async function editarProduto(id: number, produto: AtualizarProdutoRequest): Promise<Produto> {
  const { data } = await apiWithRetry.put(`/produtos/${id}`, produto);
  return data.data || data; // Return the actual data from the response
}

export async function removerProduto(id: number): Promise<void> {
  await apiWithRetry.delete(`/produtos/${id}`);
}

// Alias para manter compatibilidade com código existente
export async function deletarProduto(id: number): Promise<void> {
  await apiWithRetry.delete(`/produtos/${id}`);
}

// Importar produtos em lote
export async function importarProdutosLote(produtos: ImportarProdutoRequest[]): Promise<ImportarProdutosResponse> {
  const { data } = await apiWithRetry.post("/produtos/importar-lote", { produtos });
  return data.data || data; // Handle both new format {success, data} and old format
}



export async function buscarComposicaoNutricional(produtoId: number): Promise<ComposicaoNutricional | null> {
  const { data } = await apiWithRetry.get(
    `/produtos/${produtoId}/composicao-nutricional`
  );
  return data.data; // Return the actual data from the response
}

export async function salvarComposicaoNutricional(
  produtoId: number,
  composicao: Partial<ComposicaoNutricional>
): Promise<ComposicaoNutricional> {
  const { data } = await apiWithRetry.put(`/produtos/${produtoId}/composicao-nutricional`, {
    ...composicao,
  });
  return data.data || data; // Return the actual data from the response
}
