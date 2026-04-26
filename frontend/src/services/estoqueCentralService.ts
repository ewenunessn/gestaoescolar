import api from "./api";

export interface EstoquePosicao {
  produto_id: number;
  produto_nome: string;
  produto_unidade: string;
  quantidade_total: number;
  quantidade_disponivel: number;
  quantidade_reservada: number;
  quantidade_vencida: number;
  lotes_ativos: number;
  proximo_vencimento: string | null;
}

export interface EstoqueLote {
  id: number;
  produto_id: number;
  lote: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  data_fabricacao: string | null;
  data_validade: string | null;
  fornecedor_id: number | null;
  recebimento_id: number | null;
  observacoes: string | null;
  status: "ativo" | "vencido" | "bloqueado";
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoEstoque {
  id: number;
  lote_id?: number;
  produto_id: number;
  tipo:
    | "entrada"
    | "saida"
    | "ajuste"
    | "transferencia"
    | "perda"
    | "recebimento_central"
    | "transferencia_para_escola"
    | "entrada_manual_escola"
    | "saida_central"
    | "saida_escola"
    | "ajuste_estoque"
    | "estorno_evento";
  quantidade: number;
  quantidade_anterior?: number;
  quantidade_posterior?: number;
  motivo: string;
  documento_referencia?: string | null;
  usuario_id?: number;
  data_movimentacao: string;
  observacoes?: string | null;
  lote?: string;
  usuario_nome?: string | null;
  recebimento_id?: number;
  numero_recebimento?: string;
  pedido_id?: number;
  numero_pedido?: string;
  usuario_recebedor_id?: number;
  usuario_recebedor_nome?: string;
}

export interface AlertaEstoque {
  id: number | string;
  produto_id: number;
  lote_id: number | null;
  tipo: "vencimento_proximo" | "vencido" | "estoque_baixo" | "estoque_zerado";
  nivel: "info" | "warning" | "critical";
  titulo: string;
  descricao: string;
  data_alerta: string;
  visualizado: boolean;
  resolvido: boolean;
  produto_nome?: string;
  lote?: string | null;
}

export interface TimelineEventoEstoque {
  id: number;
  escopo: "central" | "escola";
  escola_id?: number;
  escola_nome?: string | null;
  produto_id: number;
  produto_nome: string;
  tipo_evento: string;
  origem: string;
  quantidade_movimentada: number;
  data_movimentacao: string;
  usuario_nome?: string | null;
  motivo?: string | null;
  observacoes?: string | null;
}

export interface RegistrarTransferenciaPayload {
  escola_id: number;
  produto_id: number;
  quantidade: number;
  motivo: string;
  observacao?: string;
}

export interface RegistrarMovimentacaoCentralPayload {
  produto_id: number;
  quantidade: number;
  motivo: string;
  observacao?: string;
}

export async function getPosicaoEstoque(
  mostrarTodos = false,
): Promise<EstoquePosicao[]> {
  const params = mostrarTodos ? { mostrarTodos: "true" } : {};
  const { data } = await api.get("/estoque-central/posicao", { params });
  return data.data ?? data.estoque ?? [];
}

export async function listarPosicaoCentral(mostrarTodos = false): Promise<EstoquePosicao[]> {
  const params = mostrarTodos ? { mostrarTodos: "true" } : {};
  const { data } = await api.get("/estoque-central/posicao", { params });
  return data.data ?? data.estoque ?? [];
}

export async function getLotesProduto(
  produto_id: number,
  apenasAtivos = true,
): Promise<EstoqueLote[]> {
  const { data } = await api.get(`/estoque-central/produtos/${produto_id}/lotes`, {
    params: { apenas_ativos: apenasAtivos },
  });
  return data.data;
}

export async function getMovimentacoesProduto(
  produto_id: number,
  limite = 50,
): Promise<MovimentacaoEstoque[]> {
  const { data } = await api.get(`/estoque-central/produtos/${produto_id}/movimentacoes`, {
    params: { limite },
  });
  return data.data;
}

export async function getAlertas(
  apenasNaoResolvidos = true,
): Promise<AlertaEstoque[]> {
  const { data } = await api.get("/estoque-central/alertas", {
    params: { apenas_nao_resolvidos: apenasNaoResolvidos },
  });
  return data.data ?? [];
}

export async function listarMovimentacoesCentral(
  limite = 20,
): Promise<TimelineEventoEstoque[]> {
  const { data } = await api.get("/estoque-central/movimentacoes", {
    params: { limit: limite },
  });
  return data.data ?? data.movimentacoes ?? [];
}

export async function getDetalhesLote(lote_id: number): Promise<EstoqueLote> {
  const { data } = await api.get(`/estoque-central/lotes/${lote_id}`);
  return data.data;
}

export async function getRastreabilidadeLote(lote_id: number): Promise<{
  lote: EstoqueLote;
  recebimento?: any;
  pedido?: any;
  movimentacoes: MovimentacaoEstoque[];
}> {
  const { data } = await api.get(`/estoque-central/lotes/${lote_id}/rastreabilidade`);
  return data.data;
}

export async function criarLoteEstoque(dados: {
  produto_id: number;
  lote: string;
  quantidade: number;
  data_fabricacao?: string;
  data_validade?: string;
  fornecedor_id?: number;
  observacoes?: string;
}): Promise<EstoqueLote> {
  const { data } = await api.post("/estoque-central/lotes", dados);
  return data.data;
}

export async function registrarEntradaCentral(
  payload: RegistrarMovimentacaoCentralPayload,
): Promise<any> {
  const { data } = await api.post("/estoque-central/entrada", payload);
  return data.data ?? data.movimentacao ?? data;
}

export async function registrarSaidaCentral(
  payload: RegistrarMovimentacaoCentralPayload,
): Promise<any> {
  const { data } = await api.post("/estoque-central/saida", payload);
  return data.data ?? data.movimentacao ?? data;
}

export async function registrarAjusteCentral(payload: {
  produto_id: number;
  quantidade_nova: number;
  motivo: string;
  observacao?: string;
}): Promise<any> {
  const { data } = await api.post("/estoque-central/ajuste", payload);
  return data.data ?? data.movimentacao ?? data;
}

export async function registrarTransferencia(
  payload: RegistrarTransferenciaPayload,
): Promise<any> {
  const { data } = await api.post("/estoque-central/transferencias", payload);
  return data.data ?? data;
}

export async function processarSaidaEstoque(dados: {
  produto_id: number;
  quantidade: number;
  motivo: string;
  documento_referencia?: string;
  observacoes?: string;
}): Promise<MovimentacaoEstoque[]> {
  const { data } = await api.post("/estoque-central/saidas", dados);
  return data.data?.movimentacoes ?? data.movimentacoes ?? [];
}

export async function atualizarAlertas(produto_id?: number): Promise<void> {
  await api.post("/estoque-central/alertas/atualizar", { produto_id });
}

export async function resolverAlerta(alerta_id: number): Promise<void> {
  await api.put(`/estoque-central/alertas/${alerta_id}/resolver`);
}

export function formatarQuantidade(quantidade: number, unidade: string): string {
  return `${Number(quantidade || 0).toLocaleString("pt-BR")} ${unidade}`;
}

export function formatarData(data: string | null): string {
  if (!data) {
    return "-";
  }
  return new Date(data).toLocaleDateString("pt-BR");
}

export function formatarDataHora(data: string): string {
  return new Date(data).toLocaleString("pt-BR");
}

export function getStatusLoteColor(status: string): string {
  switch (status) {
    case "ativo":
      return "success";
    case "vencido":
      return "error";
    case "bloqueado":
      return "warning";
    case "esgotado":
      return "default";
    default:
      return "default";
  }
}

export function getStatusLoteLabel(status: string): string {
  switch (status) {
    case "ativo":
      return "Ativo";
    case "vencido":
      return "Vencido";
    case "bloqueado":
      return "Bloqueado";
    case "esgotado":
      return "Esgotado";
    default:
      return status;
  }
}

export function getTipoMovimentacaoColor(tipo: string): string {
  switch (tipo) {
    case "entrada":
    case "entrada_manual_escola":
    case "recebimento_central":
      return "success";
    case "saida":
    case "saida_central":
    case "saida_escola":
      return "info";
    case "ajuste":
    case "ajuste_estoque":
      return "warning";
    case "transferencia":
    case "transferencia_para_escola":
      return "primary";
    case "perda":
    case "estorno_evento":
      return "error";
    default:
      return "default";
  }
}

export function getTipoMovimentacaoLabel(tipo: string): string {
  switch (tipo) {
    case "entrada":
    case "entrada_manual_escola":
      return "Entrada";
    case "recebimento_central":
      return "Recebimento";
    case "saida":
    case "saida_central":
    case "saida_escola":
      return "Saida";
    case "ajuste":
    case "ajuste_estoque":
      return "Ajuste";
    case "transferencia":
    case "transferencia_para_escola":
      return "Transferencia";
    case "perda":
      return "Perda";
    case "estorno_evento":
      return "Estorno";
    default:
      return tipo;
  }
}

export function getNivelAlertaColor(nivel: string): string {
  switch (nivel) {
    case "info":
      return "info";
    case "warning":
      return "warning";
    case "critical":
      return "error";
    default:
      return "default";
  }
}

export function calcularDiasParaVencimento(dataValidade: string | null): number | null {
  if (!dataValidade) {
    return null;
  }

  const hoje = new Date();
  const vencimento = new Date(dataValidade);
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isVencimentoProximo(
  dataValidade: string | null,
  diasAlerta = 7,
): boolean {
  const dias = calcularDiasParaVencimento(dataValidade);
  return dias !== null && dias <= diasAlerta && dias > 0;
}

export function isVencido(dataValidade: string | null): boolean {
  const dias = calcularDiasParaVencimento(dataValidade);
  return dias !== null && dias < 0;
}
