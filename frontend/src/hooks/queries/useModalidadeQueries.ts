import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../../lib/queryClient';
import { modalidadeService, Modalidade, ModalidadeInput } from '../../services/modalidades';

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

export function useModalidade(id: number) {
  return useQuery({
    queryKey: queryKeys.modalidades.detail(id),
    queryFn: () => modalidadeService.buscarPorId(id),
    enabled: !!id,
    ...cacheConfig.moderate,
  });
}

export function useCreateModalidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ModalidadeInput) => modalidadeService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}

export function useUpdateModalidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModalidadeInput }) =>
      modalidadeService.atualizar(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}

export function useDeleteModalidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => modalidadeService.remover(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.modalidades.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all });
    },
  });
}
