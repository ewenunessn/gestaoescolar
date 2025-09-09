import api from "./api";

export interface RecebimentoFilters {
  status?: string;
  fornecedor_id?: number;
  data_inicio?: string;
  data_fim?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Iniciar processo de recebimento
export async function iniciarRecebimento(pedido_id: number) {
  const { data } = await api.post("/recebimentos/iniciar", { pedido_id });
  return data.data || data; // Handle both new format {success, data} and old format
}

// Registrar item recebido
export async function registrarItemRecebido(item: {
  recebimento_id: number;
  produto_id: number;
  quantidade_pedida: number;
  quantidade_recebida: number;
  validade?: string;
  observacao?: string;
}) {
  const { data } = await api.post("/recebimentos/item", item);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Upload de comprovantes
export async function uploadComprovante(
  recebimento_id: number,
  produto_id: number,
  files: File[]
) {
  const formData = new FormData();
  formData.append("recebimento_id", recebimento_id.toString());
  formData.append("produto_id", produto_id.toString());
  
  files.forEach((file) => {
    formData.append("files", file);
  });

  const { data } = await api.post("/recebimentos/item/comprovante", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data.data || data; // Handle both new format {success, data} and old format
}

// Finalizar recebimento
export async function finalizarRecebimento(recebimento_id: number) {
  const { data } = await api.post("/recebimentos/finalizar", { recebimento_id });
  return data.data || data; // Handle both new format {success, data} and old format
}

// Buscar histórico de recebimento
export async function getHistoricoRecebimento(recebimento_id: number) {
  const { data } = await api.get(`/recebimentos/${recebimento_id}/historico`);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Buscar itens pendentes de recebimento
export async function buscarItensPendentes(recebimento_id: number) {
  const { data } = await api.get(`/recebimentos/${recebimento_id}/pendentes`);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Cancelar item pendente
export async function cancelarItemPendente(item: {
  recebimento_id: number;
  produto_id: number;
  observacao: string;
}) {
  const { data } = await api.post("/recebimentos/item/cancelar", item);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Buscar recebimento por pedido
export async function buscarRecebimentoPorPedido(pedido_id: number) {
  const { data } = await api.get(`/recebimentos/por-pedido/${pedido_id}`);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Listar recebimentos com filtros e paginação
export async function listarRecebimentos(
  pagination: PaginationParams = {},
  filters: RecebimentoFilters = {}
) {
  const params = new URLSearchParams();
  
  if (pagination.page) params.append('page', pagination.page.toString());
  if (pagination.limit) params.append('limit', pagination.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.fornecedor_id) params.append('fornecedor_id', filters.fornecedor_id.toString());
  if (filters.data_inicio) params.append('data_inicio', filters.data_inicio);
  if (filters.data_fim) params.append('data_fim', filters.data_fim);

  const { data } = await api.get(`/recebimentos?${params.toString()}`);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Obter detalhes de um recebimento específico
export async function obterRecebimento(recebimento_id: number) {
  const { data } = await api.get(`/recebimentos/${recebimento_id}`);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Atualizar status do recebimento
export async function atualizarStatusRecebimento(
  recebimento_id: number,
  status: string,
  observacao?: string
) {
  const { data } = await api.put(`/recebimentos/${recebimento_id}/status`, {
    status,
    observacao,
  });
  return data.data || data; // Handle both new format {success, data} and old format
}

// Obter estatísticas de recebimentos
export async function obterEstatisticasRecebimentos() {
  const { data } = await api.get("/recebimentos/estatisticas");
  return data.data || data; // Handle both new format {success, data} and old format
}

// Função de relatório removida - módulo de relatórios descontinuado

// Validar recebimento antes de finalizar
export async function validarRecebimento(recebimento_id: number) {
  const { data } = await api.post(`/recebimentos/${recebimento_id}/validar`);
  return data.data || data; // Handle both new format {success, data} and old format
}

// Reabrir recebimento (se permitido)
export async function reabrirRecebimento(
  recebimento_id: number,
  justificativa: string
) {
  const { data } = await api.post(`/recebimentos/${recebimento_id}/reabrir`, {
    justificativa,
  });
  return data.data || data; // Handle both new format {success, data} and old format
}