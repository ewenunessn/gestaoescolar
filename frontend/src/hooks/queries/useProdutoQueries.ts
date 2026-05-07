/**
 * Hooks do React Query para operações de produtos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';
import { produtoService } from '../../services/produtos';
import type { AtualizarProdutoRequest, CriarProdutoRequest, Produto } from '../../types/produto';

// ============================================================================
// QUERIES
// ============================================================================

export function useProdutos(filters?: { search?: string; categoria?: string; ativo?: boolean }) {
  return useQuery({
    queryKey: queryKeys.produtos.list(filters),
    queryFn: () => produtoService.listar(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status ?? error?.status;
      if (status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
    select: (data: Produto[]) => {
      let filteredData = [...data];

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(produto =>
          produto.nome.toLowerCase().includes(searchLower) ||
          (produto.categoria || '').toLowerCase().includes(searchLower)
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
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.produtos.categorias(),
    queryFn: async () => {
      const produtos = await queryClient.fetchQuery({
        queryKey: queryKeys.produtos.list(undefined),
        queryFn: () => produtoService.listar(),
        staleTime: 5 * 60 * 1000,
      });
      return [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status ?? error?.status;
      if (status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
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
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}
