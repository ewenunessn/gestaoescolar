export interface Produto {
  id: number;
  nome: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  per_capita?: number;
  modalidade_id?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  unidade_contrato?: string;
}

export interface CriarProdutoRequest {
  nome: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  ativo?: boolean;
}

export interface AtualizarProdutoRequest {
  nome?: string;
  categoria?: string;
  descricao?: string;
  tipo_processamento?: string;
  perecivel?: boolean;
  ativo?: boolean;
}

export interface ComposicaoNutricional {
  produto_id: number;
  calorias?: number;
  proteinas?: number;
  carboidratos?: number;
  gorduras?: number;
  fibras?: number;
  sodio?: number;
  acucares?: number;
  gorduras_saturadas_g?: number;
  gorduras_trans_g?: number;
  colesterol?: number;
  calcio?: number;
  ferro?: number;
  vitamina_a?: number;
  vitamina_c?: number;
}

export interface ImportarProdutoRequest {
  nome: string;
  categoria?: string;
  descricao?: string;
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