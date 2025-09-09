// Tipos específicos para o módulo de pedidos
export interface PedidoModerno {
  id: number;
  numero_pedido: string;
  usuario_id: number;
  status: PedidoStatus;
  valor_total: number;
  observacoes?: string;
  data_criacao: string;
  data_atualizacao: string;
  data_entrega_prevista?: string;
  criado_por: string;
  atualizado_por?: string;
  nome_usuario?: string;
  total_fornecedores?: number;
  total_itens?: number;
}

export type PedidoStatus = 
  | 'PENDENTE' 
  | 'CONFIRMADO' 
  | 'RECEBIMENTO'
  | 'RECEBIDO'
  | 'EM_PREPARACAO' 
  | 'ENVIADO' 
  | 'ENTREGUE' 
  | 'FATURADO'
  | 'CANCELADO';

export interface PedidoFornecedor {
  id: number;
  pedido_id: number;
  fornecedor_id: number;
  status: PedidoStatus;
  valor_subtotal: number;
  observacoes_fornecedor?: string;
  data_confirmacao?: string;
  data_envio?: string;
  data_entrega?: string;
  nome_fornecedor?: string;
  total_itens?: number;
  itens?: PedidoItem[];
}

export interface PedidoItem {
  id: number;
  pedido_fornecedor_id: number;
  produto_id: number;
  contrato_id: number;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  observacoes_item?: string;
  data_entrega_prevista?: string;
  nome_produto?: string;
  unidade?: string;
  numero_contrato?: string;
}

export interface PedidoHistorico {
  id: number;
  pedido_id: number;
  status_anterior: string;
  status_novo: string;
  observacoes?: string;
  data_alteracao: string;
  alterado_por: string;
}

export interface CriarPedidoRequest {
  itens_selecionados: Array<{
    id: number;
    produto_id: number;
    contrato_id: number;
    fornecedor_id: number;
    quantidade: number;
    preco_unitario: number;
  }>;
  observacoes?: string;
  desconto_aplicado?: number;
}

export interface ListarPedidosResponse {
  success: boolean;
  data: PedidoModerno[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PedidoDetalhadoResponse {
  success: boolean;
  data: {
    pedido: PedidoModerno;
    itens: Array<{
      id: number;
      produto_id: number;
      nome_produto: string;
      quantidade: number;
      preco_unitario: number;
      subtotal: number;
      unidade: string;
      nome_fornecedor: string;
      fornecedor_id: number;
    }>;

  };
}

export interface PedidoFiltros {
  status?: PedidoStatus;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  limit?: number;
  busca?: string;
}

// Tipos para erros específicos do módulo
export class PedidoError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'PedidoError';
  }
}

export class PedidoValidationError extends PedidoError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'PedidoValidationError';
  }
}

export class PedidoNotFoundError extends PedidoError {
  constructor(pedidoId: number) {
    super(`Pedido ${pedidoId} não encontrado`, 'NOT_FOUND', 404);
    this.name = 'PedidoNotFoundError';
  }
}

// Utilitários de tipo
export type PedidoStatusConfig = {
  [K in PedidoStatus]: {
    color: string;
    bgColor: string;
    icon: React.ReactNode;
    label: string;
  };
};

export interface PedidoEstatisticas {
  total: number;
  pendentes: number;
  // emRecebimento: number; // removido
  finalizados: number;
}

// Utilitários para formatação e validação
export const formatarStatusPedido = (status: PedidoStatus): string => {
  const statusMap: Record<PedidoStatus, string> = {
    'PENDENTE': 'Pendente',
    'CONFIRMADO': 'Confirmado',
    'RECEBIMENTO': 'Em Recebimento',
    'RECEBIDO': 'Recebido',
    'EM_PREPARACAO': 'Em Preparação',
    'ENVIADO': 'Enviado',
    'ENTREGUE': 'Entregue',
    'FATURADO': 'Faturado',
    'CANCELADO': 'Cancelado'
  };
  return statusMap[status] || status;
};

export const getCorStatus = (status: PedidoStatus): string => {
  const corMap: Record<PedidoStatus, string> = {
    'PENDENTE': '#f59e0b',
    'CONFIRMADO': '#3b82f6',
    'RECEBIMENTO': '#f97316', // Laranja para recebimento em andamento
    'RECEBIDO': '#10b981',    // Verde para recebido
    'EM_PREPARACAO': '#8b5cf6',
    'ENVIADO': '#06b6d4',
    'ENTREGUE': '#10b981',
    'FATURADO': '#6366f1',    // Azul índigo para faturado
    'CANCELADO': '#ef4444'
  };
  return corMap[status] || '#6b7280';
};

// Validar transições de status
export const isValidStatusTransition = (from: PedidoStatus, to: PedidoStatus): boolean => {
  const validTransitions: Record<PedidoStatus, PedidoStatus[]> = {
    'PENDENTE': ['CONFIRMADO', 'CANCELADO'],
    'CONFIRMADO': ['RECEBIMENTO', 'RECEBIDO', 'EM_PREPARACAO', 'CANCELADO'],
    'RECEBIMENTO': ['RECEBIDO', 'CANCELADO'],
    'RECEBIDO': ['EM_PREPARACAO', 'FATURADO', 'CANCELADO'],
    'EM_PREPARACAO': ['ENVIADO', 'CANCELADO'],
    'ENVIADO': ['ENTREGUE'],
    'ENTREGUE': ['FATURADO'],
    'FATURADO': [],
    'CANCELADO': []
  };
  
  return validTransitions[from]?.includes(to) || false;
};

// Verificar se status permite edição
export const isStatusEditable = (status: PedidoStatus): boolean => {
  return ['PENDENTE', 'CONFIRMADO'].includes(status);
};

// Verificar se status permite cancelamento
export const isStatusCancellable = (status: PedidoStatus): boolean => {
  return ['PENDENTE', 'CONFIRMADO', 'EM_PREPARACAO'].includes(status);
};

export const formatarData = (data: string): string => {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatarPreco = (preco: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(preco);
};

// Validadores
export const validarPedidoItem = (item: Partial<PedidoItem>): boolean => {
  return !!(
    item.produto_id &&
    item.contrato_id &&
    item.quantidade &&
    item.quantidade > 0 &&
    item.preco_unitario &&
    item.preco_unitario > 0
  );
};

export const validarCriarPedidoRequest = (request: CriarPedidoRequest): string[] => {
  const erros: string[] = [];
  
  if (!request.itens_selecionados || request.itens_selecionados.length === 0) {
    erros.push('É necessário informar pelo menos um item');
  }
  
  request.itens_selecionados?.forEach((item, index) => {
    if (!item.produto_id) erros.push(`Item ${index + 1}: produto_id é obrigatório`);
    if (!item.contrato_id) erros.push(`Item ${index + 1}: contrato_id é obrigatório`);
    if (!item.fornecedor_id) erros.push(`Item ${index + 1}: fornecedor_id é obrigatório`);
    if (!item.quantidade || item.quantidade <= 0) erros.push(`Item ${index + 1}: quantidade deve ser maior que zero`);
    if (!item.preco_unitario || item.preco_unitario <= 0) erros.push(`Item ${index + 1}: preco_unitario deve ser maior que zero`);
  });
  
  return erros;
};