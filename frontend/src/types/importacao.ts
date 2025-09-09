export interface ImportarProdutosResponse {
  success: boolean;
  message: string;
  insercoes: number;
  atualizacoes: number;
  erros: number;
  resultados: {
    sucesso: number;
    erros: number;
  };
}

export interface ImportarEscolasResponse {
  success: boolean;
  message: string;
  insercoes: number;
  atualizacoes: number;
  erros: number;
}

export interface ImportarFornecedoresResponse {
  success: boolean;
  message: string;
  insercoes: number;
  atualizacoes: number;
  erros: number;
}