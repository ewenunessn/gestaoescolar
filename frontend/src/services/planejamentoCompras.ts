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

export interface PeriodoGerarPedido {
  data_inicio: string;
  data_fim: string;
}

export interface GerarPedidosResponse {
  pedidos_criados: {
    pedido_id: number;
    numero: string;
    periodo: PeriodoGerarPedido;
    total_itens: number;
    valor_total: number;
    sem_contrato: string[];
  }[];
  erros: { periodo: PeriodoGerarPedido; motivo: string }[];
  total_criados: number;
  total_erros: number;
}

export interface GerarGuiasResponse {
  guias_criadas: {
    guia_id: number;
    competencia: string;
    periodos: PeriodoGerarPedido[];
    total_produtos: number;
    total_itens: number;
    total_escolas: number;
  }[];
  erros: { motivo: string }[];
  total_criadas: number;
  total_erros: number;
}

export async function gerarGuiasDemanda(
  competencia: string,
  periodos: PeriodoGerarPedido[],
  escola_ids?: number[],
  observacoes?: string
): Promise<GerarGuiasResponse> {
  const response = await api.post('/planejamento-compras/gerar-guias', {
    competencia,
    periodos,
    escola_ids,
    observacoes
  });
  return response.data;
}

export interface GerarPedidoDaGuiaResponse {
  pedidos_criados: {
    pedido_id: number;
    numero: string;
    guia_id: number;
    total_itens: number;
    valor_total: number;
    sem_contrato: string[];
  }[];
  erros: { motivo: string }[];
  total_criados: number;
  total_erros: number;
}

export async function gerarPedidoDaGuia(
  guia_id: number, 
  contratos_selecionados?: { produto_id: number; contrato_produto_id: number; quantidade?: number }[],
  observacoes?: string
): Promise<GerarPedidoDaGuiaResponse> {
  const response = await api.post('/planejamento-compras/gerar-pedido-da-guia', { 
    guia_id, 
    contratos_selecionados,
    observacoes 
  });
  return response.data;
}

export async function gerarPedidosPorPeriodo(
  competencia: string,
  periodos: PeriodoGerarPedido[],
  escola_ids?: number[],
  contratos_selecionados?: { produto_id: number; contrato_produto_id: number; quantidade?: number }[],
  observacoes?: string
): Promise<GerarPedidosResponse> {
  const response = await api.post('/planejamento-compras/gerar-pedidos', {
    competencia,
    periodos,
    escola_ids,
    contratos_selecionados,
    observacoes
  });
  return response.data;
}
