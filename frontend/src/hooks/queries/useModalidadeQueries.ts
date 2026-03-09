/**
 * Hooks para queries de modalidades
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../../lib/queryClient';
import { listarModalidades, buscarModalidade, criarModalidade, editarModalidade, removerModalidade } from '../../services/modalidades';
import type { Modalidade, ModalidadeInput } from '../../services/modalidades';

/**
 * Hook para listar modalidades
 */
export function useModalidades() {
  return useQuery({
    queryKey: queryKeys.modalidades.list(),
    queryFn: listarModalidades,
    staleTime: 0, // Sempre considerar dados como desatualizados
    gcTime: 5 * 60 * 1000, // Manter em cache por 5 minutos
    refetchOnMount: true, // Sempre refetch ao montar
    refetchOnWindowFocus: true, // Refetch ao focar na janela
  });
}

/**
 * Hook para buscar uma modalidade específica
 */
export function useModalidade(id: number) {
  return useQuery({
    queryKey: queryKeys.modalidades.detail(id),
    queryFn: () => buscarModalidade(id),
    enabled: !!id,
    ...cacheConfig.moderate,
  });
}

/**
 * Hook para criar modalidade
 */
export function useCreateModalidade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: criarModalidade,
    onSuccess: () => {
      // Remover TODOS os caches de modalidades
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}

/**
 * Hook para editar modalidade
 */
export function useUpdateModalidade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModalidadeInput }) => 
      editarModalidade(id, data),
    onSuccess: (_, { id }) => {
      // Atualizar modalidade no cache de detalhes
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.detail(id) });
      
      // Remover TODOS os caches de listas
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}

/**
 * Hook para remover modalidade
 */
export function useDeleteModalidade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removerModalidade,
    onSuccess: (_, id) => {
      // Remover modalidade do cache de detalhes
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.detail(id) });
      
      // Remover TODOS os caches de listas
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.lists() });
      
      // Invalidar para forçar refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}