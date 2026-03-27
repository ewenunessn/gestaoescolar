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
  try {
    const params = new URLSearchParams();
    if (filtros?.modalidade_id) params.append('modalidade_id', filtros.modalidade_id.toString());
    if (filtros?.mes) params.append('mes', filtros.mes.toString());
    if (filtros?.ano) params.append('ano', filtros.ano.toString());
    if (filtros?.ativo !== undefined) params.append('ativo', filtros.ativo.toString());
    
    const response = await api.get(`/cardapios?${params.toString()}`);
    
    // Backend retorna array diretamente em response.data
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Ou pode retornar { data: [...] }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    // Fallback para array vazio
    console.warn('Resposta inesperada da API:', response.data);
    return [];
  } catch (error) {
    console.error('Erro ao listar cardápios:', error);
    throw error;
  }
}

export async function buscarCardapioModalidade(id: number): Promise<CardapioModalidade> {
  try {
    const response = await api.get(`/cardapios/${id}`);
    
    // Backend retorna objeto diretamente em response.data
    if (response.data && !response.data.data) {
      return response.data;
    }
    
    // Ou pode retornar { data: {...} }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    throw new Error('Resposta inválida da API');
  } catch (error) {
    console.error('Erro ao buscar cardápio:', error);
    throw error;
  }
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
  try {
    const response = await api.post('/cardapios', data);
    
    // Backend retorna objeto diretamente em response.data
    if (response.data && !response.data.data) {
      return response.data;
    }
    
    // Ou pode retornar { data: {...} }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    throw new Error('Resposta inválida da API');
  } catch (error) {
    console.error('Erro ao criar cardápio:', error);
    throw error;
  }
}

export async function editarCardapioModalidade(id: number, data: Partial<CardapioModalidade>): Promise<CardapioModalidade> {
  try {
    const response = await api.put(`/cardapios/${id}`, data);
    
    // Backend retorna objeto diretamente em response.data
    if (response.data && !response.data.data) {
      return response.data;
    }
    
    // Ou pode retornar { data: {...} }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    throw new Error('Resposta inválida da API');
  } catch (error) {
    console.error('Erro ao editar cardápio:', error);
    throw error;
  }
}

export async function removerCardapioModalidade(id: number): Promise<void> {
  try {
    await api.delete(`/cardapios/${id}`);
  } catch (error) {
    console.error('Erro ao remover cardápio:', error);
    throw error;
  }
}

// Refeições do cardápio
export async function listarRefeicoesCardapio(cardapioId: number): Promise<RefeicaoDia[]> {
  try {
    const response = await api.get(`/cardapios/${cardapioId}/refeicoes`);
    
    // Backend retorna array diretamente em response.data
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // Ou pode retornar { data: [...] }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    // Fallback para array vazio
    console.warn('Resposta inesperada da API:', response.data);
    return [];
  } catch (error) {
    console.error('Erro ao listar refeições:', error);
    throw error;
  }
}

export async function adicionarRefeicaoDia(cardapioId: number, data: {
  refeicao_id: number;
  dia: number;
  tipo_refeicao: string;
  observacao?: string;
}): Promise<RefeicaoDia> {
  try {
    const response = await api.post(`/cardapios/${cardapioId}/refeicoes`, data);
    
    // Backend retorna objeto diretamente em response.data
    if (response.data && !response.data.data) {
      return response.data;
    }
    
    // Ou pode retornar { data: {...} }
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    throw new Error('Resposta inválida da API');
  } catch (error) {
    console.error('Erro ao adicionar refeição:', error);
    throw error;
  }
}

export async function removerRefeicaoDia(id: number): Promise<void> {
  try {
    await api.delete(`/cardapios/refeicoes/${id}`);
  } catch (error) {
    console.error('Erro ao remover refeição:', error);
    throw error;
  }
}

export interface CustoCardapio {
  custo_total: number;
  total_alunos: number;
  total_refeicoes: number;
  detalhes_por_refeicao: Array<{
    id: number;
    dia: number;
    tipo_refeicao: string;
    refeicao_id: number;
    refeicao_nome: string;
    produtos: Array<{
      produto_id: number;
      produto_nome: string;
      per_capita: number;
      tipo_medida: string;
      preco_unitario: number;
      custo_por_aluno: number;
    }>;
    custo_por_aluno: number;
    custo_total: number;
  }>;
  detalhes_por_modalidade: Array<{
    modalidade_id: number;
    quantidade_alunos: number;
    custo_total: number;
  }>;
}

export async function calcularCustoCardapio(cardapioId: number): Promise<CustoCardapio> {
  try {
    const response = await api.get(`/cardapios/${cardapioId}/custo`);
    
    if (response.data && !response.data.data) {
      return response.data;
    }
    
    if (response.data && response.data.data) {
      return response.data.data;
    }
    
    throw new Error('Resposta inválida da API');
  } catch (error) {
    console.error('Erro ao calcular custo do cardápio:', error);
    throw error;
  }
}
