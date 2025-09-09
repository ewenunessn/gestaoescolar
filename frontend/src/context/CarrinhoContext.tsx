import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import {
  CarrinhoItem,
  CarrinhoAgrupado,
  ProdutoContrato,
  AdicionarItemRequest,
  ConfirmarPedidoResponse
} from '../types/carrinho';
import { carrinhoService } from '../services/carrinho';

// Estado do contexto
interface CarrinhoState {
  itens: CarrinhoItem[];
  itensAgrupados: CarrinhoAgrupado[];
  loading: boolean;
  error: string | null;
  totalGeral: number;
}

// Ações do contexto
interface CarrinhoContextType extends CarrinhoState {
  adicionarItem: (produto: ProdutoContrato, quantidade: number) => Promise<void>;
  atualizarQuantidade: (itemId: number, quantidade: number) => Promise<void>;
  removerItem: (itemId: number) => Promise<void>;
  confirmarPedido: (fornecedorId: number) => Promise<ConfirmarPedidoResponse>;
  carregarCarrinho: () => Promise<void>;
  limparCarrinho: () => Promise<void>;
  limparError: () => void;
  getItensPorFornecedor: () => CarrinhoAgrupado[];
  getTotalGeral: () => number;
  isItemNoCarrinho: (produtoId: number, contratoId: number) => boolean;
  getQuantidadeItem: (produtoId: number, contratoId: number) => number;
}

// Tipos de ação para o reducer
type CarrinhoAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ITENS'; payload: CarrinhoItem[] }
  | { type: 'SET_ITENS_AGRUPADOS'; payload: CarrinhoAgrupado[] }
  | { type: 'ADICIONAR_ITEM'; payload: CarrinhoItem }
  | { type: 'ATUALIZAR_ITEM'; payload: { itemId: number; quantidade: number } }
  | { type: 'REMOVER_ITEM'; payload: number }
  | { type: 'LIMPAR_FORNECEDOR'; payload: number }
  | { type: 'LIMPAR_CARRINHO' }
  | { type: 'CALCULAR_TOTAIS' };

// Estado inicial
const initialState: CarrinhoState = {
  itens: [],
  itensAgrupados: [],
  loading: false,
  error: null,
  totalGeral: 0
};

// Função para calcular totais
const calcularTotais = (itens: CarrinhoItem[]): { itensAgrupados: CarrinhoAgrupado[]; totalGeral: number } => {
  // Validar se itens é um array válido
  if (!Array.isArray(itens) || itens.length === 0) {
    return {
      itensAgrupados: [],
      totalGeral: 0
    };
  }

  const grupos: { [key: number]: CarrinhoAgrupado } = {};
  let totalGeral = 0;

  for (const item of itens) {
    const subtotalItem = item.quantidade * item.preco_unitario;
    totalGeral += subtotalItem;

    if (!grupos[item.fornecedor_id]) {
      grupos[item.fornecedor_id] = {
        fornecedor_id: item.fornecedor_id,
        nome_fornecedor: item.nome_fornecedor || 'Fornecedor não identificado',
        itens: [],
        subtotal: 0
      };
    }

    grupos[item.fornecedor_id].itens.push(item);
    grupos[item.fornecedor_id].subtotal += subtotalItem;
  }

  return {
    itensAgrupados: Object.values(grupos),
    totalGeral
  };
};

