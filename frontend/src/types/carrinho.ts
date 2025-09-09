// Types for cart functionality

export interface ProdutoContrato {
  produto_id: number;
  nome_produto: string;
  unidade: string;
  contrato_id: number;
  numero_contrato: string;
  fornecedor_id: number;
  nome_fornecedor: string;
  preco_contratual: number;
  quantidade_contratual: number;
  quantidade_disponivel: number;
  contrato_ativo: boolean;
  data_inicio: string;
  data_fim: string;
}

export interface CarrinhoItem {
  id: number;
  usuario_id: number;
  produto_id: number;
  contrato_id: number;
  fornecedor_id: number;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
  updated_at: string;
  // Campos adicionais para exibição
  nome_produto?: string;
  nome_fornecedor?: string;
  unidade?: string;
}

export interface CarrinhoAgrupado {
  fornecedor_id: number;
  nome_fornecedor: string;
  itens: CarrinhoItem[];
  subtotal: number;
}

export interface AdicionarItemRequest {
  produto_id: number;
  contrato_id: number;
  fornecedor_id: number;
  quantidade: number;
  preco_unitario: number;
}

export interface AtualizarQuantidadeRequest {
  item_id: number;
  quantidade: number;
}

export interface ConfirmarPedidoRequest {
  fornecedor_id?: number;
  observacoes?: string;
  data_entrega_prevista?: string | null;
}

export interface ConfirmarPedidoResponse {
  pedido: {
    id: number;
    numero_pedido: string;
    valor_total: number;
    status: string;
  };
  numero_pedido?: string;
  total_fornecedores: number;
  valor_total: number;
}