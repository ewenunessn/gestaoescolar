import { apiWithRetry } from "./api";

export interface ItemFaturamento {
  pedido_item_id: number;
  modalidade_id: number;
  quantidade_alocada: number;
  preco_unitario: number;
}

export interface ConfiguracaoAlocacaoAgricultura {
  ativo: boolean;
  percentual_agricultura: number;
  modalidade_base_ids: number[];
  fornecedor_tipos_agricultura: string[];
  distribuir_excedente: boolean;
}

export interface AlocacaoAtualPreview {
  pedido_item_id: number;
  quantidade_alocada: number;
}

export interface ItemAlocacaoAutomatica {
  pedido_item_ids: number[];
  contrato_produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_pedido: number;
  quantidade_disponivel: number;
  preco_unitario: number;
  tipo_fornecedor: string;
  modalidade_id: number;
  modalidade_nome: string;
  quantidade_alocada: number;
  valor_alocado: number;
  origem_regra: 'agricultura_reservada' | 'excedente_proporcional' | 'proporcional';
}

export interface ModalidadeAlocacaoBase {
  id: number;
  nome: string;
  valor_repasse: number;
}

export interface ResultadoAlocacaoAutomatica {
  regra: ConfiguracaoAlocacaoAgricultura;
  modalidades_base: ModalidadeAlocacaoBase[];
  itens: ItemAlocacaoAutomatica[];
  resumo: {
    quantidade_total_disponivel: number;
    quantidade_total_alocada: number;
    quantidade_nao_alocada: number;
    valor_total_alocado: number;
    valor_total_repasses: number;
    valor_meta_agricultura: number;
    valor_capacidade_agricultura: number;
    valor_reservado_agricultura: number;
    percentual_reservado_agricultura: number;
    valor_faltante_reserva: number;
    valor_total_itens: number;
    valor_itens_agricultura: number;
    valor_meta_itens_agricultura: number;
    percentual_itens_agricultura: number;
    valor_faltante_itens_agricultura: number;
    meta_itens_agricultura_atingida: boolean;
  };
  snapshot: {
    regra: ConfiguracaoAlocacaoAgricultura;
    modalidades_base: ModalidadeAlocacaoBase[];
    resumo: ResultadoAlocacaoAutomatica['resumo'];
    gerado_em: string;
  };
}

export interface FaturamentoInput {
  pedido_id: number;
  observacoes?: string;
  itens: ItemFaturamento[];
  alocacao_agricultura_snapshot?: any;
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
  fornecedor_tipo?: string;
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

export async function obterConfiguracaoAlocacaoAutomatica() {
  const { data } = await apiWithRetry.get('/faturamentos/alocacao-automatica/config');
  return data.success ? data.data : null;
}

export async function atualizarConfiguracaoAlocacaoAutomatica(config: ConfiguracaoAlocacaoAgricultura) {
  const { data } = await apiWithRetry.put('/faturamentos/alocacao-automatica/config', config);
  return data.success ? data.data : null;
}

export async function previewAlocacaoAutomatica(input: {
  pedido_id: number;
  pedido_item_ids: number[];
  modalidade_ids: number[];
  faturamento_id?: number;
  alocacoes_atuais?: AlocacaoAtualPreview[];
}): Promise<ResultadoAlocacaoAutomatica> {
  const { data } = await apiWithRetry.post('/faturamentos/alocacao-automatica/preview', input);
  return data.data;
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
