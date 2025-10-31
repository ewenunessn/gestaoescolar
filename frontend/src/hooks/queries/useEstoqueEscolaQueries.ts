import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listarEstoqueEscola, 
  registrarMovimentacao, 
  obterResumoEstoque,
  listarHistoricoEstoque,
  ItemEstoqueEscola 
} from '../../services/estoqueEscola';
import { queryKeys } from '../../lib/queryClient';

// Hook para listar estoque de uma escola
export const useEstoqueEscola = (escolaId: number | null) => {
  return useQuery({
    queryKey: escolaId ? queryKeys.estoque.escola(escolaId) : ['estoque-escola', null],
    queryFn: () => escolaId ? listarEstoqueEscola(escolaId) : Promise.resolve([]),
    enabled: !!escolaId,
    staleTime: 30 * 1000, // 30 segundos (reduzido para atualizar mais rápido)
    refetchOnWindowFocus: true, // Atualiza quando volta para a janela
    refetchInterval: 60 * 1000, // Atualiza automaticamente a cada 1 minuto
  });
};

// Hook para obter resumo do estoque
export const useResumoEstoque = (escolaId: number | null) => {
  return useQuery({
    queryKey: escolaId ? [...queryKeys.estoque.escola(escolaId), 'resumo'] : ['resumo-estoque', null],
    queryFn: () => escolaId ? obterResumoEstoque(escolaId) : Promise.resolve(null),
    enabled: !!escolaId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook para listar histórico
export const useHistoricoEstoque = (escolaId: number | null, produtoId?: number) => {
  return useQuery({
    queryKey: escolaId ? [...queryKeys.estoque.escola(escolaId), 'historico', produtoId] : ['historico-estoque', null, produtoId],
    queryFn: () => escolaId ? listarHistoricoEstoque(escolaId, produtoId) : Promise.resolve([]),
    enabled: !!escolaId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false,
  });
};

// Hook para registrar movimentação
export const useRegistrarMovimentacao = () => {
  const queryClient = useQueryClient();

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
      // Invalidar queries relacionadas para forçar atualização usando query keys consistentes
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.escola(variables.escolaId) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.estoque.escola(variables.escolaId), 'resumo'] });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.estoque.escola(variables.escolaId), 'historico'] });
      
      // Também invalidar queries gerais de estoque
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.all });
    },
  });
};