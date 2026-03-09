/**
 * Hooks do React Query para operações de produtos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';
import { Produto, ProdutoCreate, ProdutoUpdate } from '../../../../shared/types';

import { 
  listarProdutos, 
  buscarProduto, 
  criarProduto, 
  editarProduto, 
  removerProduto 
} from '../../services/produtos';

// ============================================================================
// QUERIES
// ============================================================================

export function useProdutos(filters?: { search?: string; categoria?: string; ativo?: boolean }) {
  return useQuery({
    queryKey: queryKeys.produtos.list(filters),
    queryFn: listarProdutos,
    staleTime: 0, // Sempre considerar dados como desatualizados
    gcTime: 5 * 60 * 1000, // Manter em cache por 5 minutos
    refetchOnMount: true, // Sempre refetch ao montar
    refetchOnWindowFocus: true, // Refetch ao focar na janela
    select: (data: Produto[]) => {
      let filteredData = [...data];
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(produto => 
          produto.nome.toLowerCase().includes(searchLower) ||
          produto.categoria.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters?.categoria) {
        filteredData = filteredData.filter(produto => produto.categoria === filters.categoria);
      }
      
      if (filters?.ativo !== undefined) {
        filteredData = filteredData.filter(produto => produto.ativo === filters.ativo);
      }
      
      return filteredData;
    },
  });
}

export function useProduto(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.produtos.detail(id),
    queryFn: () => buscarProduto(id),
    enabled: enabled && !!id,
    ...cacheConfig.static,
  });
}

export function useCategoriasProdutos() {
  return useQuery({
    queryKey: queryKeys.produtos.categorias(),
    queryFn: async () => {
      const produtos = await listarProdutos();
      return [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    },
    ...cacheConfig.static,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCriarProduto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: criarProduto,
    onSuccess: (newProduto) => {
      // Remover TODOS os caches de produtos
      queryClient.removeQueries({ queryKey: queryKeys.produtos.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
      
      // Adicionar produto ao cache de detalhes
      if (newProduto?.id) {
        queryClient.setQueryData(queryKeys.produtos.detail(newProduto.id), newProduto);
      }
      
      // Invalidar estoque relacionado
      invalidateQueries.estoque();
    },
  });
}

export function useAtualizarProduto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      editarProduto(id, data),
    onSuccess: (updatedProduto, { id }) => {
      // Atualizar produto no cache de detalhes
      queryClient.setQueryData(queryKeys.produtos.detail(id), updatedProduto);
      
      // Remover TODOS os caches de listas
      queryClient.removeQueries({ queryKey: queryKeys.produtos.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
      
      // Invalidar estoque relacionado
      invalidateQueries.produto(id);
    },
  });
}

export function useExcluirProduto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removerProduto,
    onSuccess: (_, id) => {
      // Remover produto do cache de detalhes
      queryClient.removeQueries({ queryKey: queryKeys.produtos.detail(id) });
      
      // Remover TODOS os caches de listas
      queryClient.removeQueries({ queryKey: queryKeys.produtos.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
      
      // Invalidar estoque relacionado
      invalidateQueries.produto(id);
    },
  });
}