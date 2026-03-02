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
  produto_nome: string;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  entrega_confirmada?: boolean;
  data_entrega?: string;
  quantidade_ja_entregue?: number;
  saldo_pendente?: number;
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
}

export async function confirmarEntregaItem(itemId: number, dados: ConfirmarEntregaData) {
  const { data } = await api.post(`/entregas/itens/${itemId}/confirmar`, dados);
  return data;
}
