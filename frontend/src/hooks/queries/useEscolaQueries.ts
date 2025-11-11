/**
 * Hooks do React Query para operações de escolas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';
import { Escola, EscolaCreate, EscolaUpdate } from '../../../../shared/types';

import { 
  listarEscolas, 
  buscarEscola, 
  criarEscola, 
  editarEscola, 
  removerEscola 
} from '../../services/escolas';

// ============================================================================
// QUERIES
// ============================================================================

export function useEscolas(filters?: { search?: string; ativo?: boolean }) {
  // Só executar query se houver token (usuário autenticado)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  return useQuery({
    queryKey: queryKeys.escolas.list(filters),
    queryFn: listarEscolas,
    enabled: !!token, // Só executar se houver token
    ...cacheConfig.static,
    select: (data: Escola[]) => {
      let filteredData = [...data];
      
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter(escola => 
          escola.nome.toLowerCase().includes(searchLower) ||
          escola.endereco?.toLowerCase().includes(searchLower) ||
          escola.diretor?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters?.ativo !== undefined) {
        filteredData = filteredData.filter(escola => escola.ativo === filters.ativo);
      }
      
      return filteredData.sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });
}

export function useEscola(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.escolas.detail(id),
    queryFn: () => buscarEscola(id),
    enabled: enabled && !!id,
    ...cacheConfig.static,
  });
}

export function useEscolasAtivas() {
  return useEscolas({ ativo: true });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCriarEscola() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: criarEscola,
    onSuccess: (newEscola) => {
      // Invalidar lista de escolas
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.lists() });
      
      // Adicionar escola ao cache
      queryClient.setQueryData(queryKeys.escolas.detail(newEscola.id), newEscola);
      
      // Invalidar estoque relacionado
      invalidateQueries.estoque();
    },
  });
}

export function useAtualizarEscola() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      editarEscola(id, data),
    onSuccess: (updatedEscola, { id }) => {
      // Atualizar escola no cache
      queryClient.setQueryData(queryKeys.escolas.detail(id), updatedEscola);
      
      // Invalidar lista de escolas
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.lists() });
      
      // Invalidar estoque relacionado
      invalidateQueries.estoqueEscola(id);
    },
  });
}

export function useExcluirEscola() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removerEscola,
    onSuccess: (_, id) => {
      // Remover escola do cache
      queryClient.removeQueries({ queryKey: queryKeys.escolas.detail(id) });
      
      // Invalidar lista de escolas
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.lists() });
      
      // Invalidar estoque relacionado
      invalidateQueries.estoqueEscola(id);
    },
  });
}