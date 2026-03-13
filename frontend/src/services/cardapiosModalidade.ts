import api from './api';

export interface CardapioModalidade {
  id: number;
  modalidade_id: number;
  nome: string;
  mes: number;
  ano: number;
  observacao?: string;
  ativo: boolean;
  nutricionista_id?: number;
  data_aprovacao_nutricionista?: string;
  observacoes_nutricionista?: string;
  modalidade_nome?: string;
  nutricionista_nome?: string;
  nutricionista_crn?: string;
  total_refeicoes?: number;
  total_dias?: number;
  created_at: string;
  updated_at: string;
}

export interface RefeicaoDia {
  id: number;
  cardapio_modalidade_id: number;
  refeicao_id: number;
  dia: number;
  tipo_refeicao: string;
  observacao?: string;
  ativo: boolean;
  refeicao_nome: string;
  refeicao_descricao?: string;
  created_at: string;
  updated_at: string;
}

export const TIPOS_REFEICAO: Record<string, string> = {
  cafe_manha: 'Café da Manhã',
  lanche_manha: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da Tarde',
  jantar: 'Jantar'
};

export const MESES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

// Cardápios
export async function listarCardapiosModalidade(filtros?: {
  modalidade_id?: number;
  mes?: number;
  ano?: number;
  ativo?: boolean;
}): Promise<CardapioModalidade[]> {
  const params = new URLSearchParams();
  if (filtros?.modalidade_id) params.append('modalidade_id', filtros.modalidade_id.toString());
  if (filtros?.mes) params.append('mes', filtros.mes.toString());
  if (filtros?.ano) params.append('ano', filtros.ano.toString());
  if (filtros?.ativo !== undefined) params.append('ativo', filtros.ativo.toString());
  
  const response = await api.get(`/cardapios?${params.toString()}`);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao listar cardápios');
  return response.data;
}

export async function buscarCardapioModalidade(id: number): Promise<CardapioModalidade> {
  const response = await api.get(`/cardapios/${id}`);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao buscar cardápio');
  return response.data;
}

export async function criarCardapioModalidade(data: {
  modalidade_id: number;
  nome: string;
  mes: number;
  ano: number;
  observacao?: string;
  ativo?: boolean;
  nutricionista_id?: number;
  data_aprovacao_nutricionista?: string;
  observacoes_nutricionista?: string;
}): Promise<CardapioModalidade> {
  const response = await api.post('/cardapios', data);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao criar cardápio');
  return response.data;
}

export async function editarCardapioModalidade(id: number, data: Partial<CardapioModalidade>): Promise<CardapioModalidade> {
  const response = await api.put(`/cardapios/${id}`, data);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao editar cardápio');
  return response.data;
}

export async function removerCardapioModalidade(id: number): Promise<void> {
  const response = await api.delete(`/cardapios/${id}`);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao remover cardápio');
}

// Refeições do cardápio
export async function listarRefeicoesCardapio(cardapioId: number): Promise<RefeicaoDia[]> {
  const response = await api.get(`/cardapios/${cardapioId}/refeicoes`);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao listar refeições');
  return response.data;
}

export async function adicionarRefeicaoDia(cardapioId: number, data: {
  refeicao_id: number;
  dia: number;
  tipo_refeicao: string;
  observacao?: string;
}): Promise<RefeicaoDia> {
  const response = await api.post(`/cardapios/${cardapioId}/refeicoes`, data);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao adicionar refeição');
  return response.data;
}

export async function removerRefeicaoDia(id: number): Promise<void> {
  const response = await api.delete(`/cardapios/refeicoes/${id}`);
  if (response.data.error) throw new Error(response.data.message || 'Erro ao remover refeição');
}
