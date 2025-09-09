import { apiWithRetry } from "./api";
import { 
  Refeicao, 
  CriarRefeicaoRequest, 
  AtualizarRefeicaoRequest,
  RefeicaoProduto,
  CriarRefeicaoProdutoRequest,
  AtualizarRefeicaoProdutoRequest
} from '../types/refeicao';

export async function listarRefeicoes(): Promise<Refeicao[]> {
  const { data } = await apiWithRetry.get("/refeicoes");
  return data.data || []; // Return the actual array from the response
}

export async function buscarRefeicao(id: number): Promise<Refeicao | null> {
  try {
    const { data } = await apiWithRetry.get(`/refeicoes/${id}`);
    return data.data || null; // Return the actual data from the response
  } catch (error: any) {
    // Se for erro 404, retorna null em vez de lançar exceção
    if (error.message && error.message.includes('404')) {
      return null;
    }
    // Para outros erros, relança a exceção
    throw error;
  }
}

export async function criarRefeicao(refeicao: CriarRefeicaoRequest): Promise<Refeicao> {
  const { data } = await apiWithRetry.post("/refeicoes", refeicao);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function editarRefeicao(id: number, refeicao: AtualizarRefeicaoRequest): Promise<Refeicao> {
  const { data } = await apiWithRetry.put(`/refeicoes/${id}`, refeicao);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function removerRefeicao(id: number): Promise<void> {
  await apiWithRetry.delete(`/refeicoes/${id}`);
}

// Alias para manter compatibilidade com código existente
export async function deletarRefeicao(id: number): Promise<void> {
  await apiWithRetry.delete(`/refeicoes/${id}`);
}

export async function listarRefeicaoProdutos(refeicaoId: number): Promise<RefeicaoProduto[]> {
  const { data } = await apiWithRetry.get(
    `/refeicao-produtos/${refeicaoId}/produtos`
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

// Alias para manter compatibilidade com código existente
export async function listarProdutosDaRefeicao(refeicaoId: number): Promise<RefeicaoProduto[]> {
  const { data } = await apiWithRetry.get(
    `/refeicao-produtos/${refeicaoId}/produtos`
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function adicionarRefeicaoProduto(refeicaoProduto: CriarRefeicaoProdutoRequest): Promise<RefeicaoProduto> {
  if (!refeicaoProduto.refeicao_id)
    throw new Error("refeicao_id é obrigatório");
  const { data } = await apiWithRetry.post(
    `/refeicao-produtos/${refeicaoProduto.refeicao_id}/produtos`,
    refeicaoProduto
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

// Alias para manter compatibilidade com código existente
export async function adicionarProdutoNaRefeicao(
  refeicaoId: number,
  produtoId: number,
  perCapita: number
): Promise<RefeicaoProduto> {
  const { data } = await apiWithRetry.post(
    `/refeicao-produtos/${refeicaoId}/produtos`,
    {
      refeicao_id: refeicaoId,
      produto_id: produtoId,
      per_capita: perCapita
    }
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function editarRefeicaoProduto(id: number, refeicaoProduto: AtualizarRefeicaoProdutoRequest): Promise<RefeicaoProduto> {
  const { data } = await apiWithRetry.put(
    `/refeicao-produtos/produtos/${id}`,
    refeicaoProduto
  );
  return data.data || data; // Handle both new format {success, data} and old format
}

// Alias para manter compatibilidade com código existente
export async function editarProdutoNaRefeicao(
  id: number, 
  perCapita: number, 
  tipoMedida?: 'gramas' | 'unidades'
): Promise<RefeicaoProduto> {
  const payload: any = { per_capita: perCapita };
  if (tipoMedida) {
    payload.tipo_medida = tipoMedida;
  }
  
  const { data } = await apiWithRetry.put(`/refeicao-produtos/produtos/${id}`, payload);
  return data.data || data; // Handle both new format {success, data} and old format
}

export async function removerRefeicaoProduto(id: number): Promise<void> {
  await apiWithRetry.delete(`/refeicao-produtos/produtos/${id}`);
}

// Alias para manter compatibilidade com código existente
export async function removerProdutoDaRefeicao(id: number): Promise<void> {
  await apiWithRetry.delete(`/refeicao-produtos/produtos/${id}`);
}
