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
    ...cacheConfig.moderate,
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
      // Invalidar lista de modalidades
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.all
      });
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
      // Invalidar modalidade específica e lista
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.detail(id)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.all
      });
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
      // Remover modalidade específica do cache e invalidar lista
      queryClient.removeQueries({
        queryKey: queryKeys.modalidades.detail(id)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.all
      });
    },
  });
}