import { apiWithRetry } from "./api";

export interface FaturamentoModalidade {
  id: number;
  faturamento_id: number;
  modalidade_id: number;
  nome_modalidade: string;
  valor_modalidade: number;
  percentual: number;
  created_at: string;
}

export interface PedidoModalidadeConfig {
  id: number;
  pedido_id: number;
  item_id: number;
  modalidade_id: number;
  nome_modalidade: string;
  percentual: number;
  created_at: string;
}

export interface ItemModalidadeConfig {
  item_id: number;
  nome_produto: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  modalidades: Array<{
    modalidade_id: number;
    nome_modalidade: string;
    percentual: number;
  }>;
}

export interface PedidoProntoFaturamento {
  id: number;
  numero_pedido: string;
  fornecedor_id: number;
  nome_fornecedor: string;
  valor_total: number;
  data_pedido: string;
  status: string;
  percentual_entregue: number;
  total_itens: number;
  itens_entregues: number;
}

export interface ProcessarFaturamentoRequest {
  pedido_id: number;
  fornecedor_id: number;
  contrato_id: number;
  observacoes?: string;
}

export interface VerificarProntoResponse {
  pedido_id: number;
  numero_pedido: string;
  fornecedor: string;
  pronto_para_faturamento: boolean;
  status_entrega: {
    total_itens: number;
    itens_completos: number;
    itens_parciais: number;
    itens_pendentes: number;
    percentual_entregue: number;
  };
  pode_processar: boolean;
}

// Listar pedidos prontos para faturamento
export async function listarPedidosProntosParaFaturamento(
  fornecedor_id?: number,
  page: number = 1,
  limit: number = 10
): Promise<{
  pedidos: PedidoProntoFaturamento[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (fornecedor_id) {
    params.append('fornecedor_id', fornecedor_id.toString());
  }

  const { data } = await apiWithRetry.get(`/faturamento-modalidades/pedidos-prontos?${params}`);
  return data.data || data;
}

// Verificar se pedido está pronto para faturamento
export async function verificarProntoParaFaturamento(pedido_id: number): Promise<VerificarProntoResponse> {
  const { data } = await apiWithRetry.get(`/faturamento-modalidades/pedido/${pedido_id}/verificar-pronto`);
  return data.data;
}

// Listar configurações de modalidades por pedido
export async function listarModalidadesPorPedido(pedido_id: number): Promise<ItemModalidadeConfig[]> {
  const { data } = await apiWithRetry.get(`/faturamento-modalidades/pedido/${pedido_id}/modalidades`);
  return data.itens || [];
}

// Configurar modalidades para um item do pedido
export async function configurarModalidadesItem(
  pedido_id: number,
  item_id: number,
  modalidades: Array<{ modalidade_id: number; percentual: number }>
): Promise<void> {
  await apiWithRetry.post(`/faturamento-modalidades/pedido/${pedido_id}/item/${item_id}/modalidades`, {
    modalidades
  });
}

// Processar faturamento automático
export async function processarFaturamentoAutomatico(request: ProcessarFaturamentoRequest): Promise<{
  faturamento_id: number;
  valor_total: number;
  modalidades: FaturamentoModalidade[];
}> {
  const { data } = await apiWithRetry.post('/faturamento-modalidades/processar-faturamento', request);
  return data;
}

// Listar faturamentos por modalidade
export async function listarFaturamentosModalidades(
  page: number = 1,
  limit: number = 10,
  filtros?: {
    modalidade_id?: number;
    data_inicio?: string;
    data_fim?: string;
    fornecedor_id?: number;
  }
): Promise<{
  faturamentos: Array<{
    id: number;
    pedido_id: number;
    numero_pedido: string;
    fornecedor_id: number;
    nome_fornecedor: string;
    valor_total: number;
    data_faturamento: string;
    modalidades: FaturamentoModalidade[];
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (filtros) {
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  const { data } = await apiWithRetry.get(`/faturamento-modalidades?${params}`);
  return data;
}

// Obter prévia do faturamento
export async function obterPreviaFaturamento(pedido_id: number): Promise<{
  pedido: {
    id: number;
    numero_pedido: string;
    valor_total: number;
  };
  itens: Array<{
    item_id: number;
    nome_produto: string;
    subtotal: number;
    modalidades: Array<{
      modalidade_id: number;
      nome_modalidade: string;
      valor_modalidade: number;
      percentual: number;
    }>;
  }>;
  resumo_modalidades: Array<{
    modalidade_id: number;
    nome_modalidade: string;
    valor_total: number;
    percentual_total: number;
  }>;
}> {
  const { data } = await apiWithRetry.get(`/faturamento-modalidades/pedido/${pedido_id}/previa`);
  
  // O backend retorna {success: true, data: {divisoes, resumo}}
  // Precisamos transformar para a estrutura esperada pelo frontend
  if (!data.success || !data.data) {
    throw new Error('Erro ao obter prévia do faturamento');
  }

  const { divisoes, resumo } = data.data;
  
  // Transformar divisoes em itens
  const itens = divisoes.map((divisao: any) => ({
    item_id: divisao.item_id,
    nome_produto: divisao.nome_produto,
    subtotal: divisao.valor_total_original,
    modalidades: divisao.divisoes_modalidades.map((div: any) => ({
      modalidade_id: div.modalidade_id,
      nome_modalidade: div.nome_modalidade,
      valor_modalidade: div.valor_modalidade,
      percentual: div.percentual
    }))
  }));

  // Calcular resumo por modalidade
  const modalidadesMap = new Map();
  divisoes.forEach((divisao: any) => {
    divisao.divisoes_modalidades.forEach((div: any) => {
      const key = div.modalidade_id;
      if (!modalidadesMap.has(key)) {
        modalidadesMap.set(key, {
          modalidade_id: div.modalidade_id,
          nome_modalidade: div.nome_modalidade,
          valor_total: 0,
          percentual_total: 0
        });
      }
      const modalidade = modalidadesMap.get(key);
      modalidade.valor_total += div.valor_modalidade;
    });
  });

  const resumo_modalidades = Array.from(modalidadesMap.values()).map(mod => ({
    ...mod,
    percentual_total: resumo.valor_total > 0 ? (mod.valor_total / resumo.valor_total) * 100 : 0
  }));

  return {
    pedido: {
      id: pedido_id,
      numero_pedido: `Pedido ${pedido_id}`, // Placeholder - seria melhor obter do backend
      valor_total: resumo.valor_total
    },
    itens,
    resumo_modalidades
  };
}