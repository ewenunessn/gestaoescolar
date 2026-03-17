import api from './api';

export interface Periodo {
  id: number;
  ano: number;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  fechado: boolean;
  ocultar_dados: boolean;
  created_at: string;
  updated_at: string;
  total_pedidos?: number;
  total_guias?: number;
  total_cardapios?: number;
}

export const listarPeriodos = async (): Promise<Periodo[]> => {
  const response = await api.get('/periodos');
  return response.data.data;
};

export const obterPeriodoAtivo = async (): Promise<Periodo> => {
  const response = await api.get('/periodos/ativo');
  return response.data.data;
};

export const criarPeriodo = async (data: {
  ano: number;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
}): Promise<Periodo> => {
  const response = await api.post('/periodos', data);
  return response.data.data;
};

export const atualizarPeriodo = async (
  id: number,
  data: {
    descricao?: string;
    data_inicio?: string;
    data_fim?: string;
    ocultar_dados?: boolean;
  }
): Promise<Periodo> => {
  const response = await api.put(`/periodos/${id}`, data);
  return response.data.data;
};

export const ativarPeriodo = async (id: number): Promise<Periodo> => {
  const response = await api.patch(`/periodos/${id}/ativar`);
  return response.data.data;
};

export const fecharPeriodo = async (id: number): Promise<Periodo> => {
  const response = await api.patch(`/periodos/${id}/fechar`);
  return response.data.data;
};

export const reabrirPeriodo = async (id: number): Promise<Periodo> => {
  const response = await api.patch(`/periodos/${id}/reabrir`);
  return response.data.data;
};

export const deletarPeriodo = async (id: number): Promise<void> => {
  await api.delete(`/periodos/${id}`);
};

export const selecionarPeriodo = async (periodoId: number): Promise<Periodo> => {
  const response = await api.post('/periodos/selecionar', { periodoId });
  return response.data.data;
};