// Reducer
const carrinhoReducer = (state: CarrinhoState, action: CarrinhoAction): CarrinhoState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };

    case 'SET_ITENS': {
      const { itensAgrupados, totalGeral } = calcularTotais(action.payload);
      return {
        ...state,
        itens: action.payload,
        itensAgrupados,
        totalGeral,
        loading: false,
        error: null
      };
    }

    case 'SET_ITENS_AGRUPADOS':
      return { ...state, itensAgrupados: action.payload };

    case 'ADICIONAR_ITEM': {
      // Verificar se o item já existe
      const existingIndex = state.itens.findIndex(
        item => item.produto_id === action.payload.produto_id && 
                item.contrato_id === action.payload.contrato_id
      );

      let novosItens: CarrinhoItem[];
      if (existingIndex >= 0) {
        // Atualizar item existente
        novosItens = [...state.itens];
        novosItens[existingIndex] = action.payload;
      } else {
        // Adicionar novo item
        novosItens = [...state.itens, action.payload];
      }

      const { itensAgrupados, totalGeral } = calcularTotais(novosItens);
      return {
        ...state,
        itens: novosItens,
        itensAgrupados,
        totalGeral
      };
    }

    case 'ATUALIZAR_ITEM': {
      const novosItens = state.itens.map(item =>
        item.id === action.payload.itemId
          ? { ...item, quantidade: action.payload.quantidade }
          : item
      );

      const { itensAgrupados, totalGeral } = calcularTotais(novosItens);
      return {
        ...state,
        itens: novosItens,
        itensAgrupados,
        totalGeral
      };
    }

    case 'REMOVER_ITEM': {
      const novosItens = state.itens.filter(item => item.id !== action.payload);
      const { itensAgrupados, totalGeral } = calcularTotais(novosItens);
      return {
        ...state,
        itens: novosItens,
        itensAgrupados,
        totalGeral
      };
    }

    case 'LIMPAR_FORNECEDOR': {
      const novosItens = state.itens.filter(item => item.fornecedor_id !== action.payload);
      const { itensAgrupados, totalGeral } = calcularTotais(novosItens);
      return {
        ...state,
        itens: novosItens,
        itensAgrupados,
        totalGeral
      };
    }

    case 'LIMPAR_CARRINHO':
      return {
        ...state,
        itens: [],
        itensAgrupados: [],
        totalGeral: 0
      };

    case 'CALCULAR_TOTAIS': {
      const { itensAgrupados, totalGeral } = calcularTotais(state.itens);
      return {
        ...state,
        itensAgrupados,
        totalGeral
      };
    }

    default:
      return state;
  }
};

// Contexto
const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined);

// Provider
interface CarrinhoProviderProps {
  children: React.ReactNode;
}

