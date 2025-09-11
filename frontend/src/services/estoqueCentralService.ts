import api from "./api";

// Interfaces
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
  status: 'ativo' | 'vencido' | 'bloqueado';
  created_at: string;
  updated_at: string;
}

export interface MovimentacaoEstoque {
  id: number;
  lote_id: number;
  produto_id: number;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | 'perda';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  motivo: string;
  documento_referencia: string | null;
  usuario_id: number;
  data_movimentacao: string;
  observacoes: string | null;
  lote?: string;
  usuario_nome?: string;
  // Campos de rastreabilidade
  recebimento_id?: number;
  numero_recebimento?: string;
  pedido_id?: number;
  numero_pedido?: string;
  usuario_recebedor_id?: number;
  usuario_recebedor_nome?: string;
}

export interface AlertaEstoque {
  id: number;
  produto_id: number;
  lote_id: number | null;
  tipo: 'vencimento_proximo' | 'vencido' | 'estoque_baixo' | 'estoque_zerado';
  nivel: 'info' | 'warning' | 'critical';
  titulo: string;
  descricao: string;
  data_alerta: string;
  visualizado: boolean;
  resolvido: boolean;
  produto_nome?: string;
  lote?: string;
}

// Funções de consulta
export async function getPosicaoEstoque(mostrarTodos: boolean = false): Promise<EstoquePosicao[]> {
  const params = mostrarTodos ? { mostrarTodos: 'true' } : {};
  const { data } = await api.get("/estoque-central/posicao", { params });
  return data.data;
}

export async function getLotesProduto(produto_id: number, apenasAtivos = true): Promise<EstoqueLote[]> {
  const { data } = await api.get(`/estoque-central/produtos/${produto_id}/lotes`, {
    params: { apenas_ativos: apenasAtivos }
  });
  return data.data;
}

export async function getMovimentacoesProduto(produto_id: number, limite = 50): Promise<MovimentacaoEstoque[]> {
  const { data } = await api.get(`/estoque-central/produtos/${produto_id}/movimentacoes`, {
    params: { limite }
  });
  return data.data;
}

export async function getAlertas(apenasNaoResolvidos = true): Promise<AlertaEstoque[]> {
  const { data } = await api.get("/estoque-central/alertas", {
    params: { apenas_nao_resolvidos: apenasNaoResolvidos }
  });
  return data.data;
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

// Funções de entrada
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

// Funções de saída
export async function processarSaidaEstoque(dados: {
  produto_id: number;
  quantidade: number;
  motivo: string;
  documento_referencia?: string;
  observacoes?: string;
}): Promise<MovimentacaoEstoque[]> {
  const { data } = await api.post("/estoque-central/saidas", dados);
  return data.data.movimentacoes;
}

// Funções de alertas
export async function atualizarAlertas(produto_id?: number): Promise<void> {
  await api.post("/estoque-central/alertas/atualizar", {
    produto_id
  });
}

export async function resolverAlerta(alerta_id: number): Promise<void> {
  await api.put(`/estoque-central/alertas/${alerta_id}/resolver`);
}

// Funções utilitárias
export function formatarQuantidade(quantidade: number, unidade: string): string {
  return `${quantidade.toLocaleString('pt-BR')} ${unidade}`;
}



export function formatarData(data: string | null): string {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

export function formatarDataHora(data: string): string {
  return new Date(data).toLocaleString('pt-BR');
}

export function getStatusLoteColor(status: string): string {
  switch (status) {
    case 'ativo':
      return 'success';
    case 'vencido':
      return 'error';
    case 'bloqueado':
      return 'warning';
    case 'esgotado':
      return 'default';
    default:
      return 'default';
  }
}

export function getStatusLoteLabel(status: string): string {
  switch (status) {
    case 'ativo':
      return 'Ativo';
    case 'vencido':
      return 'Vencido';
    case 'bloqueado':
      return 'Bloqueado';
    case 'esgotado':
      return 'Esgotado';
    default:
      return status;
  }
}

export function getTipoMovimentacaoColor(tipo: string): string {
  switch (tipo) {
    case 'entrada':
      return 'success';
    case 'saida':
      return 'info';
    case 'ajuste':
      return 'warning';
    case 'transferencia':
      return 'primary';
    case 'perda':
      return 'error';
    default:
      return 'default';
  }
}

export function getTipoMovimentacaoLabel(tipo: string): string {
  switch (tipo) {
    case 'entrada':
      return 'Entrada';
    case 'saida':
      return 'Saída';
    case 'ajuste':
      return 'Ajuste';
    case 'transferencia':
      return 'Transferência';
    case 'perda':
      return 'Perda';
    default:
      return tipo;
  }
}

export function getNivelAlertaColor(nivel: string): string {
  switch (nivel) {
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
    default:
      return 'default';
  }
}

export function calcularDiasParaVencimento(dataValidade: string | null): number | null {
  if (!dataValidade) return null;
  
  const hoje = new Date();
  const vencimento = new Date(dataValidade);
  const diffTime = vencimento.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

export function isVencimentoProximo(dataValidade: string | null, diasAlerta = 7): boolean {
  const dias = calcularDiasParaVencimento(dataValidade);
  return dias !== null && dias <= diasAlerta && dias > 0;
}

export function isVencido(dataValidade: string | null): boolean {
  const dias = calcularDiasParaVencimento(dataValidade);
  return dias !== null && dias < 0;
}