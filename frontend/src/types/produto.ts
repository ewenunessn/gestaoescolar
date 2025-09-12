export interface Produto {
  id: number;
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
  per_capita?: number;
  modalidade_id?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarProdutoRequest {
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
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
  marca?: string;
  codigo_barras?: string;
  peso?: number;
  validade_minima?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  imagem_url?: string;
  preco_referencia?: number;
  estoque_minimo?: number;
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