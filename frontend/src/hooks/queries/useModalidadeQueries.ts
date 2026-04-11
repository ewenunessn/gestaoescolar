import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../../lib/queryClient';
import { modalidadeService, Modalidade, ModalidadeInput } from '../../services/modalidades';

/**
 * Hook para listar modalidades
 */
export function useModalidades() {
  return useQuery({
    queryKey: queryKeys.modalidades.list(),
    queryFn: modalidadeService.listar,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para buscar uma modalidade específica
 */
export function useModalidade(id: number) {
  return useQuery({
    queryKey: queryKeys.modalidades.detail(id),
    queryFn: () => modalidadeService.buscarPorId(id),
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
    mutationFn: (data: ModalidadeInput) => modalidadeService.criar(data),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.lists() });
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
      modalidadeService.atualizar(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.lists() });
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
    mutationFn: (id: number) => modalidadeService.remover(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}