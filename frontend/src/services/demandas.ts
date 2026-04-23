import api from './api';
import { apiWithRetry } from './api';
import { Demanda } from '../types/demanda';

export const demandasService = {
  async criar(dados: Partial<Demanda>): Promise<Demanda> {
    const response = await api.post('/demandas', dados);
    return response.data.data;
  },

  async listar(filtros?: {
    escola_id?: number;
    escola_nome?: string;
    objeto?: string;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
  }): Promise<Demanda[]> {
    const params = new URLSearchParams();
    
    if (filtros?.escola_id) params.append('escola_id', filtros.escola_id.toString());
    if (filtros?.escola_nome) params.append('escola_nome', filtros.escola_nome);
    if (filtros?.objeto) params.append('objeto', filtros.objeto);
    if (filtros?.status) params.append('status', filtros.status);
    if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
    if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);

    const queryString = params.toString();
    const url = `/demandas${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return response.data.data;
  },

  async listarSolicitantes(): Promise<string[]> {
    const response = await api.get('/demandas/solicitantes');
    return response.data.data;
  },

  async buscarPorId(id: number): Promise<Demanda> {
    const response = await api.get(`/demandas/${id}`);
    return response.data.data;
  },

  async atualizar(id: number, dados: Partial<Demanda>): Promise<Demanda> {
    const response = await api.put(`/demandas/${id}`, dados);
    return response.data.data;
  },

  async excluir(id: number): Promise<void> {
    await api.delete(`/demandas/${id}`);
  },

  async atualizarStatus(id: number, status: string, data_resposta_semead?: string, observacoes?: string): Promise<Demanda> {
    const response = await api.patch(`/demandas/${id}/status`, {
      status,
      data_resposta_semead,
      observacoes
    });
    return response.data.data;
  }
};

export interface DemandaItem {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_total: number;
  valor_total: number;
  detalhes: {
    escola_nome: string;
    modalidade_nome: string;
    cardapio_nome: string;
    refeicao_nome: string;
    quantidade_alunos: number;
    frequencia_mensal: number;
    per_capita: number;
    quantidade_calculada: number;
  }[];
}

export interface DemandaResumo {
  total_produtos: number;
  total_valor: number;
  total_cardapios?: number;
  mes: number;
  ano: number;
  filtros: {
    escolas: number;
    modalidades: number;
    cardapios?: number;
  };
}

export interface DemandaResponse {
  demanda: DemandaItem[];
  resumo: DemandaResumo;
}

export interface CardapioDisponivel {
  id: number;
  nome: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  modalidade_id?: number;
  modalidade_nome?: string;
  total_refeicoes: number;
}

export async function gerarDemandaMensal(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
}): Promise<DemandaResponse> {
  const response = await apiWithRetry.post<{ data: DemandaResponse }>("/demandas/gerar", params);
  return response.data.data;
}

export async function gerarDemandaMultiplosCardapios(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
  cardapio_ids?: number[];
}): Promise<DemandaResponse> {
  const response = await apiWithRetry.post<{ data: DemandaResponse }>("/demandas/gerar-multiplos", params);
  return response.data.data;
}

export async function listarCardapiosDisponiveis(params?: {
  escola_ids?: number[];
  modalidade_ids?: number[];
  mes?: number;
  ano?: number;
}): Promise<CardapioDisponivel[]> {
  const response = await apiWithRetry.get<{ data: CardapioDisponivel[] }>("/demandas/cardapios-disponiveis", { params });
  return response.data.data;
}

export async function exportarDemandaMensal(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
  formato?: 'json' | 'csv';
}): Promise<unknown> {
  const response = await apiWithRetry.post<unknown>("/demandas/exportar", params);
  return response.data;
}

export async function exportarDemandaExcel(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
}): Promise<void> {
  const response = await apiWithRetry.post<Blob>("/demandas/exportar-excel", params, {
    responseType: 'blob'
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `demanda_${params.mes}_${params.ano}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default demandasService;
