/**
 * Hooks para queries de modalidades com isolamento por tenant
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../../lib/queryClient';
import { listarModalidades, buscarModalidade, criarModalidade, editarModalidade, removerModalidade } from '../../services/modalidades';
import { useTenant } from '../../context/TenantContext';
import type { Modalidade, ModalidadeInput } from '../../services/modalidades';

/**
 * Hook para listar modalidades do tenant atual
 */
export function useModalidades() {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: queryKeys.modalidades.list(undefined, currentTenant?.id),
    queryFn: listarModalidades,
    enabled: !!currentTenant, // Só executa se há um tenant selecionado
    ...cacheConfig.moderate,
  });
}

/**
 * Hook para buscar uma modalidade específica
 */
export function useModalidade(id: number) {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: queryKeys.modalidades.detail(id, currentTenant?.id),
    queryFn: () => buscarModalidade(id),
    enabled: !!currentTenant && !!id,
    ...cacheConfig.moderate,
  });
}

/**
 * Hook para criar modalidade
 */
export function useCreateModalidade() {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: criarModalidade,
    onSuccess: () => {
      // Invalidar lista de modalidades do tenant atual
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.all(currentTenant?.id)
      });
    },
  });
}

/**
 * Hook para editar modalidade
 */
export function useUpdateModalidade() {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ModalidadeInput }) => 
      editarModalidade(id, data),
    onSuccess: (_, { id }) => {
      // Invalidar modalidade específica e lista
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.detail(id, currentTenant?.id)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.all(currentTenant?.id)
      });
    },
  });
}

/**
 * Hook para remover modalidade
 */
export function useDeleteModalidade() {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: removerModalidade,
    onSuccess: (_, id) => {
      // Remover modalidade específica do cache e invalidar lista
      queryClient.removeQueries({
        queryKey: queryKeys.modalidades.detail(id, currentTenant?.id)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.modalidades.all(currentTenant?.id)
      });
    },
  });
}