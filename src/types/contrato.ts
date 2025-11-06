export interface Contrato {
  id: number;
  numero_contrato: string;
  fornecedor_id: number;
  nome_fornecedor?: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: 'ativo' | 'inativo' | 'vencido';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface CriarContratoRequest {
  numero_contrato: string;
  fornecedor_id: number;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  observacoes?: string;
}

export interface AtualizarContratoRequest extends Partial<CriarContratoRequest> {
  id: number;
}