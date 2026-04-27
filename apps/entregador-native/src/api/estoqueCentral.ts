import { api } from './client';

export async function listarProdutos() {
  const response = await api.get('/produtos');
  return response.data.data || response.data || [];
}

export interface EstoqueCentral {
  id?: number;
  produto_id: number;
  produto_nome: string;
  produto_unidade?: string;
  unidade: string;
  categoria?: string;
  quantidade: number;
  quantidade_reservada: number;
  quantidade_disponivel: number;
}

export interface Movimentacao {
  id: number;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia' | string;
  quantidade: number;
  escola_id?: number;
  escola_nome?: string | null;
  quantidade_anterior?: number;
  quantidade_posterior?: number;
  motivo?: string;
  observacao?: string;
  observacoes?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  usuario_nome?: string;
  created_at: string;
  data_movimentacao?: string;
  tipo_evento?: string;
  produto_nome?: string;
  unidade?: string;
}

export interface Escola {
  id: number;
  nome: string;
}

export interface EntradaData {
  produto_id: number;
  quantidade: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
}

export interface SaidaData {
  produto_id: number;
  quantidade: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
}

export interface AjusteData {
  produto_id: number;
  quantidade_nova: number;
  motivo: string;
  observacao?: string;
}

export interface TransferenciaData {
  escola_id: number;
  produto_id: number;
  quantidade: number;
  motivo?: string;
  observacao?: string;
}

function mapTipoEvento(tipoEvento?: string): Movimentacao['tipo'] {
  switch (tipoEvento) {
    case 'recebimento_central':
    case 'entrada_manual_central':
      return 'entrada';
    case 'saida_central':
      return 'saida';
    case 'transferencia_para_escola':
    case 'transferencia_escola':
      return 'transferencia';
    case 'ajuste_estoque':
      return 'ajuste';
    default:
      return tipoEvento || 'movimentacao';
  }
}

function normalizarMovimentacao(item: any): Movimentacao {
  const tipo = item.tipo ?? mapTipoEvento(item.tipo_evento);
  const quantidadeBruta = Number(item.quantidade ?? item.quantidade_movimentada ?? 0);
  const quantidade = tipo === 'saida' || tipo === 'transferencia'
    ? -Math.abs(quantidadeBruta)
    : quantidadeBruta;

  return {
    ...item,
    id: Number(item.id),
    tipo,
    quantidade,
    escola_id: item.escola_id ? Number(item.escola_id) : undefined,
    escola_nome: item.escola_nome ?? null,
    motivo: item.motivo ?? item.observacao ?? item.observacoes ?? undefined,
    observacao: item.observacao ?? item.observacoes ?? undefined,
    created_at: item.created_at ?? item.data_movimentacao ?? item.data_evento ?? new Date().toISOString(),
    data_movimentacao: item.data_movimentacao ?? item.created_at ?? item.data_evento,
    unidade: item.unidade ?? item.produto_unidade,
  };
}

export async function listarEscolas(): Promise<Escola[]> {
  const response = await api.get('/escolas');
  return response.data.escolas || response.data.data || response.data || [];
}

export async function listarEstoqueCentral(): Promise<EstoqueCentral[]> {
  const response = await api.get('/estoque-central');
  const rows = response.data.estoque || response.data.data || response.data || [];
  return rows.map((item: any) => ({
    ...item,
    id: item.id ?? item.produto_id,
    unidade: item.unidade ?? item.produto_unidade ?? 'UN',
    quantidade: Number(item.quantidade ?? item.quantidade_total ?? 0),
    quantidade_disponivel: Number(item.quantidade_disponivel ?? item.quantidade ?? item.quantidade_total ?? 0),
    quantidade_reservada: Number(item.quantidade_reservada ?? 0),
  }));
}

export async function buscarEstoquePorProduto(produtoId: number): Promise<EstoqueCentral> {
  const response = await api.get(`/estoque-central/produto/${produtoId}`);
  return response.data;
}

export async function registrarEntrada(dados: EntradaData): Promise<Movimentacao> {
  const response = await api.post('/estoque-central/entrada', dados);
  return response.data;
}

export async function simularSaida(dados: SaidaData): Promise<any> {
  const response = await api.post('/estoque-central/simular-saida', dados);
  return response.data;
}

export async function registrarSaida(dados: SaidaData): Promise<Movimentacao> {
  const response = await api.post('/estoque-central/saida', dados);
  return response.data;
}

export async function registrarAjuste(dados: AjusteData): Promise<Movimentacao> {
  const response = await api.post('/estoque-central/ajuste', dados);
  return response.data;
}

export async function registrarTransferencia(dados: TransferenciaData): Promise<Movimentacao> {
  const response = await api.post('/estoque-central/transferencias', dados);
  return response.data;
}

export async function listarMovimentacoes(
  estoqueId?: number,
  tipo?: string,
  limit = 50
): Promise<Movimentacao[]> {
  let url = `/estoque-central/movimentacoes?limit=${limit}`;
  if (estoqueId) url += `&estoque_id=${estoqueId}`;
  if (tipo) url += `&tipo=${tipo}`;

  const response = await api.get(url);
  const rows = response.data.movimentacoes || response.data.data || response.data || [];
  return rows.map(normalizarMovimentacao);
}

export async function listarEstoqueBaixo(): Promise<any[]> {
  const response = await api.get('/estoque-central/alertas/estoque-baixo');
  return response.data.produtos || response.data;
}
