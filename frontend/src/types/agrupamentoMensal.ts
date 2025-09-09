export interface AgrupamentoMensal {
  id: number;
  ano: number;
  mes: number;
  descricao: string;
  status: string;
  total_pedidos: number;
  valor_total: number;
  data_criacao: string;
  data_atualizacao: string;
  total_fornecedores?: number;
  fornecedores_completos?: number;
  fornecedores_parciais?: number;
  fornecedores_pendentes?: number;
}



export interface PedidoAgrupamento {
  pedido_id: number;
  numero_pedido: string;
  valor_total: number;
  status_pedido: string;
  data_criacao: string;
  total_fornecedores: number;
  fornecedores_faturados: number;
}

export interface AgrupamentoDetalhes {
  agrupamento: AgrupamentoMensal;
  pedidos: PedidoAgrupamento[];
}

export interface CriarAgrupamentoRequest {
  ano: number;
  mes: number;
  descricao?: string;
}

export interface AdicionarPedidoAgrupamentoRequest {
  agrupamento_id: number;
  pedido_id: number;
}



export interface FiltrosAgrupamento {
  ano?: number;
  mes?: number;
  status?: string;
}

export interface FiltrosPedidosPendentes {
  ano: number;
  mes: number;
}