export interface Produto {
  id: number;
  nome: string;
  unidade?: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  per_capita?: number;
  modalidade_id?: number;
  fator_correcao?: number; // Fator de correção para calcular per capita líquido
  ativo: boolean;
  created_at: string;
  updated_at: string;
  unidade_contrato?: string; // Deprecated: usar 'unidade'
}

export interface CriarProdutoRequest {
  nome: string;
  unidade?: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  fator_correcao?: number;
  ativo?: boolean;
}

export interface AtualizarProdutoRequest {
  nome?: string;
  unidade?: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  fator_correcao?: number;
  ativo?: boolean;
}

export interface ComposicaoNutricional {
  produto_id: number;
  proteinas?: number;
  gorduras?: number;
  carboidratos?: number;
  calcio?: number;
  ferro?: number;
  vitamina_a?: number;
  vitamina_c?: number;
  sodio?: number;
}

export interface ImportarProdutoRequest {
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  peso?: number;
  fator_correcao?: number;
  perecivel?: boolean;
  ativo?: boolean;
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