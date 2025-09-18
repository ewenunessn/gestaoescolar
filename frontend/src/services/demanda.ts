import { apiWithRetry } from "./api";

export interface DemandaItem {
  produto_id: number;
  produto_nome: string;
  unidade_medida: string;
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
  const { data } = await apiWithRetry.post("/demandas/gerar", params);
  return data.data;
}

export async function gerarDemandaMultiplosCardapios(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
  cardapio_ids?: number[];
}): Promise<DemandaResponse> {
  const { data } = await apiWithRetry.post("/demandas/gerar-multiplos", params);
  return data.data;
}

export async function listarCardapiosDisponiveis(params?: {
  escola_ids?: number[];
  modalidade_ids?: number[];
}): Promise<CardapioDisponivel[]> {
  const { data } = await apiWithRetry.get("/demandas/cardapios-disponiveis", { params });
  return data.data;
}

export async function exportarDemandaMensal(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
  formato?: 'json' | 'csv';
}): Promise<any> {
  const { data } = await apiWithRetry.post("/demandas/exportar", params);
  return data;
}

export async function exportarDemandaExcel(params: {
  mes: number;
  ano: number;
  escola_ids?: number[];
  modalidade_ids?: number[];
}): Promise<void> {
  const response = await apiWithRetry.post("/demandas/exportar-excel", params, {
    responseType: 'blob'
  });
  
  // Criar link para download
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