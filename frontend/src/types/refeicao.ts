export interface Refeicao {
  id: number;
  nome: string;
  descricao?: string;
  tipo: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarRefeicaoRequest {
  nome: string;
  descricao?: string;
  tipo: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  ativo?: boolean;
}

export interface AtualizarRefeicaoRequest {
  id: number;
  nome?: string;
  descricao?: string;
  tipo?: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  ativo?: boolean;
}

export interface RefeicaoProduto {
  id: number;
  refeicao_id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  created_at: string;
  updated_at: string;
  // Dados relacionados
  produto_nome?: string;
  refeicao_nome?: string;
}

export interface CriarRefeicaoProdutoRequest {
  refeicao_id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
}

export interface AtualizarRefeicaoProdutoRequest extends Partial<CriarRefeicaoProdutoRequest> {
  id: number;
}