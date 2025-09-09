// Tipos para o sistema de recebimentos

export interface PedidoPendente {
  id: number;
  numero_pedido: string;
  status: string;
  valor_total: number;
  data_criacao: string;
  total_itens: number;
  total_fornecedores: number;
  fornecedores_faturados: number;
  quantidade_total: number;
  quantidade_recebida_total: number;

}

export interface ItemRecebimento {
  id: number;
  pedido_item_id: number;
  produto_id: number;
  fornecedor_id: number;
  quantidade_esperada: number;
  quantidade_recebida: number;
  status: 'PENDENTE' | 'PARCIAL' | 'RECEBIDO';
  nome_produto: string;
  unidade: string;
  nome_fornecedor: string;
}

export interface RegistrarRecebimentoRequest {
  quantidade: number;
  numero_lote?: string;
  data_validade?: string;
  observacoes?: string;
}

export interface HistoricoRecebimento {
  id: number;
  data: string;
  acao: string;
  descricao: string;
  quantidade: number;
  usuario: string;
}

export interface EstatisticasRecebimento {
  total_itens: number;
  quantidade_total: number;
  quantidade_recebida: number;
  itens_recebidos: number;
  itens_parciais: number;
  itens_pendentes: number;
  total_fornecedores: number;
  fornecedores_faturados: number;
  percentual_recebido: number;
}

export interface RecebimentoDetalhes {
  pedido: PedidoPendente;
  itens: ItemRecebimento[];
}

// Filtros para listagem
export interface FiltrosRecebimento {
  page?: number;
  limit?: number;
  busca?: string;
  status?: string;
}