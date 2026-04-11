/**
 * Hooks do React Query para operações de produtos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';
import { produtoService, CriarProdutoRequest, AtualizarProdutoRequest } from '../../services/produtos';
import { Produto, ProdutoCreate, ProdutoUpdate } from '../../../../shared/types';

// ============================================================================
// QUERIES
// ============================================================================

export function useProdutos(filters?: { search?: string; categoria?: string; ativo?: boolean }) {
  return useQuery({
    queryKey: queryKeys.produtos.list(filters),
    queryFn: produtoService.listar,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
    queryFn: () => produtoService.buscarPorId(id),
    enabled: enabled && !!id,
    ...cacheConfig.static,
  });
}

export function useCategoriasProdutos() {
  return useQuery({
    queryKey: queryKeys.produtos.categorias(),
    queryFn: async () => {
      const produtos = await produtoService.listar();
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
    mutationFn: (data: CriarProdutoRequest) => produtoService.criar(data),
    onSuccess: (newProduto) => {
      queryClient.removeQueries({ queryKey: queryKeys.produtos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });

      if (newProduto?.id) {
        queryClient.setQueryData(queryKeys.produtos.detail(newProduto.id), newProduto);
      }
    },
  });
}

export function useAtualizarProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AtualizarProdutoRequest }) =>
      produtoService.atualizar(id, data),
    onSuccess: (updatedProduto, { id }) => {
      queryClient.setQueryData(queryKeys.produtos.detail(id), updatedProduto);
      queryClient.removeQueries({ queryKey: queryKeys.produtos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

export function useExcluirProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => produtoService.remover(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.produtos.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.produtos.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}