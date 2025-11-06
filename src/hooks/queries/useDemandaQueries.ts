/**
 * Hooks do React Query para operações de demandas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig, invalidateQueries } from '../../lib/queryClient';
import demandasService from '../../services/demandas';
import { Demanda } from '../../types/demanda';

// ============================================================================
// QUERIES
// ============================================================================

export function useDemandas(filters?: {
  escola_id?: number;
  escola_nome?: string;
  objeto?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  return useQuery({
    queryKey: queryKeys.demandas.list(filters),
    queryFn: () => demandasService.listar(filters),
    ...cacheConfig.moderate,
    select: (data: Demanda[]) => {
      // Ordenar por data de solicitação (mais recentes primeiro)
      return data.sort((a, b) => 
        new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
      );
    },
  });
}

export function useDemanda(id: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.demandas.detail(id),
    queryFn: () => demandasService.buscarPorId(id),
    enabled: enabled && !!id,
    ...cacheConfig.moderate,
  });
}

export function useSolicitantesDemandas() {
  return useQuery({
    queryKey: [...queryKeys.demandas.all, 'solicitantes'],
    queryFn: demandasService.listarSolicitantes,
    ...cacheConfig.static,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCriarDemanda() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: demandasService.criar,
    onSuccess: (newDemanda) => {
      // Invalidar lista de demandas
      queryClient.invalidateQueries({ queryKey: queryKeys.demandas.lists() });
      
      // Adicionar demanda ao cache
      queryClient.setQueryData(queryKeys.demandas.detail(newDemanda.id), newDemanda);
    },
  });
}

export function useAtualizarDemanda() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Demanda> }) => 
      demandasService.atualizar(id, data),
    onSuccess: (updatedDemanda, { id }) => {
      // Atualizar demanda no cache
      queryClient.setQueryData(queryKeys.demandas.detail(id), updatedDemanda);
      
      // Invalidar lista de demandas
      queryClient.invalidateQueries({ queryKey: queryKeys.demandas.lists() });
    },
  });
}

export function useAtualizarStatusDemanda() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      id, 
      status, 
      data_resposta_semead, 
      observacoes 
    }: { 
      id: number; 
      status: string; 
      data_resposta_semead?: string; 
      observacoes?: string; 
    }) => 
      demandasService.atualizarStatus(id, status, data_resposta_semead, observacoes),
    onSuccess: (updatedDemanda, { id }) => {
      // Atualizar demanda no cache
      queryClient.setQueryData(queryKeys.demandas.detail(id), updatedDemanda);
      
      // Invalidar lista de demandas
      queryClient.invalidateQueries({ queryKey: queryKeys.demandas.lists() });
    },
  });
}

export function useExcluirDemanda() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: demandasService.excluir,
    onSuccess: (_, id) => {
      // Remover demanda do cache
      queryClient.removeQueries({ queryKey: queryKeys.demandas.detail(id) });
      
      // Invalidar lista de demandas
      queryClient.invalidateQueries({ queryKey: queryKeys.demandas.lists() });
    },
  });
}

// ============================================================================
// HOOKS ESPECÍFICOS
// ============================================================================

export function useDemandasPorStatus(status?: string) {
  return useDemandas({ status });
}

export function useDemandasPorEscola(escolaId: number) {
  return useDemandas({ escola_id: escolaId });
}

export function useDemandasPendentes() {
  return useDemandas({ status: 'pendente' });
}

export function useDemandasAprovadas() {
  return useDemandas({ status: 'aprovada' });
}