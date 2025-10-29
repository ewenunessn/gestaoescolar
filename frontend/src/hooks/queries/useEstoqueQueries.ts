/**
 * Hooks do React Query para operações de estoque
 * Gerencia cache, loading states e sincronização automática
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  listarEstoqueEscolar, 
  buscarEstoqueEscolarProduto, 
  buscarEstoqueMultiplosProdutos,
  buscarMatrizEstoque,
  resetEstoqueGlobal,
  EstoqueEscolarResumo,
  EstoqueEscolarProduto
} from '../../services/estoqueEscolar';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';

// ============================================================================
// QUERIES DE LISTAGEM
// ============================================================================

/**
 * Hook para listar resumo do estoque escolar
 */
export function useEstoqueEscolarResumo() {
  return useQuery({
    queryKey: queryKeys.estoque.escolar(),
    queryFn: listarEstoqueEscolar,
    ...cacheConfig.moderate,
    select: (data: EstoqueEscolarResumo[]) => {
      // Transformar e organizar dados
      return {
        produtos: data,
        totalProdutos: data.length,
        produtosComEstoque: data.filter(p => p.total_escolas_com_estoque > 0).length,
        produtosSemEstoque: data.filter(p => p.total_escolas_com_estoque === 0).length,
        quantidadeTotal: data.reduce((sum, p) => sum + p.total_quantidade, 0),
        categorias: [...new Set(data.map(p => p.categoria).filter(Boolean))].sort(),
      };
    },
  });
}

/**
 * Hook para buscar estoque de um produto específico
 */
export function useEstoqueProduto(produtoId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.estoque.produto(produtoId),
    queryFn: () => buscarEstoqueEscolarProduto(produtoId),
    enabled: enabled && !!produtoId,
    ...cacheConfig.moderate,
  });
}

/**
 * Hook para buscar múltiplos produtos (resolve N+1)
 */
export function useEstoqueMultiplosProdutos(produtoIds: number[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.estoque.matriz(produtoIds),
    queryFn: () => buscarEstoqueMultiplosProdutos(produtoIds),
    enabled: enabled && produtoIds.length > 0,
    ...cacheConfig.moderate,
  });
}

/**
 * Hook para matriz de estoque (escolas x produtos)
 */
export function useMatrizEstoque(produtoIds?: number[], limiteProdutos?: number) {
  return useQuery({
    queryKey: queryKeys.estoque.matriz(produtoIds),
    queryFn: () => buscarMatrizEstoque(produtoIds, limiteProdutos),
    ...cacheConfig.moderate,
    select: (data) => {
      // Organizar dados da matriz
      const escolasMap = new Map();
      const produtosInfo = new Map();
      
      data.escolas?.forEach((escola: any) => {
        escolasMap.set(escola.escola_id, escola);
      });
      
      data.produtos?.forEach((produto: any) => {
        produtosInfo.set(produto.id, produto);
      });
      
      return {
        escolas: Array.from(escolasMap.values()),
        produtos: Array.from(produtosInfo.values()),
        matriz_carregada: data.matriz_carregada,
        totalEscolas: escolasMap.size,
        totalProdutos: produtosInfo.size,
      };
    },
  });
}

// ============================================================================
// QUERIES COM FILTROS E PAGINAÇÃO
// ============================================================================

/**
 * Hook para estoque com filtros e paginação
 */
export function useEstoqueComFiltros(filters: {
  search?: string;
  categoria?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.estoque.escolar(),
    queryFn: listarEstoqueEscolar,
    ...cacheConfig.moderate,
    select: (data: EstoqueEscolarResumo[]) => {
      let filteredData = [...data];
      
      // Aplicar filtros
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.produto_nome.toLowerCase().includes(searchLower) ||
          item.categoria?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.categoria) {
        filteredData = filteredData.filter(item => item.categoria === filters.categoria);
      }
      
      if (filters.status) {
        switch (filters.status) {
          case 'com_estoque':
            filteredData = filteredData.filter(item => item.total_escolas_com_estoque > 0);
            break;
          case 'sem_estoque':
            filteredData = filteredData.filter(item => item.total_escolas_com_estoque === 0);
            break;
          case 'baixo_estoque':
            filteredData = filteredData.filter(item => 
              item.total_escolas_com_estoque > 0 && item.total_quantidade < 10
            );
            break;
        }
      }
      
      // Aplicar paginação
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        data: filteredData.slice(startIndex, endIndex),
        total: filteredData.length,
        page,
        limit,
        totalPages: Math.ceil(filteredData.length / limit),
      };
    },
  });
}

