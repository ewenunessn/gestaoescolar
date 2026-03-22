import api from './api';

export type AlvoDisparo = 'todas' | 'modalidade' | 'selecao';
export type TipoNotificacao = 'info' | 'aviso' | 'sucesso' | 'erro';
export type StatusDisparo = 'processando' | 'enviado' | 'erro';

export interface Disparo {
  id: number;
  titulo: string;
  mensagem: string;
  link?: string;
  tipo: TipoNotificacao;
  alvo: AlvoDisparo;
  modalidade_id?: number;
  modalidade_nome?: string;
  escola_ids?: number[];
  status: StatusDisparo;
  total_enviado: number;
  erro_msg?: string;
  criado_por: number;
  criado_por_nome: string;
  created_at: string;
  enviado_at?: string;
}

export interface CriarDisparoPayload {
  titulo: string;
  mensagem: string;
  link?: string;
  tipo: TipoNotificacao;
  alvo: AlvoDisparo;
  modalidade_id?: number;
  escola_ids?: number[];
}

export const listarDisparos = async (): Promise<Disparo[]> => {
  const res = await api.get('/disparos-notificacao');
  return res.data.data;
};

export const criarDisparo = async (payload: CriarDisparoPayload): Promise<Disparo> => {
  const res = await api.post('/disparos-notificacao', payload);
  return res.data.data;
};
