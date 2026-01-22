export interface Pedido {
  id: number;
  numero: string;
  fornecedores_nomes?: string;
  total_fornecedores?: number;
  data_pedido: string;
  status: 'rascunho' | 'pendente' | 'aprovado' | 'em_separacao' | 'enviado' | 'entregue' | 'cancelado';
  valor_total: number;
  observacoes?: string;
  usuario_criacao_id: number;
  usuario_criacao_nome?: string;
  usuario_aprovacao_id?: number;
  usuario_aprovacao_nome?: string;
  data_aprovacao?: string;
  total_itens?: number;
  quantidade_total?: number;
  created_at: string;
  updated_at: string;
}

export interface PedidoItem {
  id?: number;
  pedido_id?: number;
  contrato_produto_id: number;
  produto_id: number;
  produto_nome?: string;
  unidade?: string;
  quantidade: number;
  preco_unitario: number;
  preco_contrato?: number;
  quantidade_contratada?: number;
  valor_total: number;
  data_entrega_prevista?: string;
  observacoes?: string;
  contrato_id?: number;
  contrato_numero?: string;
  fornecedor_id?: number;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  saldo_disponivel?: number;
}

export interface PedidoDetalhado extends Pedido {
  itens: PedidoItem[];
}

export interface CriarPedidoDTO {
  observacoes?: string;
  salvar_como_rascunho?: boolean;
  itens: {
    contrato_produto_id: number;
    quantidade: number;
    data_entrega_prevista?: string;
    observacoes?: string;
  }[];
}

export interface AtualizarPedidoDTO {
  observacoes?: string;
}

export interface PedidoFiltros {
  status?: string;
  contrato_id?: number;
  escola_id?: number;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  limit?: number;
}

export interface PedidoEstatisticas {
  resumo: {
    total_pedidos: number;
    pendentes: number;
    aprovados: number;
    em_separacao: number;
    enviados: number;
    entregues: number;
    cancelados: number;
    valor_total: number;
    valor_aprovado: number;
    valor_entregue: number;
  };
  por_mes: {
    mes: string;
    total_pedidos: number;
    valor_total: number;
  }[];
  por_escola: {
    escola_nome: string;
    total_pedidos: number;
    valor_total: number;
  }[];
}

export interface ContratoProduto {
  contrato_produto_id: number;
  produto_id: number;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  preco_unitario: number;
  quantidade_contratada: number;
  saldo_disponivel: number;
  contrato_id: number;
  contrato_numero: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  fornecedor_cnpj?: string;
}

export const STATUS_PEDIDO = {
  rascunho: { label: 'Rascunho', color: 'default' },
  pendente: { label: 'Pendente', color: 'warning' },
  aprovado: { label: 'Aprovado', color: 'info' },
  em_separacao: { label: 'Em Separação', color: 'primary' },
  enviado: { label: 'Enviado', color: 'secondary' },
  entregue: { label: 'Entregue', color: 'success' },
  cancelado: { label: 'Cancelado', color: 'error' }
} as const;

export const STATUS_CORES = {
  rascunho: '#9e9e9e',
  pendente: '#ff9800',
  aprovado: '#2196f3',
  em_separacao: '#3f51b5',
  enviado: '#9c27b0',
  entregue: '#4caf50',
  cancelado: '#f44336'
} as const;
