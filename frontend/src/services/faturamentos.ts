import { apiWithRetry } from "./api";

export interface ItemFaturamento {
  pedido_item_id: number;
  modalidade_id: number;
  quantidade_alocada: number;
  preco_unitario: number;
}

export interface FaturamentoInput {
  pedido_id: number;
  observacoes?: string;
  itens: ItemFaturamento[];
}

export interface FaturamentoDetalhado {
  faturamento_id: number;
  pedido_id: number;
  pedido_numero: string;
  data_pedido: string;
  competencia_mes_ano: string;
  data_faturamento: string;
  faturamento_observacoes: string;
  usuario_nome: string;
  item_id: number;
  pedido_item_id: number;
  modalidade_id: number;
  modalidade_nome: string;
  modalidade_repasse: number;
  quantidade_alocada: number;
  preco_unitario: number;
  valor_total: number;
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_pedido: number;
  contrato_numero: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
}

export interface FaturamentoResumo {
  faturamento_id: number;
  pedido_id: number;
  pedido_numero: string;
  modalidade_id: number;
  modalidade_nome: string;
  modalidade_repasse: number;
  total_itens: number;
  quantidade_total: number;
  valor_total_modalidade: number;
}

// Criar faturamento
export async function criarFaturamento(faturamento: FaturamentoInput) {
  const { data } = await apiWithRetry.post("/faturamentos", faturamento);
  return data;
}

// Atualizar faturamento
export async function atualizarFaturamento(id: number, faturamento: Omit<FaturamentoInput, 'pedido_id'>) {
  const { data } = await apiWithRetry.put(`/faturamentos/${id}`, faturamento);
  return data;
}

// Listar faturamentos de um pedido
export async function listarFaturamentosPedido(pedidoId: number): Promise<FaturamentoDetalhado[]> {
  const { data } = await apiWithRetry.get(`/faturamentos/pedido/${pedidoId}`);
  return data.success ? data.data : [];
}

// Buscar resumo de faturamento por modalidades
export async function resumoFaturamentoPedido(pedidoId: number): Promise<FaturamentoResumo[]> {
  const { data } = await apiWithRetry.get(`/faturamentos/pedido/${pedidoId}/resumo`);
  return data.success ? data.data : [];
}

// Buscar detalhes de um faturamento específico
export async function buscarFaturamento(id: number): Promise<FaturamentoDetalhado[]> {
  const { data } = await apiWithRetry.get(`/faturamentos/${id}`);
  return data.success ? data.data : [];
}

// Deletar faturamento
export async function deletarFaturamento(id: number) {
  const { data } = await apiWithRetry.delete(`/faturamentos/${id}`);
  return data;
}


// Relatório: Tipo de fornecedor por modalidade
export async function relatorioTipoFornecedorModalidade(faturamentoId: number) {
  const { data } = await apiWithRetry.get(`/faturamentos/${faturamentoId}/relatorio-tipo-fornecedor`);
  return data.success ? data.data : [];
}