export const CarrinhoProvider: React.FC<CarrinhoProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(carrinhoReducer, initialState);

  // Carregar carrinho ao inicializar (apenas se autenticado) - apenas uma vez
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      carregarCarrinho();
    }
  }, []); // Array vazio para executar apenas uma vez

  // Função para carregar carrinho
  const carregarCarrinho = useCallback(async () => {
    // Verificar se o usuário está autenticado
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🔒 Usuário não autenticado, não carregando carrinho');
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const itens = await carrinhoService.getCarrinho();
      // Garantir que sempre temos um array
      const itensArray = Array.isArray(itens) ? itens : [];
      dispatch({ type: 'SET_ITENS', payload: itensArray });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar carrinho';
      console.error('❌ Erro ao carregar carrinho:', errorMessage);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  // Função para adicionar item
  const adicionarItem = useCallback(async (produto: ProdutoContrato, quantidade: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Validações antes de enviar
      if (quantidade <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }
      
      if (quantidade > produto.quantidade_disponivel) {
        throw new Error(`Quantidade máxima disponível: ${produto.quantidade_disponivel}`);
      }
      
      if (!produto.contrato_ativo) {
        throw new Error('Este produto não está disponível pois o contrato está inativo');
      }
      
      const itemRequest: AdicionarItemRequest = {
        produto_id: produto.produto_id,
        contrato_id: produto.contrato_id,
        fornecedor_id: produto.fornecedor_id,
        quantidade,
        preco_unitario: produto.preco_contratual
      };

      const novoItem = await carrinhoService.adicionarItem(itemRequest);
      
      // Adicionar informações de exibição
      const itemCompleto: CarrinhoItem = {
        ...novoItem,
        nome_produto: produto.nome_produto,
        nome_fornecedor: produto.nome_fornecedor,
        unidade: produto.unidade
      };

      dispatch({ type: 'ADICIONAR_ITEM', payload: itemCompleto });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Recarregar o carrinho para garantir sincronização
      await carregarCarrinho();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar item ao carrinho';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error; // Re-throw para permitir tratamento específico nos componentes
    }
  }, []);

  // Função para atualizar quantidade
  const atualizarQuantidade = useCallback(async (itemId: number, quantidade: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Validações antes de enviar
      if (quantidade <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }
      

      
      await carrinhoService.atualizarQuantidade({ 
        item_id: Number(itemId), 
        quantidade: Number(quantidade) 
      });
      dispatch({ type: 'ATUALIZAR_ITEM', payload: { itemId, quantidade } });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar quantidade';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error; // Re-throw para permitir tratamento específico nos componentes
    }
  }, []);

  // Função para remover item
  const removerItem = useCallback(async (itemId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      await carrinhoService.removerItem(itemId);
      dispatch({ type: 'REMOVER_ITEM', payload: itemId });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao remover item do carrinho';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error; // Re-throw para permitir tratamento específico nos componentes
    }
  }, []);

  // Função para confirmar pedido
  const confirmarPedido = useCallback(async (fornecedorId: number): Promise<ConfirmarPedidoResponse> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Validações antes de confirmar
      const itensFornecedor = state.itens.filter(item => item.fornecedor_id === fornecedorId);
      
      if (itensFornecedor.length === 0) {
        throw new Error('Nenhum item encontrado para este fornecedor');
      }
      
      // Verificar se todos os itens têm quantidade válida
      for (const item of itensFornecedor) {
        if (item.quantidade <= 0) {
          throw new Error(`Item ${item.nome_produto || item.produto_id} tem quantidade inválida`);
        }
      }
      
      const response = await carrinhoService.confirmarPedido({ fornecedor_id: fornecedorId });
      
      // Limpar itens do fornecedor do carrinho local
      dispatch({ type: 'LIMPAR_FORNECEDOR', payload: fornecedorId });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao confirmar pedido';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [state.itens]);

  // Função para limpar carrinho
  const limparCarrinho = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      await carrinhoService.limparCarrinho();
      dispatch({ type: 'LIMPAR_CARRINHO' });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao limpar carrinho';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  // Função para limpar erro
  const limparError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Função para obter itens por fornecedor
  const getItensPorFornecedor = useCallback(() => {
    return state.itensAgrupados;
  }, [state.itensAgrupados]);

  // Função para obter total geral
  const getTotalGeral = useCallback(() => {
    return state.totalGeral;
  }, [state.totalGeral]);

  // Função para verificar se item está no carrinho
  const isItemNoCarrinho = useCallback((produtoId: number, contratoId: number) => {
    if (!Array.isArray(state.itens)) {
      return false;
    }
    return state.itens.some(item => 
      item.produto_id === produtoId && item.contrato_id === contratoId
    );
  }, [state.itens]);

  // Função para obter quantidade de um item específico
  const getQuantidadeItem = useCallback((produtoId: number, contratoId: number) => {
    if (!Array.isArray(state.itens)) {
      return 0;
    }
    const item = state.itens.find(item => 
      item.produto_id === produtoId && item.contrato_id === contratoId
    );
    return item ? item.quantidade : 0;
  }, [state.itens]);

  // Memoizar o valor do contexto para evitar re-renders desnecessários
  const contextValue: CarrinhoContextType = useMemo(() => ({
    ...state,
    adicionarItem,
    atualizarQuantidade,
    removerItem,
    confirmarPedido,
    carregarCarrinho,
    limparCarrinho,
    limparError,
    getItensPorFornecedor,
    getTotalGeral,
    isItemNoCarrinho,
    getQuantidadeItem
  }), [
    state,
    adicionarItem,
    atualizarQuantidade,
    removerItem,
    confirmarPedido,
    carregarCarrinho,
    limparCarrinho,
    limparError,
    getItensPorFornecedor,
    getTotalGeral,
    isItemNoCarrinho,
    getQuantidadeItem
  ]);

  return (
    <CarrinhoContext.Provider value={contextValue}>
      {children}
    </CarrinhoContext.Provider>
  );
};

// Hook personalizado
export const useCarrinho = (): CarrinhoContextType => {
  const context = useContext(CarrinhoContext);
  if (context === undefined) {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  }
  return context;
};

export default CarrinhoContext;