export interface Faturamento {
  id: number;
  pedido_id: number;
  numero: string;
  data_faturamento: string;
  status: 'gerado' | 'processado' | 'cancelado';
  valor_total: number;
  observacoes?: string;
  usuario_criacao_id: number;
  usuario_criacao_nome?: string;
  created_at: string;
  updated_at: string;
}

export interface FaturamentoItem {
  id: number;
  faturamento_id: number;
  pedido_item_id: number;
  modalidade_id: number;
  modalidade_nome?: string;
  modalidade_codigo_financeiro?: string;
  contrato_id: number;
  contrato_numero?: string;
  fornecedor_id: number;
  fornecedor_nome?: string;
  produto_id: number;
  produto_nome?: string;
  unidade?: string;
  quantidade_original: number;
  quantidade_modalidade: number;
  percentual_modalidade: number;
  preco_unitario: number;
  valor_total: number;
  created_at: string;
  updated_at: string;
}

export interface FaturamentoDetalhado extends Faturamento {
  itens: FaturamentoItem[];
  pedido_numero?: string;
  total_modalidades?: number;
}

export interface FaturamentoResumo {
  contrato_id: number;
  contrato_numero: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  modalidades: {
    modalidade_id: number;
    modalidade_nome: string;
    modalidade_codigo_financeiro?: string;
    itens: {
      produto_id: number;
      produto_nome: string;
      unidade: string;
      quantidade_total: number;
      valor_total: number;
    }[];
    quantidade_total: number;
    valor_total: number;
  }[];
  quantidade_total: number;
  valor_total: number;
}

export interface GerarFaturamentoRequest {
  pedido_id: number;
  observacoes?: string;
}

export interface ModalidadeCalculo {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
  percentual: number;
}

export interface ItemCalculado {
  pedido_item_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_original: number;
  preco_unitario: number;
  valor_original: number;
  divisoes: {
    modalidade_id: number;
    modalidade_nome: string;
    modalidade_codigo_financeiro?: string;
    quantidade: number;
    percentual: number;
    valor: number;
  }[];
}

export interface ContratoCalculado {
  contrato_id: number;
  contrato_numero: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  itens: ItemCalculado[];
  quantidade_total: number;
  valor_total: number;
}

export interface FaturamentoPrevia {
  pedido_id: number;
  pedido_numero: string;
  modalidades: ModalidadeCalculo[];
  contratos: ContratoCalculado[];
  resumo: {
    total_contratos: number;
    total_fornecedores: number;
    total_modalidades: number;
    total_itens: number;
    quantidade_total: number;
    valor_total: number;
  };
  alertas?: string[];
}