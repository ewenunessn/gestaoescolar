import api from './api';

export interface CardapioSelecionado {
  cardapio_id: number;
  data_inicio: string;
  data_fim: string;
}

export interface DemandaPorEscola {
  escola_id: number;
  escola_nome: string;
  modalidade_id: number;
  modalidade_nome: string;
  numero_alunos: number;
  cardapio_id: number;
  produtos: {
    produto_id: number;
    produto_nome: string;
    unidade: string;
    quantidade_kg: number;
    quantidade_gramas: number;
  }[];
}

export interface DemandaPorProduto {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_total_kg: number;
}

export interface DemandaConsolidada {
  escola_id: number;
  escola_nome: string;
  modalidade_nome: string;
  numero_alunos: number;
  produtos: {
    produto_id: number;
    produto_nome: string;
    quantidade_kg: number;
  }[];
}

export interface CalculoDemandaResponse {
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  cardapios_selecionados: number;
  escolas_total: number;
  demanda_por_escola: DemandaPorEscola[];
  demanda_por_produto: DemandaPorProduto[];
  consolidado: DemandaConsolidada[];
}

export async function calcularDemanda(
  cardapios: CardapioSelecionado[],
  escola_ids?: number[]
): Promise<CalculoDemandaResponse> {
  const response = await api.post('/planejamento-compras/calcular-demanda', {
    cardapios,
    escola_ids
  });
  return response.data;
}

export async function calcularDemandaPorCompetencia(
  competencia: string,
  data_inicio: string,
  data_fim: string,
  escola_ids?: number[]
): Promise<CalculoDemandaResponse> {
  const response = await api.post('/planejamento-compras/calcular-por-competencia', {
    competencia,
    data_inicio,
    data_fim,
    escola_ids
  });
  return response.data;
}
