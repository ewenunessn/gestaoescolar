export interface Produto {
  id: number;
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarProdutoRequest {
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  ativo?: boolean;
}

export interface AtualizarProdutoRequest extends Partial<CriarProdutoRequest> {
  id: number;
}

export interface ComposicaoNutricional {
  produto_id: number;
  calorias?: number;
  proteinas?: number;
  carboidratos?: number;
  gorduras?: number;
  fibras?: number;
  sodio?: number;
  acucar?: number;
  gorduras_saturadas?: number;
  gorduras_trans?: number;
  colesterol?: number;
  calcio?: number;
  ferro?: number;
  vitamina_a?: number;
  vitamina_c?: number;
}

export interface ImportarProdutoRequest {
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
}

export interface ImportarProdutosResponse {
  sucessos: number;
  erros: number;
  detalhes: {
    linha: number;
    erro?: string;
    produto?: Produto;
  }[];
}