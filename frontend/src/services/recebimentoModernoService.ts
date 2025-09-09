import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Interfaces para o frontend
export interface RecebimentoModerno {
  id: number;
  pedido_id: number;
  numero_recebimento: string;
  usuario_recebedor_id: number;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  data_inicio: string;
  data_finalizacao?: string;
  observacoes?: string;
  total_itens_esperados: number;
  total_itens_recebidos: number;
  percentual_recebido: number;
  criado_por: string;
  atualizado_por?: string;
  numero_pedido?: string;
  nome_usuario_recebedor?: string;
  valor_total_esperado?: number;
  valor_total_recebido?: number;
}

export interface RecebimentoItem {
  id: number;
  recebimento_id: number;
  pedido_item_id: number;
  produto_id: number;
  fornecedor_id: number;
  quantidade_esperada: number;
  quantidade_recebida: number;
  quantidade_pendente: number;
  preco_unitario: number;
  valor_total_esperado: number;
  valor_total_recebido: number;
  status: 'PENDENTE' | 'PARCIAL' | 'COMPLETO' | 'EXCEDENTE';
  observacoes?: string;
  nome_produto?: string;
  unidade?: string;
  nome_fornecedor?: string;
  pedido_fornecedor_id?: number;
  lotes?: RecebimentoLote[];
}

export interface RecebimentoFornecedor {
  fornecedor: {
    id: number;
    nome: string;
  };
  itens: RecebimentoItem[];
  totais: {
    quantidade_esperada: number;
    quantidade_recebida: number;
    valor_total_esperado: number;
    valor_total_recebido: number;
    percentual_recebido: number;
  };
}

export interface RecebimentoLote {
  id: number;
  recebimento_item_id: number;
  numero_lote: string;
  data_fabricacao?: string;
  data_validade?: string;
  quantidade_lote: number;
  observacoes_lote?: string;
  data_recebimento: string;
  usuario_recebedor_id: number;
  nome_produto?: string;
  nome_usuario_recebedor?: string;
}

export interface RecebimentoHistorico {
  id: number;
  recebimento_id: number;
  tipo_operacao: 'CRIACAO' | 'RECEBIMENTO_ITEM' | 'RECEBIMENTO_LOTE' | 'FINALIZACAO' | 'CANCELAMENTO' | 'OBSERVACAO';
  descricao: string;
  dados_anteriores?: string;
  dados_novos?: string;
  data_operacao: string;
  usuario_id: number;
  ip_usuario?: string;
  nome_usuario?: string;
}

export interface CriarRecebimentoRequest {
  pedido_id: number;
  usuario_recebedor_id: number;
  observacoes?: string;
}

export interface ReceberLoteRequest {
  numero_lote: string;
  quantidade_lote: number;
  data_fabricacao?: string;
  data_validade?: string;
  observacoes_lote?: string;
}

