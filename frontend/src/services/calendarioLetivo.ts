import api from './api';

export interface CalendarioLetivo {
  id: number;
  ano_letivo: number;
  data_inicio: string;
  data_fim: string;
  total_dias_letivos_obrigatorio: number;
  divisao_ano: 'bimestral' | 'trimestral' | 'semestral';
  dias_semana_letivos: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventoCalendario {
  id: number;
  calendario_letivo_id: number;
  titulo: string;
  descricao?: string;
  tipo_evento: string;
  data_inicio: string;
  data_fim?: string;
  hora_inicio?: string;
  hora_fim?: string;
  local?: string;
  responsavel?: string;
  cor: string;
  recorrente: boolean;
  recorrencia_config?: any;
  observacoes?: string;
  anexos?: any[];
  criado_por?: number;
  criado_por_nome?: string;
}

export interface PeriodoAvaliativo {
  id: number;
  calendario_letivo_id: number;
  nome: string;
  numero_periodo: number;
  data_inicio: string;
  data_fim: string;
  data_entrega_notas?: string;
}

export interface DiaLetivoExcecao {
  id: number;
  calendario_letivo_id: number;
  data: string;
  eh_letivo: boolean;
  motivo?: string;
}

// Calendário Letivo
export const listarCalendariosLetivos = async (): Promise<CalendarioLetivo[]> => {
  const response = await api.get('/calendario-letivo');
  return response.data.data;
};

export const buscarCalendarioLetivoAtivo = async (): Promise<CalendarioLetivo> => {
  const response = await api.get('/calendario-letivo/ativo');
  return response.data.data;
};

export const buscarCalendarioPorPeriodo = async (periodoId: number): Promise<CalendarioLetivo> => {
  const response = await api.get(`/calendario-letivo/periodo/${periodoId}`);
  return response.data.data;
};

export const buscarCalendarioLetivo = async (id: number): Promise<CalendarioLetivo> => {
  const response = await api.get(`/calendario-letivo/${id}`);
  return response.data.data;
};

export const criarCalendarioLetivo = async (data: Partial<CalendarioLetivo>): Promise<CalendarioLetivo> => {
  const response = await api.post('/calendario-letivo', data);
  return response.data.data;
};

export const atualizarCalendarioLetivo = async (id: number, data: Partial<CalendarioLetivo>): Promise<CalendarioLetivo> => {
  const response = await api.put(`/calendario-letivo/${id}`, data);
  return response.data.data;
};

export const excluirCalendarioLetivo = async (id: number): Promise<void> => {
  await api.delete(`/calendario-letivo/${id}`);
};

export const calcularDiasLetivos = async (id: number): Promise<any> => {
  const response = await api.get(`/calendario-letivo/${id}/dias-letivos`);
  return response.data.data;
};

// Eventos
export const listarEventos = async (calendarioId: number, filtros?: any): Promise<EventoCalendario[]> => {
  const response = await api.get(`/calendario-letivo/${calendarioId}/eventos`, { params: filtros });
  return response.data.data;
};

export const listarEventosPorMes = async (calendarioId: number, ano: number, mes: number): Promise<EventoCalendario[]> => {
  const response = await api.get(`/calendario-letivo/${calendarioId}/eventos/${ano}/${mes}`);
  return response.data.data;
};

export const buscarEvento = async (id: number): Promise<EventoCalendario> => {
  const response = await api.get(`/eventos/${id}`);
  return response.data.data;
};

export const criarEvento = async (data: Partial<EventoCalendario>): Promise<EventoCalendario> => {
  const response = await api.post('/eventos', data);
  return response.data.data;
};

export const atualizarEvento = async (id: number, data: Partial<EventoCalendario>): Promise<EventoCalendario> => {
  const response = await api.put(`/eventos/${id}`, data);
  return response.data.data;
};

export const excluirEvento = async (id: number): Promise<void> => {
  await api.delete(`/eventos/${id}`);
};

export const importarFeriadosNacionais = async (calendarioId: number, ano: number): Promise<void> => {
  await api.post('/eventos/importar-feriados', { calendario_id: calendarioId, ano });
};

// Períodos Avaliativos
export const listarPeriodos = async (calendarioId: number): Promise<PeriodoAvaliativo[]> => {
  const response = await api.get(`/calendario-letivo/${calendarioId}/periodos`);
  return response.data.data;
};

export const criarPeriodo = async (data: Partial<PeriodoAvaliativo>): Promise<PeriodoAvaliativo> => {
  const response = await api.post('/periodos', data);
  return response.data.data;
};

export const atualizarPeriodo = async (id: number, data: Partial<PeriodoAvaliativo>): Promise<PeriodoAvaliativo> => {
  const response = await api.put(`/periodos/${id}`, data);
  return response.data.data;
};

export const excluirPeriodo = async (id: number): Promise<void> => {
  await api.delete(`/periodos/${id}`);
};

export const gerarPeriodosAutomaticamente = async (calendarioId: number): Promise<void> => {
  await api.post(`/calendario-letivo/${calendarioId}/periodos/gerar`);
};

// Exceções
export const listarExcecoes = async (calendarioId: number): Promise<DiaLetivoExcecao[]> => {
  const response = await api.get(`/calendario-letivo/${calendarioId}/excecoes`);
  return response.data.data;
};

export const criarExcecao = async (data: Partial<DiaLetivoExcecao>): Promise<DiaLetivoExcecao> => {
  const response = await api.post('/excecoes', data);
  return response.data.data;
};

export const excluirExcecao = async (id: number): Promise<void> => {
  await api.delete(`/excecoes/${id}`);
};

// Cores por tipo de evento
export const getCoresEventos = () => ({
  dia_letivo: '#28a745',
  feriado_nacional: '#dc3545',
  feriado_estadual: '#dc3545',
  feriado_municipal: '#dc3545',
  feriado_escolar: '#fd7e14',
  evento_escolar: '#007bff',
  recesso: '#ffc107',
  ferias: '#ffc107',
  reuniao_pedagogica: '#6f42c1',
  conselho_classe: '#6f42c1',
  formacao: '#6f42c1',
  avaliacao: '#17a2b8',
  entrega_boletim: '#17a2b8',
  matricula: '#20c997',
  outro: '#6c757d'
});

// Labels dos tipos de evento
export const getLabelsEventos = () => ({
  dia_letivo: 'Dia Letivo',
  feriado_nacional: 'Feriado Nacional',
  feriado_estadual: 'Feriado Estadual',
  feriado_municipal: 'Feriado Municipal',
  feriado_escolar: 'Feriado Escolar',
  evento_escolar: 'Evento Escolar',
  recesso: 'Recesso',
  ferias: 'Férias',
  reuniao_pedagogica: 'Reunião Pedagógica',
  conselho_classe: 'Conselho de Classe',
  formacao: 'Formação',
  avaliacao: 'Avaliação',
  entrega_boletim: 'Entrega de Boletim',
  matricula: 'Matrícula',
  outro: 'Outro'
});
