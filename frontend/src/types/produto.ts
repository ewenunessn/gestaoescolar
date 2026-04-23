export interface Produto {
  id: number;
  nome: string;
  unidade?: string;
  unidade_nome?: string;
  unidade_medida_id?: number;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  validade_minima?: number;
  imagem_url?: string;
  perecivel?: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  estoque_minimo?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  indice_coccao?: number;
  peso?: number;
  tem_composicao_nutricional?: boolean;
  tem_contrato?: boolean;
}

export interface CriarProdutoRequest {
  nome: string;
  descricao?: string;
  tipo_processamento?: string;
  categoria?: string;
  validade_minima?: number;
  imagem_url?: string;
  perecivel?: boolean;
  ativo?: boolean;
  estoque_minimo?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  indice_coccao?: number;
  unidade_medida_id?: number;
  peso?: number;
}

export interface AtualizarProdutoRequest {
  nome?: string;
  descricao?: string;
  tipo_processamento?: string;
  categoria?: string;
  validade_minima?: number;
  imagem_url?: string;
  perecivel?: boolean;
  ativo?: boolean;
  estoque_minimo?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  indice_coccao?: number;
  unidade_medida_id?: number;
  peso?: number;
}

export interface ComposicaoNutricional {
  produto_id: number;
  calorias?: number;
  proteinas?: number;
  gorduras?: number;
  carboidratos?: number;
  fibras?: number;
  calcio?: number;
  ferro?: number;
  vitamina_a?: number;
  vitamina_c?: number;
  sodio?: number;
  gorduras_saturadas_g?: number;
  gorduras_trans_g?: number;
  colesterol?: number;
  acucares?: number;
}

export interface ImportarProdutoRequest {
  nome: string;
  unidade: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  peso?: number;
  fator_correcao?: number;
  tipo_fator_correcao?: string;
  indice_coccao?: number;
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
