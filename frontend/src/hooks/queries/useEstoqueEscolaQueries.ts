import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listarEstoqueEscola, 
  registrarMovimentacao, 
  obterResumoEstoque,
  listarHistoricoEstoque,
  ItemEstoqueEscola 
} from '../../services/estoqueEscola';
import { queryKeys } from '../../lib/queryClient';
import { useTenant } from '../../context/TenantContext';

// Hook para listar estoque de uma escola
export const useEstoqueEscola = (escolaId: number | null) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: escolaId ? queryKeys.estoque.escola(escolaId, currentTenant?.id) : ['estoque-escola', null, currentTenant?.id],
    queryFn: () => escolaId ? listarEstoqueEscola(escolaId) : Promise.resolve([]),
    enabled: !!escolaId && !!currentTenant,
    staleTime: 30 * 1000, // 30 segundos (reduzido para atualizar mais rápido)
    refetchOnWindowFocus: true, // Atualiza quando volta para a janela
    refetchInterval: 60 * 1000, // Atualiza automaticamente a cada 1 minuto
    throwOnError: (error: any) => {
      // Handle tenant-specific errors
      if (error?.response?.status === 403 && error?.response?.data?.code === 'TENANT_OWNERSHIP_ERROR') {
        console.error('Tenant ownership error:', error.response.data.message);
        return false; // Don't throw, handle gracefully
      }
      return true; // Throw other errors
    },
  });
};

// Hook para obter resumo do estoque
export const useResumoEstoque = (escolaId: number | null) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: escolaId ? [...queryKeys.estoque.escola(escolaId, currentTenant?.id), 'resumo'] : ['resumo-estoque', null, currentTenant?.id],
    queryFn: () => escolaId ? obterResumoEstoque(escolaId) : Promise.resolve(null),
    enabled: !!escolaId && !!currentTenant,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    throwOnError: (error: any) => {
      // Handle tenant-specific errors
      if (error?.response?.status === 403 && error?.response?.data?.code === 'TENANT_OWNERSHIP_ERROR') {
        console.error('Tenant ownership error:', error.response.data.message);
        return false; // Don't throw, handle gracefully
      }
      return true; // Throw other errors
    },
  });
};

// Hook para listar histórico
export const useHistoricoEstoque = (escolaId: number | null, produtoId?: number) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: escolaId ? [...queryKeys.estoque.escola(escolaId, currentTenant?.id), 'historico', produtoId] : ['historico-estoque', null, produtoId, currentTenant?.id],
    queryFn: () => escolaId ? listarHistoricoEstoque(escolaId, produtoId) : Promise.resolve([]),
    enabled: !!escolaId && !!currentTenant,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
    throwOnError: (error: any) => {
      // Handle tenant-specific errors
      if (error?.response?.status === 403 && error?.response?.data?.code === 'TENANT_OWNERSHIP_ERROR') {
        console.error('Tenant ownership error:', error.response.data.message);
        return false; // Don't throw, handle gracefully
      }
      return true; // Throw other errors
    },
  });
};

// Hook para registrar movimentação
export const useRegistrarMovimentacao = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();

  return useMutation({
    mutationFn: ({ 
      escolaId, 
      dadosMovimentacao 
    }: { 
      escolaId: number; 
      dadosMovimentacao: {
        produto_id: number;
        tipo_movimentacao: 'entrada' | 'saida' | 'ajuste';
        quantidade: number;
        motivo?: string;
        documento_referencia?: string;
        usuario_id?: number;
        data_validade?: string;
      }
    }) => registrarMovimentacao(escolaId, dadosMovimentacao),
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas para forçar atualização usando query keys consistentes com tenant
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.escola(variables.escolaId, currentTenant?.id) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.estoque.escola(variables.escolaId, currentTenant?.id), 'resumo'] });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.estoque.escola(variables.escolaId, currentTenant?.id), 'historico'] });
      
      // Também invalidar queries gerais de estoque para o tenant atual
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.all(currentTenant?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.escolar(currentTenant?.id) });
    },
    onError: (error: any) => {
      // Handle tenant-specific errors
      if (error?.response?.status === 403) {
        const errorCode = error?.response?.data?.code;
        if (errorCode === 'TENANT_OWNERSHIP_ERROR') {
          console.error('Tenant ownership error during movement:', error.response.data.message);
        } else if (errorCode === 'CROSS_TENANT_INVENTORY_ACCESS') {
          console.error('Cross-tenant access error during movement:', error.response.data.message);
        }
      }
      throw error; // Re-throw to let the component handle it
    },
  });
};