import { apiWithRetry } from "./api";

export interface LoteEstoque {
  id: number;
  produto_id: number;
  lote: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  data_validade?: string;
  data_fabricacao?: string;
  status: string;
  observacoes?: string;
}

export interface ItemEstoqueEscola {
  id: number;
  escola_id: number;
  produto_id: number;
  quantidade_atual: number;
  quantidade_minima: number;
  quantidade_maxima: number;
  data_ultima_atualizacao: string;
  observacoes?: string;
  ativo: boolean;
  produto_nome: string;
  produto_descricao?: string;
  unidade: string;
  categoria: string;
  escola_nome: string;
  status_estoque: 'sem_estoque' | 'baixo' | 'normal' | 'alto';
  lotes?: LoteEstoque[];
}

export interface HistoricoEstoque {
  id: number;
  estoque_escola_id: number;
  escola_id: number;
  produto_id: number;
  tipo_movimentacao: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  quantidade_anterior: number;
  quantidade_movimentada: number;
  quantidade_posterior: number;
  motivo?: string;
  documento_referencia?: string;
  usuario_id?: number;
  data_movimentacao: string;
  observacoes?: string;
  produto_nome: string;
  unidade: string;
  usuario_nome?: string;
}

export interface ResumoEstoque {
  total_produtos: number;
  produtos_com_estoque: number;
  produtos_sem_estoque: number;
  quantidade_total: number;
  ultima_atualizacao?: string;
}

export interface AtualizacaoLote {
  produto_id: number;
  quantidade_atual: number;
  observacoes?: string;
}

// Listar estoque de uma escola
export async function listarEstoqueEscola(escolaId: number): Promise<ItemEstoqueEscola[]> {
  const { data } = await apiWithRetry.get(`/estoque-escola/escola/${escolaId}`);
  return data.data || [];
}

// Obter resumo do estoque
export async function obterResumoEstoque(escolaId: number): Promise<ResumoEstoque> {
  const { data } = await apiWithRetry.get(`/estoque-escola/escola/${escolaId}/resumo`);
  return data.data;
}

// Listar histórico de movimentações
export async function listarHistoricoEstoque(
  escolaId: number, 
  produtoId?: number, 
  limite: number = 50
): Promise<HistoricoEstoque[]> {
  const params = new URLSearchParams();
  if (produtoId) params.append('produto_id', produtoId.toString());
  if (limite) params.append('limite', limite.toString());
  
  const { data } = await apiWithRetry.get(
    `/estoque-escola/escola/${escolaId}/historico?${params.toString()}`
  );
  return data.data || [];
}

// Buscar item específico do estoque
export async function buscarItemEstoque(itemId: number): Promise<ItemEstoqueEscola> {
  const { data } = await apiWithRetry.get(`/estoque-escola/${itemId}`);
  return data.data;
}

// Atualizar quantidade de um item específico
export async function atualizarQuantidadeItem(
  itemId: number,
  dadosAtualizacao: {
    quantidade_atual: number;
    quantidade_minima?: number;
    quantidade_maxima?: number;
    observacoes?: string;
    usuario_id?: number;
  }
): Promise<ItemEstoqueEscola> {
  const { data } = await apiWithRetry.put(`/estoque-escola/${itemId}`, dadosAtualizacao);
  return data.data;
}

// Atualizar quantidades em lote
export async function atualizarLoteQuantidades(
  escolaId: number,
  itens: AtualizacaoLote[],
  usuarioId?: number
): Promise<ItemEstoqueEscola[]> {
  const { data } = await apiWithRetry.put(`/estoque-escola/escola/${escolaId}/lote`, {
    itens,
    usuario_id: usuarioId
  });
  return data.data || [];
}

// Inicializar estoque para uma escola
export async function inicializarEstoqueEscola(escolaId: number): Promise<ItemEstoqueEscola[]> {
  const { data } = await apiWithRetry.post(`/estoque-escola/escola/${escolaId}/inicializar`);
  return data.data || [];
}

// Registrar movimentação (entrada, saída, ajuste)
export async function registrarMovimentacao(
  escolaId: number,
  dadosMovimentacao: {
    produto_id: number;
    tipo_movimentacao: 'entrada' | 'saida' | 'ajuste';
    quantidade: number;
    motivo?: string;
    documento_referencia?: string;
    usuario_id?: number;
    data_validade?: string;
  }
): Promise<{estoque: ItemEstoqueEscola, historico: HistoricoEstoque}> {
  const { data } = await apiWithRetry.post(`/estoque-escola/escola/${escolaId}/movimentacao`, dadosMovimentacao);
  return data.data;
}