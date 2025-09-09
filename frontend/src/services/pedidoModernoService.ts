import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Interfaces para o frontend
export interface PedidoModerno {
  id: number;
  numero_pedido: string;
  usuario_id: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'RECEBIMENTO' | 'RECEBIDO' | 'EM_PREPARACAO' | 'ENVIADO' | 'ENTREGUE' | 'FATURADO' | 'CANCELADO';
  valor_total: number;
  desconto_aplicado?: number;
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

export interface PedidoFornecedor {
  id: number;
  pedido_id: number;
  fornecedor_id: number;
  status: 'PENDENTE' | 'CONFIRMADO' | 'RECEBIMENTO' | 'RECEBIDO' | 'EM_PREPARACAO' | 'ENVIADO' | 'ENTREGUE' | 'FATURADO' | 'CANCELADO';
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
    faturamentos: Array<{
      fornecedor_id: number;
      nome_fornecedor: string;
      status: string;
      valor_pedido: number;
    }>;
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
export const pedidoModernoService = {
  // Inicializar sistema (executar uma vez)
  async inicializar(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post('/pedidos-modernos/init');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao inicializar sistema de pedidos');
    }
  },

  // Criar pedido
  async criarPedido(dados: CriarPedidoRequest): Promise<PedidoModerno> {
    try {
      // Validar dados antes de enviar
      const { validarCriarPedidoRequest } = await import('../types/pedidos');
      const erros = validarCriarPedidoRequest(dados);
      
      if (erros.length > 0) {
        throw new Error(`Dados inválidos: ${erros.join(', ')}`);
      }

      const response = await api.post('/pedidos-modernos', dados);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Dados do pedido inválidos');
      }
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      if (error.response?.status >= 500) {
        throw new Error('Erro interno do servidor. Tente novamente mais tarde.');
      }
      throw new Error(error.message || 'Erro ao criar pedido');
    }
  },

