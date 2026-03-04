import client from './client';

export interface PedidoPendente {
  id: number;
  numero: string;
  data_pedido: string;
  status: string;
  valor_total: number;
  competencia_mes_ano: string;
  total_itens: number;
  total_fornecedores: number;
  valor_recebido: number;
}

export interface FornecedorPedido {
  id: number;
  nome: string;
  cnpj: string;
  total_itens: number;
  valor_total: number;
  valor_recebido: number;
  total_recebimentos: number;
}

export interface ItemPedido {
  id: number;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  data_entrega_prevista: string;
  observacoes: string;
  produto_id: number;
  produto_nome: string;
  unidade: string;
  contrato_numero: string;
  quantidade_recebida: number;
  saldo_pendente: number;
  total_recebimentos: number;
}

export interface Recebimento {
  id: number;
  pedido_id: number;
  pedido_item_id: number;
  quantidade_recebida: number;
  data_recebimento: string;
  observacoes: string;
  usuario_id: number;
  usuario_nome: string;
}

export const recebimentosAPI = {
  // Listar pedidos pendentes
  async listarPedidosPendentes(): Promise<PedidoPendente[]> {
    const response = await client.get('/recebimentos/pedidos-pendentes');
    return response.data.data;
  },

  // Listar fornecedores de um pedido
  async listarFornecedores(pedidoId: number): Promise<FornecedorPedido[]> {
    const response = await client.get(`/recebimentos/pedidos/${pedidoId}/fornecedores`);
    return response.data.data;
  },

  // Listar itens de um fornecedor
  async listarItens(pedidoId: number, fornecedorId: number): Promise<ItemPedido[]> {
    const response = await client.get(`/recebimentos/pedidos/${pedidoId}/fornecedores/${fornecedorId}/itens`);
    return response.data.data;
  },

  // Registrar recebimento
  async registrarRecebimento(data: {
    pedidoId: number;
    pedidoItemId: number;
    quantidadeRecebida: number;
    observacoes?: string;
  }): Promise<any> {
    const response = await client.post('/recebimentos/registrar', data);
    return response.data;
  },

  // Listar recebimentos de um item
  async listarRecebimentosItem(pedidoItemId: number): Promise<Recebimento[]> {
    const response = await client.get(`/recebimentos/itens/${pedidoItemId}/recebimentos`);
    return response.data.data;
  },

  // Histórico de recebimentos de um pedido
  async historicoRecebimentos(pedidoId: number): Promise<any[]> {
    const response = await client.get(`/recebimentos/pedidos/${pedidoId}/historico`);
    return response.data.data;
  }
};