/**
 * Hook para busca infinita de produtos
 */
export function useEstoqueInfinito(filters: { search?: string; categoria?: string }) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.estoque.escolar(), 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => {
      // Simular paginação no cliente (idealmente seria no servidor)
      return listarEstoqueEscolar().then(data => {
        const limit = 20;
        const startIndex = (pageParam - 1) * limit;
        const endIndex = startIndex + limit;
        
        let filteredData = [...data];
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.produto_nome.toLowerCase().includes(searchLower)
          );
        }
        
        if (filters.categoria) {
          filteredData = filteredData.filter(item => item.categoria === filters.categoria);
        }
        
        return {
          data: filteredData.slice(startIndex, endIndex),
          nextPage: endIndex < filteredData.length ? pageParam + 1 : undefined,
          hasMore: endIndex < filteredData.length,
        };
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    ...cacheConfig.moderate,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook para reset do estoque global
 */
export function useResetEstoqueGlobal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: resetEstoqueGlobal,
    onSuccess: () => {
      // Invalidar todos os dados de estoque
      invalidateQueries.estoque();
      invalidateQueries.estatisticas();
    },
    onError: (error) => {
      console.error('Erro ao resetar estoque:', error);
    },
  });
}

// ============================================================================
// HOOKS DE SINCRONIZAÇÃO
// ============================================================================

/**
 * Hook para sincronização automática de dados
 */
export function useEstoqueSyncronization(enabled = true) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: [...queryKeys.estoque.all, 'sync'],
    queryFn: async () => {
      // Verificar se há atualizações no servidor
      const lastUpdate = localStorage.getItem('estoque_last_update');
      const now = new Date().toISOString();
      
      // Se passou mais de 5 minutos, forçar atualização
      if (!lastUpdate || new Date(now).getTime() - new Date(lastUpdate).getTime() > 5 * 60 * 1000) {
        await invalidateQueries.estoque();
        localStorage.setItem('estoque_last_update', now);
      }
      
      return { lastSync: now };
    },
    enabled,
    refetchInterval: 5 * 60 * 1000, // 5 minutos
    ...cacheConfig.realtime,
  });
}

/**
 * Hook para prefetch de dados relacionados
 */
export function usePrefetchEstoque() {
  const queryClient = useQueryClient();
  
  const prefetchProduto = (produtoId: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.estoque.produto(produtoId),
      queryFn: () => buscarEstoqueEscolarProduto(produtoId),
      staleTime: cacheConfig.moderate.staleTime,
    });
  };
  
  const prefetchMatriz = (produtoIds?: number[]) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.estoque.matriz(produtoIds),
      queryFn: () => buscarMatrizEstoque(produtoIds),
      staleTime: cacheConfig.moderate.staleTime,
    });
  };
  
  return {
    prefetchProduto,
    prefetchMatriz,
  };
}

// ============================================================================
// HOOKS DE ESTADO E CACHE
// ============================================================================

/**
 * Hook para gerenciar estado de loading global
 */
export function useEstoqueLoadingState() {
  const estoqueQuery = useEstoqueEscolarResumo();
  const matrizQuery = useMatrizEstoque();
  
  return {
    isLoading: estoqueQuery.isLoading || matrizQuery.isLoading,
    isFetching: estoqueQuery.isFetching || matrizQuery.isFetching,
    isError: estoqueQuery.isError || matrizQuery.isError,
    error: estoqueQuery.error || matrizQuery.error,
  };
}

/**
 * Hook para estatísticas de cache
 */
export function useEstoqueCacheStats() {
  const queryClient = useQueryClient();
  
  return {
    getCacheSize: () => {
      const cache = queryClient.getQueryCache();
      return cache.getAll().length;
    },
    
    getEstoqueQueries: () => {
      const cache = queryClient.getQueryCache();
      return cache.getAll().filter(query => 
        query.queryKey[0] === 'estoque'
      ).length;
    },
    
    clearEstoqueCache: () => {
      queryClient.removeQueries({ queryKey: queryKeys.estoque.all });
    },
  };
}