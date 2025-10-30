import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listarEstoqueEscola, 
  registrarMovimentacao, 
  obterResumoEstoque,
  listarHistoricoEstoque,
  ItemEstoqueEscola 
} from '../../services/estoqueEscola';

// Hook para listar estoque de uma escola
export const useEstoqueEscola = (escolaId: number | null) => {
  return useQuery({
    queryKey: ['estoque-escola', escolaId],
    queryFn: () => escolaId ? listarEstoqueEscola(escolaId) : Promise.resolve([]),
    enabled: !!escolaId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });
};

// Hook para obter resumo do estoque
export const useResumoEstoque = (escolaId: number | null) => {
  return useQuery({
    queryKey: ['resumo-estoque', escolaId],
    queryFn: () => escolaId ? obterResumoEstoque(escolaId) : Promise.resolve(null),
    enabled: !!escolaId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Hook para listar histórico
export const useHistoricoEstoque = (escolaId: number | null, produtoId?: number) => {
  return useQuery({
    queryKey: ['historico-estoque', escolaId, produtoId],
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
      // Invalidar queries relacionadas para forçar atualização
      queryClient.invalidateQueries({ queryKey: ['estoque-escola', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['resumo-estoque', variables.escolaId] });
      queryClient.invalidateQueries({ queryKey: ['historico-estoque', variables.escolaId] });
    },
  });
};