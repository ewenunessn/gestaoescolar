export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  codigo_financeiro?: string;
  valor_repasse: string | number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarModalidadeRequest {
  nome: string;
  descricao?: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  ativo?: boolean;
}

export interface AtualizarModalidadeRequest extends Partial<CriarModalidadeRequest> {
  id: number;
}