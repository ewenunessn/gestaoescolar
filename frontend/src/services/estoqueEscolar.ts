import { apiWithRetry } from "./api";

export interface EstoqueEscolaProduto {
  escola_id: number;
  escola_nome: string;
  produto_id: number;
  quantidade_atual: number;
  unidade: string;
  status_estoque: 'baixo' | 'normal' | 'alto' | 'sem_estoque';
  data_ultima_atualizacao: string;
}

export interface EstoqueEscolarProduto {
  produto_id: number;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  categoria?: string;
  escolas: EstoqueEscolaProduto[];
  total_quantidade: number;
  total_escolas_com_estoque: number;
  total_escolas: number;
}

export interface EstoqueEscolarResumo {
  produto_id: number;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  categoria?: string;
  total_quantidade: number;
  total_escolas_com_estoque: number;
  total_escolas: number;
}

// Buscar estoque escolar de um produto específico em todas as escolas
export async function buscarEstoqueEscolarProduto(produtoId: number): Promise<EstoqueEscolarProduto> {
  const { data } = await apiWithRetry.get(`/estoque-escolar/produto/${produtoId}`);
  return data.data;
}

// Buscar estoque escolar de todos os produtos (resumo)
export async function listarEstoqueEscolar(): Promise<EstoqueEscolarResumo[]> {
  const { data } = await apiWithRetry.get('/estoque-escolar');
  return data.data || [];
}

// Resetar estoque global (todas as escolas)
export async function resetEstoqueGlobal(): Promise<any> {
  const { data } = await apiWithRetry.post('/estoque-escolar/reset');
  return data;
}

// NOVO: Buscar múltiplos produtos de uma vez - RESOLVE PROBLEMA N+1
export async function buscarEstoqueMultiplosProdutos(produtoIds: number[]): Promise<EstoqueEscolarProduto[]> {
  const { data } = await apiWithRetry.post('/estoque-escolar/multiplos-produtos', {
    produto_ids: produtoIds
  });
  return data.data;
}

// NOVO: Buscar matriz completa (escolas x produtos) - SUPER OTIMIZADO
export async function buscarMatrizEstoque(produtoIds?: number[], limiteProdutos?: number): Promise<{
  escolas: Array<{
    escola_id: number;
    escola_nome: string;
    produtos: Record<number, { quantidade: number; unidade: string }>;
  }>;
  produtos: Array<{
    id: number;
    nome: string;
    unidade: string;
    categoria: string;
  }>;
  matriz_carregada: boolean;
}> {
  const params = new URLSearchParams();
  
  if (produtoIds && produtoIds.length > 0) {
    params.append('produto_ids', produtoIds.join(','));
  }
  
  if (limiteProdutos) {
    params.append('limite_produtos', limiteProdutos.toString());
  }

  const { data } = await apiWithRetry.get(`/estoque-escolar/matriz?${params.toString()}`);
  return data.data;
}