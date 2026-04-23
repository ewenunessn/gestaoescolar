export interface Refeicao {
  id: number;
  nome: string;
  descricao?: string;
  tipo?: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos adicionais para ficha técnica
  categoria?: string;
  tempo_preparo_minutos?: number;
  rendimento_porcoes?: number;
  modo_preparo?: string;
  utensilios?: string;
  observacoes_tecnicas?: string;
}

export interface CriarRefeicaoRequest {
  nome: string;
  descricao?: string;
  tipo?: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  categoria?: string;
  ativo?: boolean;
}

export interface AtualizarRefeicaoRequest {
  nome?: string;
  descricao?: string;
  tipo?: 'cafe_manha' | 'almoco' | 'lanche_tarde' | 'jantar' | 'ceia';
  categoria?: string;
  ativo?: boolean;
}

export interface RefeicaoProduto {
  id: number;
  refeicao_id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'mililitros' | 'unidades';
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
  tipo_medida: 'gramas' | 'mililitros' | 'unidades';
  per_capita_por_modalidade?: Array<{ modalidade_id: number; per_capita: number }>;
}

export interface AtualizarRefeicaoProdutoRequest extends Partial<CriarRefeicaoProdutoRequest> {}
