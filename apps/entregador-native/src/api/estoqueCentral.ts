import { api } from './client';

export interface EstoqueCentral {
  id: number;
  produto_id: number;
  produto_nome: string;
  unidade: string;
  categoria?: string;
  quantidade: number;
  quantidade_reservada: number;
  quantidade_disponivel: number;
  total_lotes: number;
  proxima_validade?: string;
}

export interface Lote {
  id: number;
  estoque_central_id: number;
  lote: string;
  data_fabricacao?: string;
  data_validade: string;
  quantidade: number;
  quantidade_disponivel: number;
  observacao?: string;
}

export interface Movimentacao {
  id: number;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  usuario_nome?: string;
  created_at: string;
  produto_nome?: string;
  unidade?: string;
}

export interface EntradaData {
  produto_id: number;
  quantidade: number;
  lote?: string;
  data_fabricacao?: string;
  data_validade?: string;
  motivo?: string;
  observacao?: string;
  documento?: string;
  fornecedor?: string;
  nota_fiscal?: string;
}

export interface SaidaData {
  produto_id: number;
  quantidade: number;
  lote_id?: number;
  motivo?: string;
  observacao?: string;
  documento?: string;
}

export interface AjusteData {
  produto_id: number;
  quantidade_nova: number;
  lote_id?: number;
  motivo: string;
  observacao?: string;
}

export async function listarEstoqueCentral(): Promise<EstoqueCentral[]> {
  const response = await api.get('/estoque-central');
  return response.data.estoque || response.data;
}

export async function buscarEstoquePorProduto(produtoId: number): Promise<EstoqueCentral> {
  const response = await api.get(`/estoque-central/produto/${produtoId}`);
  return response.data;
}

export async function listarLotes(estoqueId: number): Promise<Lote[]> {
  const response = await api.get(`/estoque-central/${estoqueId}/lotes`);
  return response.data.lotes || response.data;
}

export async function registrarEntrada(dados: EntradaData): Promise<Movimentacao> {
  const response = await api.post('/estoque-central/entrada', dados);
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

export async function listarMovimentacoes(
  estoqueId?: number,
  tipo?: string,
  limit = 50
): Promise<Movimentacao[]> {
  let url = `/estoque-central/movimentacoes?limit=${limit}`;
  if (estoqueId) url += `&estoque_id=${estoqueId}`;
  if (tipo) url += `&tipo=${tipo}`;
  
  const response = await api.get(url);
  return response.data.movimentacoes || response.data;
}

export async function listarLotesProximosVencimento(dias = 30): Promise<any[]> {
  const response = await api.get(`/estoque-central/alertas/vencimento?dias=${dias}`);
  return response.data.lotes || response.data;
}

export async function listarEstoqueBaixo(): Promise<any[]> {
  const response = await api.get('/estoque-central/alertas/estoque-baixo');
  return response.data.produtos || response.data;
}
