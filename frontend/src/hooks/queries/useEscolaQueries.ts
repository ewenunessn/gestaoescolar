/**
 * Hooks do React Query para operações de escolas
 */

import React from 'react';
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
  
  // Adicionar um pequeno delay para garantir que o token foi carregado
  const [isReady, setIsReady] = React.useState(false);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  return useQuery({
    queryKey: queryKeys.escolas.list(filters),
    queryFn: listarEscolas,
    enabled: isReady && !!token, // Só executar se estiver pronto E houver token
    staleTime: 0, // Sempre considerar dados como desatualizados
    gcTime: 5 * 60 * 1000, // Manter em cache por 5 minutos
    refetchOnMount: true, // Sempre refetch ao montar
    refetchOnWindowFocus: true, // Refetch ao focar na janela
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
      // Remover TODOS os caches de escolas
      queryClient.removeQueries({ queryKey: queryKeys.escolas.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all });
      
      // Adicionar escola ao cache de detalhes
      if (newEscola?.id) {
        queryClient.setQueryData(queryKeys.escolas.detail(newEscola.id), newEscola);
      }
    },
  });
}

export function useAtualizarEscola() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      editarEscola(id, data),
    onSuccess: (updatedEscola, { id }) => {
      // Atualizar escola no cache de detalhes
      queryClient.setQueryData(queryKeys.escolas.detail(id), updatedEscola);
      
      // Remover TODOS os caches de listas
      queryClient.removeQueries({ queryKey: queryKeys.escolas.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all });
      
      // Invalidar modalidades (pois o total de alunos pode ter mudado)
      invalidateQueries.modalidades();
    },
  });
}

export function useExcluirEscola() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removerEscola,
    onSuccess: (_, id) => {
      // Remover escola do cache de detalhes
      queryClient.removeQueries({ queryKey: queryKeys.escolas.detail(id) });
      
      // Remover TODOS os caches de listas
      queryClient.removeQueries({ queryKey: queryKeys.escolas.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all });
    },
  });
}
