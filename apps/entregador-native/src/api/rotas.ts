import { api } from './client';

export interface Rota {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
  total_escolas?: number;
}

export interface EscolaRota {
  id: number;
  rota_id: number;
  escola_id: number;
  ordem: number;
  escola_nome?: string;
  escola_endereco?: string;
}

export interface ItemEntrega {
  id: number;
  guia_id?: number;
  produto_id?: number;
  escola_id?: number;
  produto_nome: string;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  entrega_confirmada?: boolean;
  data_entrega?: string;
  status?: string;
  quantidade_ja_entregue?: number;
  saldo_pendente?: number;
  updated_at?: string;
  historico_entregas?: HistoricoEntrega[];
}

export interface HistoricoEntrega {
  id: number;
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  data_entrega: string;
  observacao?: string;
}

export async function listarRotas(): Promise<Rota[]> {
  const { data } = await api.get('/entregas/rotas');
  return data;
}

export async function listarEscolasDaRota(rotaId: number): Promise<EscolaRota[]> {
  const { data } = await api.get(`/entregas/rotas/${rotaId}/escolas`);
  return data;
}

export async function listarItensEscola(escolaId: number, guiaId?: number): Promise<ItemEntrega[]> {
  const params = guiaId ? `?guiaId=${guiaId}` : '';
  const { data } = await api.get(`/entregas/escolas/${escolaId}/itens${params}`);
  return data;
}

export interface ConfirmarEntregaData {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string;
  assinatura_base64?: string;
  client_operation_id?: string;
}

export interface OfflineBundleFilters {
  rotaIds?: number[] | 'todas';
  guiaId?: number;
  dataEntrega?: string;
  dataInicio?: string;
  dataFim?: string;
  somentePendentes?: boolean;
}

export interface OfflineEntregaBundle {
  serverTime: string;
  rotas: Rota[];
  escolasPorRota: Record<string, EscolaRota[]>;
  itensPorEscola: Record<string, ItemEntrega[]>;
}

export async function obterOfflineBundle(filters: OfflineBundleFilters = {}): Promise<OfflineEntregaBundle> {
  const params: Record<string, string | number | boolean> = {};

  if (Array.isArray(filters.rotaIds) && filters.rotaIds.length > 0) {
    params.rotaIds = filters.rotaIds.join(',');
  }
  if (filters.guiaId) params.guiaId = filters.guiaId;
  if (filters.dataEntrega) params.dataEntrega = filters.dataEntrega;
  if (filters.dataInicio) params.dataInicio = filters.dataInicio;
  if (filters.dataFim) params.dataFim = filters.dataFim;
  if (filters.somentePendentes !== undefined) params.somentePendentes = filters.somentePendentes;

  const { data } = await api.get('/entregas/offline-bundle', { params });
  return data;
}

export async function listarMudancasEntregas(since?: string): Promise<{ serverTime: string; itens: ItemEntrega[] }> {
  const { data } = await api.get('/entregas/sync/mudancas', {
    params: since ? { since } : undefined,
  });
  return data;
}

export async function confirmarEntregaItem(itemId: number, dados: ConfirmarEntregaData) {
  const { data } = await api.post(`/entregas/itens/${itemId}/confirmar`, dados);
  return data;
}

export async function cancelarEntregaItem(historicoEntregaId: number, motivo?: string) {
  const { data } = await api.post('/entregas/comprovantes/cancelar-item', {
    historico_entrega_id: historicoEntregaId,
    motivo,
  });
  return data;
}

export interface ComprovanteFotoUploadUrl {
  upload_url: string;
  upload_path?: string;
  upload_token?: string;
  storage_key: string;
  headers: Record<string, string>;
  expires_at: string;
}

export interface ComprovanteFotoReadUrl {
  url: string;
  expires_at: string;
  uploaded_at?: string;
  content_type: string;
  size_bytes: number;
}

export async function solicitarFotoComprovanteUploadUrl(
  comprovanteId: number,
  dados: { content_type: 'image/jpeg'; size_bytes: number },
): Promise<ComprovanteFotoUploadUrl> {
  const { data } = await api.post(`/entregas/comprovantes/${comprovanteId}/foto/upload-url`, dados);
  return data;
}

export async function confirmarFotoComprovanteUpload(
  comprovanteId: number,
  dados: { storage_key: string },
): Promise<{ foto: unknown }> {
  const { data } = await api.post(`/entregas/comprovantes/${comprovanteId}/foto/confirmar`, dados);
  return data;
}

export async function obterFotoComprovante(comprovanteId: number): Promise<ComprovanteFotoReadUrl> {
  const { data } = await api.get(`/entregas/comprovantes/${comprovanteId}/foto`);
  return data;
}
