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
    quantidade_embalagens?: number;
    peso_embalagem?: number;
  }[];
}

export interface DemandaPorProduto {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_total_kg: number;
  quantidade_embalagens?: number;
  peso_embalagem?: number;
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
    quantidade_embalagens?: number;
    peso_embalagem?: number;
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
  observacoes?: string,
  considerar_indice_coccao?: boolean,
  considerar_fator_correcao?: boolean
): Promise<GerarGuiasResponse> {
  // Timeout maior para operações pesadas (2 minutos)
  const response = await api.post('/planejamento-compras/gerar-guias', {
    competencia,
    periodos,
    escola_ids,
    observacoes,
    considerar_indice_coccao,
    considerar_fator_correcao
  }, {
    timeout: 120000 // 2 minutos
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
  ignorar_sem_contrato?: boolean,
  observacoes?: string
): Promise<GerarPedidoDaGuiaResponse> {
  // Timeout maior para operações pesadas (5 minutos)
  const response = await api.post('/planejamento-compras/gerar-pedido-da-guia', { 
    guia_id, 
    contratos_selecionados,
    ignorar_sem_contrato,
    observacoes 
  }, {
    timeout: 300000 // 5 minutos
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


// ─── Jobs Assíncronos ─────────────────────────────────────────────────────────

export interface Job {
  id: number;
  tipo: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  progresso: number;
  total_itens: number;
  itens_processados: number;
  tempo_estimado?: number;
  tempo_inicio?: string;
  tempo_fim?: string;
  resultado?: any;
  erro?: string;
  parametros?: any;
  usuario_id?: number;
  created_at: string;
  updated_at: string;
}

export interface IniciarJobResponse {
  job_id: number;
  status: string;
  message: string;
}

/**
 * Inicia geração de guias de forma assíncrona
 */
export async function iniciarGeracaoGuiasAsync(
  competencia: string,
  periodos: PeriodoGerarPedido[],
  escola_ids?: number[],
  observacoes?: string,
  considerar_indice_coccao?: boolean,
  considerar_fator_correcao?: boolean
): Promise<IniciarJobResponse> {
  const response = await api.post('/planejamento-compras/gerar-guias-async', {
    competencia,
    periodos,
    escola_ids,
    observacoes,
    considerar_indice_coccao,
    considerar_fator_correcao
  });
  return response.data;
}

/**
 * Busca o status de um job
 */
export async function buscarStatusJob(jobId: number): Promise<Job> {
  const response = await api.get(`/planejamento-compras/jobs/${jobId}`);
  return response.data;
}

/**
 * Lista jobs do usuário
 */
export async function listarJobs(): Promise<Job[]> {
  const response = await api.get('/planejamento-compras/jobs');
  return response.data;
}


/**
 * Inicia geração de pedido da guia de forma assíncrona
 */
export async function iniciarGeracaoPedidoAsync(
  guia_id: number,
  contratos_selecionados?: { produto_id: number; contrato_produto_id: number; quantidade?: number }[],
  ignorar_sem_contrato?: boolean,
  observacoes?: string
): Promise<IniciarJobResponse> {
  const response = await api.post('/planejamento-compras/gerar-pedido-da-guia-async', {
    guia_id,
    contratos_selecionados,
    ignorar_sem_contrato,
    observacoes
  });
  return response.data;
}
