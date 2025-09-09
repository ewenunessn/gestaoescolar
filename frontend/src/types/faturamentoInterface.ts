export interface ItemFaturamentoAgrupado {
  id: number;
  pedido_id: number;
  fornecedor_id: number;
  fornecedor_nome: string;
  contrato_id: number;
  contrato_numero: string;
  produto_id: number;
  produto_nome: string;
  quantidade_pedida: number;
  quantidade_recebida: number;
  status_recebimento: 'pendente' | 'parcial' | 'completo';
  percentual_recebido: number;
  valor_unitario: number;
  valor_total: number;
  data_pedido: string;
  data_entrega_prevista?: string;
}

export interface FornecedorAgrupado {
  fornecedor_id: number;
  fornecedor_nome: string;
  contratos: ContratoAgrupado[];
}

export interface ContratoAgrupado {
  contrato_id: number;
  contrato_numero: string;
  itens: ItemFaturamentoAgrupado[];
  total_itens: number;
  valor_total_contrato: number;
  percentual_recebido_medio: number;
}

export interface ContratoDisponivel {
  id: number;
  numero: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  status: 'ativo' | 'inativo' | 'suspenso';
  descricao?: string;
}

export interface ModalidadeFaturamento {
  id: number;
  nome: string;
  descricao?: string;
  percentual_repasse: number;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export interface NovoFaturamentoRequest {
  contrato_id: number;
  fornecedor_id: number;
  modalidades: ModalidadeSelecionada[];
  itens_selecionados: number[];
  observacoes?: string;
}

export interface ModalidadeSelecionada {
  modalidade_id: number;
  percentual: number;
}

export interface NovoFaturamentoResponse {
  faturamento_id: number;
  valor_total: number;
  modalidades_divisao: {
    modalidade_id: number;
    modalidade_nome: string;
    valor: number;
    percentual: number;
  }[];
  itens_processados: number;
  message: string;
}

export interface FiltrosFaturamento {
  status_recebimento?: 'pendente' | 'parcial' | 'completo';
  fornecedor_id?: number;
  contrato_id?: number;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosContratos {
  fornecedor_id?: number;
  status?: 'ativo' | 'inativo' | 'suspenso';
  busca?: string;
  page?: number;
  limit?: number;
}

export interface FiltrosModalidades {
  ativa?: boolean;
}

export interface ResponsePaginado<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}