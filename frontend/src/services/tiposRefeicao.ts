import api from './api';

export interface TipoRefeicao {
  id: number;
  nome: string;
  chave: string;
  horario: string;
  ordem: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TipoRefeicaoInput {
  nome: string;
  chave: string;
  horario: string;
  ordem?: number;
}

export const listarTiposRefeicao = async (ativo?: boolean): Promise<TipoRefeicao[]> => {
  const params = ativo !== undefined ? { ativo } : {};
  const response = await api.get('/tipos-refeicao', { params });
  // A API retorna {success: true, data: [...], total: X}
  return response.data?.data ?? response.data;
};

export const buscarTipoRefeicao = async (id: number): Promise<TipoRefeicao> => {
  const response = await api.get(`/tipos-refeicao/${id}`);
  return response.data;
};

export const criarTipoRefeicao = async (data: TipoRefeicaoInput): Promise<TipoRefeicao> => {
  const response = await api.post('/tipos-refeicao', data);
  return response.data;
};

export const atualizarTipoRefeicao = async (
  id: number,
  data: Partial<TipoRefeicaoInput & { ativo: boolean }>
): Promise<TipoRefeicao> => {
  const response = await api.put(`/tipos-refeicao/${id}`, data);
  return response.data;
};

export const deletarTipoRefeicao = async (id: number): Promise<void> => {
  await api.delete(`/tipos-refeicao/${id}`);
};

// Função helper para formatar horário para exibição
export const formatarHorario = (horario: string): string => {
  if (!horario) return '';
  const [horas, minutos] = horario.split(':');
  return `${horas}:${minutos}`;
};

// Função helper para criar mapa de tipos de refeição
export const criarMapaTiposRefeicao = (tipos: TipoRefeicao[]): Record<string, string> => {
  return tipos.reduce((acc, tipo) => {
    acc[tipo.chave] = tipo.nome;
    return acc;
  }, {} as Record<string, string>);
};

// Função helper para criar mapa de horários
export const criarMapaHorarios = (tipos: TipoRefeicao[]): Record<string, string> => {
  return tipos.reduce((acc, tipo) => {
    acc[tipo.chave] = formatarHorario(tipo.horario);
    return acc;
  }, {} as Record<string, string>);
};
