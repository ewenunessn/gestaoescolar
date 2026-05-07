import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { cacheConfig, invalidateQueries, queryKeys } from '../../lib/queryClient';
import { buscarEscola, criarEscola, editarEscola, listarEscolas, removerEscola } from '../../services/escolas';
import type { Escola } from '../../types/escola';

export function useEscolas(filters?: { search?: string; ativo?: boolean }) {
  const { isReady, hasToken } = useAuth();

  return useQuery({
    queryKey: queryKeys.escolas.list(filters),
    queryFn: () => listarEscolas(),
    enabled: isReady && hasToken,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    select: (data: Escola[]) => {
      let filteredData = [...data];

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = filteredData.filter((escola) =>
          escola.nome.toLowerCase().includes(searchLower) ||
          escola.endereco?.toLowerCase().includes(searchLower) ||
          escola.nome_gestor?.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.ativo !== undefined) {
        filteredData = filteredData.filter((escola) => escola.ativo === filters.ativo);
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

export function useCriarEscola() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: criarEscola,
    onSuccess: (newEscola) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all });

      if (newEscola?.id) {
        queryClient.setQueryData(queryKeys.escolas.detail(newEscola.id), newEscola);
      }
    },
  });
}

export function useAtualizarEscola() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => editarEscola(id, data),
    onSuccess: (updatedEscola, { id }) => {
      queryClient.setQueryData(queryKeys.escolas.detail(id), updatedEscola);
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all });
      invalidateQueries.modalidades();
    },
  });
}

export function useExcluirEscola() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removerEscola,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.escolas.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all });
    },
  });
}
