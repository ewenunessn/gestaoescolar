import { apiWithRetry } from "./api";

export interface EstoqueEscolarItem {
  produto_id: number;
  produto_nome: string;
  categoria: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number;
  quantidade_maxima: number;
  data_ultima_atualizacao: string | null;
  observacoes: string | null;
}

export interface EstoqueEscolarMovimentacao {
  id: number;
  estoque_escola_id: number;
  escola_id: number;
  produto_id: number;
  tipo_movimentacao: "entrada" | "saida" | "ajuste";
  quantidade_anterior: number;
  quantidade_movimentada: number;
  quantidade_posterior: number;
  usuario_id: number | null;
  data_movimentacao: string;
  observacoes: string | null;
  produto_nome?: string;
  usuario_nome?: string;
}

export async function listarEstoqueEscola(escolaId: number) {
  const { data } = await apiWithRetry.get(`/estoque-escolar/escolas/${escolaId}`);
  return data.data as EstoqueEscolarItem[];
}

export async function listarHistoricoEscola(escolaId: number, limite = 200) {
  const { data } = await apiWithRetry.get(`/estoque-escolar/escolas/${escolaId}/historico`, { params: { limite } });
  return data.data as EstoqueEscolarMovimentacao[];
}

export async function registrarMovimentacao(escolaId: number, payload: {
  produto_id: number;
  tipo_movimentacao: "entrada" | "saida" | "ajuste";
  quantidade: number;
  usuario_id?: number;
  observacoes?: string;
}) {
  const { data } = await apiWithRetry.post(`/estoque-escolar/escolas/${escolaId}/movimentacoes`, payload);
  return data.data;
}
