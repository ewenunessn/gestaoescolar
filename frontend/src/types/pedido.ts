export interface Pedido {
  id: number;
  numero_pedido: string;
  status: 'rascunho' | 'pendente' | 'aprovado' | 'em_andamento' | 'entregue' | 'cancelado';
  valor_total: number;
  data_criacao: string;
  data_entrega?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  pedidos?: Pedido[]; // Para compatibilidade com algumas respostas da API
}

export interface PedidoModerno extends Pedido {
  tipo_pedido?: string;
}

export interface CriarPedidoRequest {
  data_entrega?: string;
  observacoes?: string;
  itens?: ItemPedidoRequest[];
}

export interface ItemPedidoRequest {
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  contrato_id?: number;
}

export interface ItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  quantidade: number;
  quantidade_recebida: number;
  preco_unitario: number;
  valor_total: number;
  contrato_id?: number;
  created_at: string;
  updated_at: string;
  // Dados relacionados
  produto_nome?: string;
  unidade?: string;
  fornecedor_nome?: string;
}

export interface StatusItemPedido {
  item_id: number;
  produto_nome: string;
  quantidade_pedida: number;
  quantidade_recebida: number;
  quantidade_pendente: number;
  status: 'pendente' | 'parcial' | 'completo';
  percentual_recebido: number;
}

export interface HistoricoPedido {
  id: number;
  pedido_id: number;
  status_anterior: string;
  status_novo: string;
  observacoes?: string;
  usuario_id: number;
  created_at: string;
  // Dados relacionados
  usuario_nome?: string;
}

export interface AtualizarStatusPedidoRequest {
  status: 'rascunho' | 'pendente' | 'aprovado' | 'em_andamento' | 'entregue' | 'cancelado';
  observacoes?: string;
}

export interface AtualizarDataEntregaRequest {
  data_entrega: string;
  observacoes?: string;
}

export interface AtualizarObservacoesPedidoRequest {
  observacoes: string;
}