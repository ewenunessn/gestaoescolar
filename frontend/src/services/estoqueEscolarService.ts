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
  escola_id: number;
  produto_id: number;
  tipo_movimentacao: "entrada" | "saida" | "ajuste";
  tipo_evento?: "entrada_manual_escola" | "saida_escola" | "ajuste_estoque" | "transferencia_para_escola" | "recebimento_central" | "estorno_evento";
  origem?: "portal_escola" | "central_operador" | "recebimento" | "transferencia" | "estorno" | "sistema";
  quantidade_anterior?: number;
  quantidade_movimentada: number;
  quantidade_posterior?: number;
  quantidade_absoluta?: number | null;
  motivo?: string | null;
  usuario_id: number | null;
  data_movimentacao: string;
  observacoes: string | null;
  produto_nome?: string;
  usuario_nome?: string;
}

export interface ConfiguracaoOperacaoEscola {
  escola_id: number;
  modo_operacao: "escola" | "central" | "hibrido";
  permite_ajuste_escola: boolean;
  permite_lancamento_central: boolean;
}

export interface RegistrarEventoEscolarPayload {
  produto_id: number;
  tipo_movimentacao: "entrada" | "saida" | "ajuste";
  quantidade: number;
  motivo?: string;
  observacoes?: string;
  origem?: "portal_escola" | "central_operador";
  usuario_id?: number;
}

export async function listarEstoqueEscola(escolaId: number) {
  const { data } = await apiWithRetry.get(`/estoque-escolar/escolas/${escolaId}/dashboard`);
  return data.data as EstoqueEscolarItem[];
}

export async function listarHistoricoEscola(escolaId: number, limite = 200) {
  const { data } = await apiWithRetry.get(`/estoque-escolar/escolas/${escolaId}/eventos`, { params: { limite } });
  return (data.data as any[]).map((item) => ({
    id: Number(item.id),
    escola_id: Number(item.escola_id),
    produto_id: Number(item.produto_id),
    tipo_movimentacao:
      item.tipo_evento === "saida_escola"
        ? "saida"
        : item.tipo_evento === "ajuste_estoque"
          ? "ajuste"
          : "entrada",
    tipo_evento: item.tipo_evento,
    origem: item.origem,
    quantidade_movimentada: Math.abs(Number(item.quantidade_delta ?? 0)),
    quantidade_absoluta: item.quantidade_absoluta !== undefined && item.quantidade_absoluta !== null
      ? Number(item.quantidade_absoluta)
      : null,
    motivo: item.motivo ?? null,
    usuario_id: item.usuario_id ? Number(item.usuario_id) : null,
    data_movimentacao: item.data_movimentacao,
    observacoes: item.observacoes ?? null,
    produto_nome: item.produto_nome,
    usuario_nome: item.usuario_nome,
  })) as EstoqueEscolarMovimentacao[];
}

export async function buscarConfiguracaoOperacaoEscola(escolaId: number) {
  const { data } = await apiWithRetry.get(`/estoque-escolar/escolas/${escolaId}/operacao`);
  return data.data as ConfiguracaoOperacaoEscola;
}

export async function registrarMovimentacao(escolaId: number, payload: RegistrarEventoEscolarPayload) {
  const { data } = await apiWithRetry.post(`/estoque-escolar/escolas/${escolaId}/movimentacoes`, payload);
  return data.data;
}
