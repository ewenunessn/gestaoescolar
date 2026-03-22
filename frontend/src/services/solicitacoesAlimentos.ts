import api from './api';

export interface SolicitacaoItem {
  id: number;
  solicitacao_id: number;
  produto_id?: number;
  nome_produto: string;
  quantidade: number;
  unidade: string;
  status: 'pendente' | 'aceito' | 'recusado';
  justificativa_recusa?: string;
  respondido_por?: number;
  respondido_por_nome?: string;
  respondido_em?: string;
  created_at: string;
}

export interface Solicitacao {
  id: number;
  escola_id: number;
  escola_nome?: string;
  observacao?: string;
  status: 'pendente' | 'parcial' | 'concluida' | 'cancelada';
  respondido_por?: number;
  respondido_por_nome?: string;
  respondido_em?: string;
  created_at: string;
  updated_at: string;
  itens: SolicitacaoItem[];
}

export interface NovoItemData {
  produto_id?: number;
  nome_produto: string;
  quantidade: number;
  unidade: string;
}

export interface CriarSolicitacaoData {
  observacao?: string;
  itens: NovoItemData[];
}

export const listarMinhasSolicitacoes = async (): Promise<Solicitacao[]> => {
  const res = await api.get('/solicitacoes-alimentos/minhas');
  return res.data.data;
};

export const criarSolicitacao = async (data: CriarSolicitacaoData): Promise<Solicitacao> => {
  const res = await api.post('/solicitacoes-alimentos', data);
  return res.data.data;
};

export const cancelarSolicitacao = async (id: number): Promise<void> => {
  await api.delete(`/solicitacoes-alimentos/${id}`);
};

export const listarTodasSolicitacoes = async (params?: { status?: string; escola_id?: number }): Promise<Solicitacao[]> => {
  const res = await api.get('/solicitacoes-alimentos', { params });
  return res.data.data;
};

export const aceitarItem = async (itemId: number): Promise<Solicitacao> => {
  const res = await api.patch(`/solicitacoes-alimentos/itens/${itemId}/aceitar`);
  return res.data.data;
};

export const aprovarTudo = async (solicitacaoId: number): Promise<Solicitacao> => {
  const res = await api.patch(`/solicitacoes-alimentos/${solicitacaoId}/aprovar-tudo`);
  return res.data.data;
};

export const recusarItem = async (itemId: number, justificativa: string): Promise<Solicitacao> => {
  const res = await api.patch(`/solicitacoes-alimentos/itens/${itemId}/recusar`, { justificativa });
  return res.data.data;
};
