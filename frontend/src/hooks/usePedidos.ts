import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PedidoModerno, 
  PedidoFiltros, 
  ListarPedidosResponse,
  PedidoError,
  PedidoNotFoundError,
  PedidoDetalhadoResponse
} from '../types/pedidos';
import { pedidoModernoService } from '../services/pedidoModernoService';

interface UsePedidosState {
  pedidos: PedidoModerno[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsePedidosReturn extends UsePedidosState {
  carregarPedidos: (page?: number, filtros?: PedidoFiltros) => Promise<void>;
  buscarPedido: (id: number) => Promise<PedidoDetalhadoResponse>;
  cancelarPedido: (id: number, motivo: string) => Promise<void>;
  confirmarPedido: (id: number) => Promise<void>;
  verificarExclusao: (id: number) => Promise<any>;
  excluirPedido: (id: number) => Promise<void>;
  excluirPedidosLote: (ids: number[]) => Promise<any>;
  limparError: () => void;
  refetch: () => Promise<void>;
}

export const usePedidos = (filtrosIniciais?: PedidoFiltros): UsePedidosReturn => {
  const [state, setState] = useState<UsePedidosState>({
    pedidos: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    }
  });

  const [filtrosAtuais, setFiltrosAtuais] = useState<PedidoFiltros>(filtrosIniciais || {});
  const isInitializedRef = useRef(false);

  const handleError = useCallback((error: unknown): string => {
    if (error instanceof PedidoError) {
      return error.message;
    }
    
    if (error instanceof Error) {
      // Tratar erros específicos de autenticação
      if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('Token')) {
        return 'Sessão expirada. Faça login novamente para acessar seus pedidos.';
      }
      
      // Tratar erros de conexão
      if (error.message.includes('Network Error') || error.message.includes('ECONNREFUSED')) {
        return 'Erro de conexão. Verifique se o servidor está rodando e tente novamente.';
      }
      
      // Tratar erros de timeout
      if (error.message.includes('timeout')) {
        return 'Tempo limite excedido. Tente novamente.';
      }
      
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return 'Erro desconhecido ao processar pedidos';
  }, []);

  const carregarPedidos = useCallback(async (page = 1, novosFiltros?: PedidoFiltros) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const filtros = novosFiltros || filtrosAtuais;
      if (novosFiltros) {
        setFiltrosAtuais(filtros);
      }
      
      const resultado: ListarPedidosResponse = await pedidoModernoService.listarPedidos({
        ...filtros,
        page,
        limit: state.pagination.limit
      });

      setState(prev => ({
        ...prev,
        pedidos: resultado.data || [],
        pagination: resultado.pagination || prev.pagination,
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = handleError(error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw new PedidoError(errorMessage);
    }
  }, [filtrosAtuais, state.pagination.limit, handleError]);

  const buscarPedido = useCallback(async (id: number): Promise<PedidoDetalhadoResponse> => {
    try {
      const resultado = await pedidoModernoService.buscarPedido(id);
      return resultado;
    } catch (error) {
      handleError(error);
      throw new PedidoNotFoundError(id);
    }
  }, [handleError]);

  const cancelarPedido = useCallback(async (id: number, motivo: string) => {
    if (!motivo.trim()) {
      throw new PedidoError('Motivo do cancelamento é obrigatório');
    }

    try {
      await pedidoModernoService.cancelarPedido(id, motivo);
      
      // Atualizar o pedido na lista local
      setState(prev => ({
        ...prev,
        pedidos: prev.pedidos.map(pedido => 
          pedido.id === id 
            ? { ...pedido, status: 'CANCELADO' as const }
            : pedido
        )
      }));
    } catch (error) {
      const errorMessage = handleError(error);
      throw new PedidoError(errorMessage);
    }
  }, [handleError]);

  const confirmarPedido = useCallback(async (id: number) => {
    try {
      await pedidoModernoService.confirmarPedido(id);
      
      // Atualizar o pedido na lista local
      setState(prev => ({
        ...prev,
        pedidos: prev.pedidos.map(pedido => 
          pedido.id === id 
            ? { ...pedido, status: 'CONFIRMADO' as const }
            : pedido
        )
      }));
    } catch (error) {
      const errorMessage = handleError(error);
      throw new PedidoError(errorMessage);
    }
  }, [handleError]);

  const limparError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const verificarExclusao = useCallback(async (id: number) => {
    try {
      const resultado = await pedidoModernoService.verificarExclusao(id);
      return resultado;
    } catch (error) {
      const errorMessage = handleError(error);
      throw new PedidoError(errorMessage);
    }
  }, [handleError]);

  const excluirPedido = useCallback(async (id: number) => {
    try {
      await pedidoModernoService.excluirPedido(id);
      
      // Remover o pedido da lista local
      setState(prev => ({
        ...prev,
        pedidos: prev.pedidos.filter(pedido => pedido.id !== id),
        pagination: {
          ...prev.pagination,
          total: prev.pagination.total - 1
        }
      }));
    } catch (error) {
      const errorMessage = handleError(error);
      throw new PedidoError(errorMessage);
    }
  }, [handleError]);

  const excluirPedidosLote = useCallback(async (ids: number[]) => {
    try {
      const resultado = await pedidoModernoService.excluirPedidosLote(ids);
      
      // Remover pedidos excluídos com sucesso da lista local
      const idsExcluidos = resultado.detalhes
        .filter((detalhe: any) => detalhe.sucesso)
        .map((detalhe: any) => detalhe.pedido_id);
      
      setState(prev => ({
        ...prev,
        pedidos: prev.pedidos.filter(pedido => !idsExcluidos.includes(pedido.id)),
        pagination: {
          ...prev.pagination,
          total: prev.pagination.total - idsExcluidos.length
        }
      }));
      
      return resultado;
    } catch (error) {
      const errorMessage = handleError(error);
      throw new PedidoError(errorMessage);
    }
  }, [handleError]);

  const refetch = useCallback(async () => {
    await carregarPedidos(state.pagination.page, filtrosAtuais);
  }, [carregarPedidos, state.pagination.page, filtrosAtuais]);

  // Carregar pedidos na inicialização (apenas uma vez)
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      carregarPedidos();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    carregarPedidos,
    buscarPedido,
    cancelarPedido,
    confirmarPedido,
    verificarExclusao,
    excluirPedido,
    excluirPedidosLote,
    limparError,
    refetch
  };
};