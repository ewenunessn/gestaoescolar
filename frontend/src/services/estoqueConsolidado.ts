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

export interface EstoqueConsolidadoProduto {
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

export interface EstoqueConsolidadoResumo {
  produto_id: number;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  categoria?: string;
  total_quantidade: number;
  total_escolas_com_estoque: number;
  total_escolas: number;
}

// Buscar estoque consolidado de um produto específico em todas as escolas
export async function buscarEstoqueConsolidadoProduto(produtoId: number): Promise<EstoqueConsolidadoProduto> {
  const { data } = await apiWithRetry.get(`/estoque-consolidado/produto/${produtoId}`);
  return data.data;
}

// Buscar estoque consolidado de todos os produtos (resumo)
export async function listarEstoqueConsolidado(): Promise<EstoqueConsolidadoResumo[]> {
  const { data } = await apiWithRetry.get('/estoque-consolidado');
  return data.data || [];
}