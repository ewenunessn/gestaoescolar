export interface Modalidade {
  id: number;
  nome: string;
  descricao?: string;
  categoria_financeira_id?: number | null;
  categoria_financeira_nome?: string;
  codigo_financeiro?: string;
  valor_repasse: string | number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriarModalidadeRequest {
  nome: string;
  descricao?: string;
  categoria_financeira_id: number;
  codigo_financeiro?: string;
  valor_repasse: number;
  ativo?: boolean;
}

export interface AtualizarModalidadeRequest extends Partial<CriarModalidadeRequest> {
  id: number;
}
