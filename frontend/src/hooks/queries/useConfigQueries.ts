/**
 * Hooks do React Query para operações de configurações
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheConfig } from '../../lib/queryClient';
import configService, { ConfiguracaoSistema } from '../../services/configService';

// ============================================================================
// QUERIES
// ============================================================================

export function useConfiguracao(chave: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.configuracoes.detail(chave),
    queryFn: () => configService.buscarConfiguracao(chave),
    enabled: enabled && !!chave,
    ...cacheConfig.static,
  });
}

export function useConfiguracoesPorCategoria(categoria: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.configuracoes.list({ categoria }),
    queryFn: () => configService.listarConfiguracoesPorCategoria(categoria),
    enabled: enabled && !!categoria,
    ...cacheConfig.static,
  });
}

export function useConfiguracaoComCache(chave: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.configuracoes.detail(chave), 'cached'],
    queryFn: () => configService.buscarConfiguracaoComCache(chave),
    enabled: enabled && !!chave,
    ...cacheConfig.moderate,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useSalvarConfiguracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config) => configService.salvarConfiguracao(config),
    onSuccess: (savedConfig) => {
      // Atualizar configuração no cache
      queryClient.setQueryData(
        queryKeys.configuracoes.detail(savedConfig.chave), 
        savedConfig
      );
      
      // Invalidar lista de configurações da categoria
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.configuracoes.list({ categoria: savedConfig.categoria }) 
      });
      
      // Limpar cache do serviço
      configService.limparCache();
    },
  });
}

export function useAtualizarConfiguracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chave, valor }: { chave: string; valor: string }) => 
      configService.atualizarConfiguracao(chave, valor),
    onSuccess: (updatedConfig, { chave }) => {
      // Atualizar configuração no cache
      queryClient.setQueryData(
        queryKeys.configuracoes.detail(chave), 
        updatedConfig
      );
      
      // Invalidar lista de configurações da categoria
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.configuracoes.list({ categoria: updatedConfig.categoria }) 
      });
      
      // Limpar cache do serviço
      configService.limparCache();
    },
  });
}

// ============================================================================
// HOOKS ESPECÍFICOS
// ============================================================================

export function useConfiguracoesSistema() {
  return useConfiguracoesPorCategoria('sistema');
}

export function useConfiguracoesInterface() {
  return useConfiguracoesPorCategoria('interface');
}

export function useConfiguracoesNotificacao() {
  return useConfiguracoesPorCategoria('notificacao');
}

export function useConfiguracoesRelatorio() {
  return useConfiguracoesPorCategoria('relatorio');
}