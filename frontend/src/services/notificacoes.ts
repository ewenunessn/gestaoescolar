import api from './api';

export interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  created_at: string;
}

export const listarNotificacoes = async (): Promise<{ data: Notificacao[]; nao_lidas: number }> => {
  const res = await api.get('/notificacoes');
  return res.data;
};

export const marcarLida = async (id: number): Promise<void> => {
  await api.patch(`/notificacoes/${id}/lida`);
};

export const marcarTodasLidas = async (): Promise<void> => {
  await api.patch('/notificacoes/todas-lidas');
};

export const deletarNotificacao = async (id: number): Promise<void> => {
  await api.delete(`/notificacoes/${id}`);
};