export interface ListarRecebimentosResponse {
  success: boolean;
  data: RecebimentoModerno[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PedidoParaRecebimento {
  id: number;
  numero_pedido: string;
  usuario_id: number;
  status: string;
  valor_total: number;
  data_criacao: string;
  data_atualizacao: string;
  nome_usuario?: string;
  total_fornecedores?: number;
  total_itens?: number;
  tem_recebimento_ativo?: boolean;
}

export interface ListarPedidosParaRecebimentoResponse {
  success: boolean;
  data: PedidoParaRecebimento[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RecebimentoDetalhadoResponse {
  success: boolean;
  data: RecebimentoModerno & {
    itensPorFornecedor: {
      [fornecedor_id: number]: RecebimentoFornecedor;
    };
  };
}

export interface StatusItensPedidoResponse {
  success: boolean;
  data: {
    pedido_id: number;
    itensPorFornecedor: {
      [fornecedor_id: number]: {
        fornecedor: {
          id: number;
          nome: string;
          status: string;
        };
        itens: Array<{
          pedido_item_id: number;
          produto_id: number;
          quantidade: number;
          preco_unitario: number;
          subtotal: number;
          nome_produto: string;
          unidade: string;
          nome_fornecedor: string;
          fornecedor_id: number;
          status_fornecedor: string;
          status_recebimento: 'NAO_INICIADO' | 'PENDENTE' | 'PARCIAL' | 'COMPLETO' | 'EXCEDENTE';
          quantidade_esperada: number;
          quantidade_recebida: number;
          quantidade_pendente: number;
          valor_total_recebido: number;
          recebimento_id?: number;
          numero_recebimento?: string;
          status_recebimento_geral?: string;
          percentual_recebido: number;
        }>;
        resumo: {
          total_itens: number;
          itens_nao_iniciados: number;
          itens_pendentes: number;
          itens_parciais: number;
          itens_completos: number;
          valor_total_esperado: number;
          valor_total_recebido: number;
          percentual_geral: number;
        };
      };
    };
  };
}

// Função para obter o token de autenticação
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Configuração do axios com interceptor para adicionar token
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpar tokens inválidos
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Se não estiver na página de login, mostrar mensagem mais clara
      if (window.location.pathname !== '/login') {
        console.warn('Sessão expirada. Token removido do localStorage.');
      }
    }
    return Promise.reject(error);
  }
);

// Serviços da API
export const recebimentoModernoService = {
  // Inicializar sistema (executar uma vez)
  async inicializar(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/recebimentos-modernos/init');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao inicializar sistema de recebimento');
    }
  },

  // Criar recebimento
  async criarRecebimento(dados: CriarRecebimentoRequest): Promise<RecebimentoModerno> {
    try {
      const response = await api.post('/recebimentos-modernos', dados);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao criar recebimento');
    }
  },

  // Listar recebimentos
  async listarRecebimentos(filtros?: {
    status?: string;
    pedido_id?: number;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    limit?: number;
  }): Promise<ListarRecebimentosResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.pedido_id) params.append('pedido_id', filtros.pedido_id.toString());
      if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.limit) params.append('limit', filtros.limit.toString());

      const response = await api.get(`/recebimentos-modernos?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao listar recebimentos');
    }
  },

  // Buscar recebimento por ID
  async buscarRecebimento(id: number): Promise<RecebimentoDetalhadoResponse> {
    try {
      console.log('🔍 DEBUG Service - Buscando recebimento ID:', id);
      const response = await api.get(`/recebimentos-modernos/${id}`);
      
      console.log('✅ Resposta da API:', response.status);
      console.log('   - Data completa:', response.data);
      console.log('   - Success:', response.data.success);
      console.log('   - Tem data:', !!response.data.data);
      console.log('   - Tem itensPorFornecedor:', !!response.data.data?.itensPorFornecedor);
      
      if (response.data.data?.itensPorFornecedor) {
        console.log('   - Keys itensPorFornecedor:', Object.keys(response.data.data.itensPorFornecedor));
        console.log('   - Quantidade fornecedores:', Object.keys(response.data.data.itensPorFornecedor).length);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro no service:', error);
      throw new Error(error.response?.data?.message || 'Erro ao buscar recebimento');
    }
  },

  // Receber lote
  async receberLote(recebimentoItemId: number, dados: ReceberLoteRequest): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/recebimentos-modernos/itens/${recebimentoItemId}/receber-lote`, dados);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao receber lote');
    }
  },

  // Finalizar recebimento
  async finalizarRecebimento(id: number, observacoes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/recebimentos-modernos/${id}/finalizar`, {
        observacoes_finalizacao: observacoes
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao finalizar recebimento');
    }
  },

  // Cancelar recebimento
  async cancelarRecebimento(id: number, motivo: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/recebimentos-modernos/${id}/cancelar`, {
        motivo_cancelamento: motivo
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao cancelar recebimento');
    }
  },

  // Buscar histórico do recebimento
  async buscarHistorico(id: number): Promise<RecebimentoHistorico[]> {
    try {
      const response = await api.get(`/recebimentos-modernos/${id}/historico`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar histórico do recebimento');
    }
  },

  // Buscar recebimentos por pedido
  async buscarRecebimentosPorPedido(pedidoId: number): Promise<RecebimentoModerno[]> {
    try {
      const response = await api.get(`/recebimentos-modernos/pedido/${pedidoId}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar recebimentos do pedido');
    }
  },

  // Upload de comprovante
  async uploadComprovante(recebimentoId: number, arquivo: File): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      const formData = new FormData();
      formData.append('comprovante', arquivo);
      
      const response = await api.post(`/recebimentos-modernos/${recebimentoId}/comprovante`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao fazer upload do comprovante');
    }
  },

  // Buscar comprovantes do recebimento
  async buscarComprovantes(recebimentoId: number): Promise<{ id: number; nome_arquivo: string; url: string; data_upload: string }[]> {
    try {
      const response = await api.get(`/recebimentos-modernos/${recebimentoId}/comprovantes`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar comprovantes');
    }
  },

  // Remover comprovante
  async removerComprovante(recebimentoId: number, comprovanteId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/recebimentos-modernos/${recebimentoId}/comprovantes/${comprovanteId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao remover comprovante');
    }
  },

  // Listar pedidos confirmados prontos para recebimento
  async listarPedidosParaRecebimento(filtros?: {
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    limit?: number;
    busca?: string;
  }): Promise<ListarPedidosParaRecebimentoResponse> {
    try {
      const params = new URLSearchParams();
      
      // Sempre filtrar apenas pedidos confirmados
      params.append('status', 'CONFIRMADO');
      
      if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.limit) params.append('limit', filtros.limit.toString());
      if (filtros?.busca) params.append('busca', filtros.busca);

      const response = await api.get(`/recebimentos-modernos/pedidos-para-recebimento?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao listar pedidos para recebimento');
    }
  },

  // Buscar status detalhado dos itens de um pedido
  async buscarStatusItensPedido(pedidoId: number): Promise<StatusItensPedidoResponse> {
    try {
      const response = await api.get(`/recebimentos-modernos/pedido/${pedidoId}/status-itens`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar status dos itens do pedido');
    }
  }
};

// Utilitários para formatação
export const formatarStatusRecebimento = (status: string): string => {
  const statusMap: Record<string, string> = {
    'EM_ANDAMENTO': 'Em Andamento',
    'FINALIZADO': 'Finalizado',
    'CANCELADO': 'Cancelado'
  };
  return statusMap[status] || status;
};

export const formatarStatusItem = (status: string): string => {
  const statusMap: Record<string, string> = {
    'NAO_INICIADO': 'Não Iniciado',
    'PENDENTE': 'Pendente',
    'PARCIAL': 'Parcial',
    'COMPLETO': 'Completo',
    'EXCEDENTE': 'Excedente'
  };
  return statusMap[status] || status;
};

export const getCorStatusRecebimento = (status: string): string => {
  const corMap: Record<string, string> = {
    'EM_ANDAMENTO': '#2563eb',
    'FINALIZADO': '#059669',
    'CANCELADO': '#dc2626'
  };
  return corMap[status] || '#6b7280';
};

export const getCorStatusItem = (status: string): string => {
  const corMap: Record<string, string> = {
    'NAO_INICIADO': '#6b7280',
    'PENDENTE': '#d97706',
    'PARCIAL': '#2563eb',
    'COMPLETO': '#059669',
    'EXCEDENTE': '#dc2626'
  };
  return corMap[status] || '#6b7280';
};

export const getBgColorStatusRecebimento = (status: string): string => {
  const bgMap: Record<string, string> = {
    'EM_ANDAMENTO': '#dbeafe',
    'FINALIZADO': '#dcfce7',
    'CANCELADO': '#fee2e2'
  };
  return bgMap[status] || '#f3f4f6';
};

export const getBgColorStatusItem = (status: string): string => {
  const bgMap: Record<string, string> = {
    'NAO_INICIADO': '#f3f4f6',
    'PENDENTE': '#fef3c7',
    'PARCIAL': '#dbeafe',
    'COMPLETO': '#dcfce7',
    'EXCEDENTE': '#fee2e2'
  };
  return bgMap[status] || '#f3f4f6';
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

export const formatarDataSimples = (data: string): string => {
  return new Date(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatarPreco = (preco: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(preco);
};

export const calcularPercentualItem = (recebido: number, esperado: number): number => {
  if (esperado === 0) return 0;
  return Math.round((recebido / esperado) * 100);
};

export const formatarTipoOperacao = (tipo: string): string => {
  const tipoMap: Record<string, string> = {
    'CRIACAO': 'Criação',
    'RECEBIMENTO_ITEM': 'Recebimento de Item',
    'RECEBIMENTO_LOTE': 'Recebimento de Lote',
    'FINALIZACAO': 'Finalização',
    'CANCELAMENTO': 'Cancelamento',
    'OBSERVACAO': 'Observação'
  };
  return tipoMap[tipo] || tipo;
};