  // Listar pedidos do usuário
  async listarPedidos(filtros?: {
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    page?: number;
    limit?: number;
  }): Promise<ListarPedidosResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filtros?.status) params.append('status', filtros.status);
      if (filtros?.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros?.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros?.page) params.append('page', filtros.page.toString());
      if (filtros?.limit) params.append('limit', filtros.limit.toString());

      const response = await api.get(`/pedidos-modernos?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao listar pedidos');
    }
  },

  // Buscar pedido por ID
  async buscarPedido(id: number): Promise<PedidoDetalhadoResponse> {
    try {
      const response = await api.get(`/pedidos-modernos/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar pedido');
    }
  },

  // Atualizar status do pedido
  async atualizarStatus(id: number, status: string, observacoes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/pedidos-modernos/${id}/status`, {
        status,
        observacoes
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar status do pedido');
    }
  },

  // Buscar histórico do pedido
  async buscarHistorico(id: number): Promise<PedidoHistorico[]> {
    try {
      const response = await api.get(`/pedidos-modernos/${id}/historico`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar histórico do pedido');
    }
  },

  // Buscar status detalhado dos itens de um pedido
  async buscarStatusItensPedido(id: number): Promise<{
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
  }> {
    try {
      // Tentar usar a rota específica primeiro
      try {
        const response = await api.get(`/pedidos-modernos/${id}/status-itens`);
        return response.data;
      } catch (statusError) {
        console.warn('Rota status-itens não disponível, usando dados do pedido:', statusError);
        
        // Fallback: usar dados do pedido normal
        const pedidoResponse = await this.buscarPedido(id);
        if (!pedidoResponse.success || !pedidoResponse.data) {
          throw new Error('Não foi possível obter dados do pedido');
        }

        const { pedido, itens } = pedidoResponse.data;
        
        // Agrupar itens por fornecedor
        const itensPorFornecedor: any = {};
        
        itens.forEach((item: any) => {
          const fornecedorId = item.fornecedor_id || 0;
          
          if (!itensPorFornecedor[fornecedorId]) {
            itensPorFornecedor[fornecedorId] = {
              fornecedor: {
                id: fornecedorId,
                nome: item.nome_fornecedor || 'Fornecedor não encontrado',
                status: 'PENDENTE'
              },
              itens: [],
              resumo: {
                total_itens: 0,
                itens_nao_iniciados: 0,
                itens_pendentes: 0,
                itens_parciais: 0,
                itens_completos: 0,
                valor_total_esperado: 0,
                valor_total_recebido: 0,
                percentual_geral: 0
              }
            };
          }
          
          const itemFormatado = {
            pedido_item_id: item.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade || 0,
            preco_unitario: item.preco_unitario || 0,
            subtotal: item.subtotal || 0,
            nome_produto: item.nome_produto || 'Produto não encontrado',
            unidade: item.unidade || 'UN',
            nome_fornecedor: item.nome_fornecedor || 'Fornecedor não encontrado',
            fornecedor_id: fornecedorId,
            status_fornecedor: 'PENDENTE',
            status_recebimento: 'NAO_INICIADO' as const,
            quantidade_recebida: 0,
            quantidade_pendente: item.quantidade || 0,
            valor_total_recebido: 0,
            percentual_recebido: 0
          };
          
          itensPorFornecedor[fornecedorId].itens.push(itemFormatado);
          itensPorFornecedor[fornecedorId].resumo.total_itens++;
          itensPorFornecedor[fornecedorId].resumo.itens_nao_iniciados++;
          itensPorFornecedor[fornecedorId].resumo.valor_total_esperado += itemFormatado.subtotal;
        });
        
        return {
          success: true,
          data: {
            pedido_id: id,
            itensPorFornecedor
          }
        };
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao buscar status dos itens do pedido');
    }
  },

  // Cancelar pedido
  async cancelarPedido(id: number, motivo: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/pedidos-modernos/${id}/cancelar`, {
        motivo
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao cancelar pedido');
    }
  },

  // Atualizar data de entrega de um item
  async atualizarDataEntregaItem(itemId: number, dataEntrega: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/pedidos-modernos/itens/${itemId}/data-entrega`, {
        data_entrega_prevista: dataEntrega
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar data de entrega');
    }
  },

  // Atualizar múltiplas datas de entrega
  async atualizarDatasEntregaItens(itens: Array<{ id: number; data_entrega_prevista: string }>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/pedidos-modernos/itens/datas-entrega`, {
        itens
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar datas de entrega');
    }
  },

  // Atualizar observações do pedido
  async atualizarObservacoes(id: number, observacoes: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/pedidos-modernos/${id}/observacoes`, {
        observacoes
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar observações');
    }
  },

  // Confirmar pedido
  async confirmarPedido(id: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.put(`/pedidos-modernos/${id}/confirmar`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao confirmar pedido');
    }
  },

  // Verificar se pedido pode ser excluído
  async verificarExclusao(id: number): Promise<{
    pode_excluir: boolean;
    motivo?: string;
    detalhes?: {
      status: string;
      tem_entregas: boolean;
      tem_confirmacoes: boolean;
    };
  }> {
    try {
      const response = await api.get(`/pedidos-modernos/${id}/verificar-exclusao`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar exclusão');
    }
  },

  // Excluir pedido
  async excluirPedido(id: number): Promise<{
    success: boolean;
    message: string;
    detalhes?: {
      pedido_removido: boolean;
      fornecedores_removidos: number;
      itens_removidos: number;
      historico_removido: number;
    };
  }> {
    try {
      const response = await api.delete(`/pedidos-modernos/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao excluir pedido');
    }
  },

  // Excluir múltiplos pedidos
  async excluirPedidosLote(pedidosIds: number[]): Promise<{
    success: boolean;
    message: string;
    pedidos_excluidos: number;
    pedidos_com_erro: number;
    detalhes: Array<{
      pedido_id: number;
      numero_pedido?: string;
      sucesso: boolean;
      mensagem: string;
    }>;
  }> {
    try {
      const response = await api.delete('/pedidos-modernos/lote/excluir', {
        data: { pedidos_ids: pedidosIds }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao excluir pedidos em lote');
    }
  }
};

// Função para formatar tipo de pedido
export const formatarTipoPedido = (tipo?: string): string => {
  if (!tipo) return 'Padrão';
  
  const tipos: { [key: string]: string } = {
    'normal': 'Normal',
    'urgente': 'Urgente',
    'especial': 'Especial',
    'emergencia': 'Emergência',
    'padrao': 'Padrão'
  };
  
  return tipos[tipo.toLowerCase()] || tipo;
};

// Utilitários para formatação (importados de types/pedidos.ts)
export { 
  formatarStatusPedido, 
  getCorStatus, 
  formatarData, 
  formatarPreco,
  validarPedidoItem,
  validarCriarPedidoRequest
} from '../types/pedidos';