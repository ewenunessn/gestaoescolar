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
    ...cacheConfig.static,
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
      // Invalidar lista de produtos
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.lists() });
      
      // Adicionar produto ao cache
      queryClient.setQueryData(queryKeys.produtos.detail(newProduto.id), newProduto);
      
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
      // Atualizar produto no cache
      queryClient.setQueryData(queryKeys.produtos.detail(id), updatedProduto);
      
      // Invalidar lista de produtos
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.lists() });
      
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
      // Remover produto do cache
      queryClient.removeQueries({ queryKey: queryKeys.produtos.detail(id) });
      
      // Invalidar lista de produtos
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.lists() });
      
      // Invalidar estoque relacionado
      invalidateQueries.produto(id);
    },
  });
}