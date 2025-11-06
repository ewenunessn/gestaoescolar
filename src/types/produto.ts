export interface Produto {
  id: number;
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  marca?: string;
  peso?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  perecivel?: boolean;
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
  peso?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  perecivel?: boolean;
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
  peso?: number;
  fator_divisao?: number;
  tipo_processamento?: string;
  perecivel?: boolean;
}

export interface ImportarProdutosResponse {
  success: boolean;
  message: string;
  resultados: {
    sucesso: number;
    erros: number;
    insercoes: number;
    atualizacoes: number;
    detalhes: {
      sucesso: boolean;
      acao?: string;
      produto?: Produto;
      erro?: string;
    }[];
  };
}