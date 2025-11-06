/**
 * Hooks do React Query para operações de fornecedores
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';
import { 
  listarFornecedores, 
  buscarFornecedor, 
  criarFornecedor, 
  editarFornecedor, 
  removerFornecedor 
} from '../../services/fornecedores';

// ============================================================================
// QUERIES
// ============================================================================

export function useFornecedores(filters?: { 
  search?: string; 
  ativo?: boolean;
  cidade?: string;
}) {
  return useQuery({
    queryKey: queryKeys.fornecedores.list(filters),
    queryFn: listarFornecedores,
    ...cacheConfig.static,
    select: (data: any[]) => {
      let filteredData = [...data];
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(fornecedor => 
          fornecedor.nome.toLowerCase().includes(searchLower) ||
          fornecedor.email?.toLowerCase().includes(searchLower) ||
          fornecedor.cidade?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters?.ativo !== undefined) {
        filteredData = filteredData.filter(fornecedor => fornecedor.ativo === filters.ativo);
      }
      
      if (filters?.cidade) {
        filteredData = filteredData.filter(fornecedor => fornecedor.cidade === filters.cidade);
      }
      
      return {
        fornecedores: filteredData,
        total: filteredData.length,
        ativos: filteredData.filter(f => f.ativo).length,
        inativos: filteredData.filter(f => !f.ativo).length,
        cidades: [...new Set(data.map(f => f.cidade).filter(Boolean))].sort(),
      };
    },
  });
}

export function useFornecedor(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.fornecedores.detail(id),
    queryFn: () => buscarFornecedor(id),
    enabled: enabled && !!id,
    ...cacheConfig.static,
  });
}

export function useCidadesFornecedores() {
  return useQuery({
    queryKey: [...queryKeys.fornecedores.all, 'cidades'],
    queryFn: async () => {
      const fornecedores = await listarFornecedores();
      return [...new Set(fornecedores.map(f => f.cidade).filter(Boolean))].sort();
    },
    ...cacheConfig.static,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCriarFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: criarFornecedor,
    onSuccess: (newFornecedor) => {
      // Invalidar lista de fornecedores
      queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.lists() });
      
      // Adicionar fornecedor ao cache
      queryClient.setQueryData(queryKeys.fornecedores.detail(newFornecedor.id), newFornecedor);
    },
  });
}

export function useAtualizarFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      editarFornecedor(id, data),
    onSuccess: (updatedFornecedor, { id }) => {
      // Atualizar fornecedor no cache
      queryClient.setQueryData(queryKeys.fornecedores.detail(id), updatedFornecedor);
      
      // Invalidar lista de fornecedores
      queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.lists() });
    },
  });
}

export function useExcluirFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removerFornecedor,
    onSuccess: (_, id) => {
      // Remover fornecedor do cache
      queryClient.removeQueries({ queryKey: queryKeys.fornecedores.detail(id) });
      
      // Invalidar lista de fornecedores
      queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.lists() });
    },
  });
}

// ============================================================================
// HOOKS ESPECÍFICOS
// ============================================================================

export function useFornecedoresAtivos() {
  return useFornecedores({ ativo: true });
}

export function useFornecedoresComFiltros(filters: {
  search?: string;
  cidade?: string;
  ativo?: boolean;
  page?: number;
  limit?: number;
}) {
  const { data, ...rest } = useFornecedores(filters);
  
  if (!data) return { data: undefined, ...rest };
  
  // Aplicar paginação
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: {
      ...data,
      fornecedores: data.fornecedores.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.total / limit),
      currentPage: page,
    },
    ...rest,
  };
}