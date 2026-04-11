import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nutricionistaService, nutricionistaServiceExtended, NutricionistaCreate } from '../../services/nutricionistas';

// Query keys
export const nutricionistaKeys = {
  all: ['nutricionistas'] as const,
  lists: () => [...nutricionistaKeys.all, 'list'] as const,
  list: (ativo?: boolean) => [...nutricionistaKeys.lists(), { ativo }] as const,
  details: () => [...nutricionistaKeys.all, 'detail'] as const,
  detail: (id: number) => [...nutricionistaKeys.details(), id] as const,
};

// Queries
export function useNutricionistas(ativo?: boolean) {
  return useQuery({
    queryKey: nutricionistaKeys.list(ativo),
    queryFn: () =>
      ativo !== undefined
        ? nutricionistaServiceExtended.listarPorAtivo(ativo)
        : nutricionistaService.listar(),
  });
}

export function useNutricionista(id: number) {
  return useQuery({
    queryKey: nutricionistaKeys.detail(id),
    queryFn: () => nutricionistaService.buscarPorId(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateNutricionista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NutricionistaCreate) => nutricionistaService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutricionistaKeys.lists() });
    },
  });
}

export function useUpdateNutricionista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NutricionistaCreate> }) =>
      nutricionistaService.atualizar(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: nutricionistaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: nutricionistaKeys.detail(variables.id) });
    },
  });
}

export function useDeleteNutricionista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => nutricionistaService.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutricionistaKeys.lists() });
    },
  });
}

export function useDesativarNutricionista() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: nutricionistaServiceExtended.desativarNutricionista,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: nutricionistaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: nutricionistaKeys.detail(id) });
    },
  });
}

// Export agrupado para facilitar uso
export const useNutricionistaQueries = {
  useList: useNutricionistas,
  useDetail: useNutricionista,
  useCreate: useCreateNutricionista,
  useUpdate: useUpdateNutricionista,
  useDelete: useDeleteNutricionista,
  useDesativar: useDesativarNutricionista,
};
