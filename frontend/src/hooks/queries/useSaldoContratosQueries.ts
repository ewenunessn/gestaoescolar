import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import saldoContratosModalidadesService, {
  SaldoContratosModalidadesFilters,
  CadastrarSaldoModalidadeRequest
} from '../../services/saldoContratosModalidadesService';

// Query keys
export const SALDO_CONTRATOS_QUERY_KEY = (filtros: SaldoContratosModalidadesFilters) => ['saldoContratos', filtros];
export const MODALIDADES_QUERY_KEY = ['modalidades'];
export const PRODUTOS_CONTRATOS_QUERY_KEY = ['produtosContratos'];
export const RESUMO_ALUNOS_QUERY_KEY = ['resumoAlunos'];
export const HISTORICO_CONSUMO_QUERY_KEY = (id: number) => ['historicoConsumo', id];

// Hook para listar saldos por modalidade
export const useSaldosModalidades = (filtros: SaldoContratosModalidadesFilters = {}) => {
  return useQuery({
    queryKey: SALDO_CONTRATOS_QUERY_KEY(filtros),
    queryFn: () => saldoContratosModalidadesService.listarSaldosModalidades(filtros),
  });
};

// Hook para listar modalidades
export const useModalidades = () => {
  return useQuery({
    queryKey: MODALIDADES_QUERY_KEY,
    queryFn: () => saldoContratosModalidadesService.listarModalidades(),
  });
};

// Hook para listar produtos de contratos
export const useProdutosContratos = () => {
  return useQuery({
    queryKey: PRODUTOS_CONTRATOS_QUERY_KEY,
    queryFn: () => saldoContratosModalidadesService.listarProdutosContratos(),
  });
};

// Hook para listar resumo de alunos
export const useResumoAlunos = () => {
  return useQuery({
    queryKey: RESUMO_ALUNOS_QUERY_KEY,
    queryFn: () => saldoContratosModalidadesService.listarResumoAlunos(),
  });
};

// Hook para buscar histórico de consumo
export const useHistoricoConsumo = (id: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: HISTORICO_CONSUMO_QUERY_KEY(id),
    queryFn: () => saldoContratosModalidadesService.buscarHistoricoConsumoModalidade(id),
    enabled: enabled && id > 0,
  });
};

// Hook para cadastrar/atualizar saldo por modalidade
export const useCadastrarSaldoModalidade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: CadastrarSaldoModalidadeRequest) =>
      saldoContratosModalidadesService.cadastrarSaldoModalidade(dados),
    onSuccess: () => {
      // Invalidar todas as queries de saldo contratos
      queryClient.invalidateQueries({ queryKey: ['saldoContratos'] });
    },
  });
};

// Hook para registrar consumo
export const useRegistrarConsumo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quantidade, observacao, dataConsumo }: { 
      id: number; 
      quantidade: number; 
      observacao?: string;
      dataConsumo?: string;
    }) =>
      saldoContratosModalidadesService.registrarConsumoModalidade(id, quantidade, observacao, dataConsumo),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['saldoContratos'] });
      queryClient.invalidateQueries({ queryKey: HISTORICO_CONSUMO_QUERY_KEY(variables.id) });
    },
  });
};

// Hook para excluir consumo
export const useExcluirConsumo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saldoId, consumoId }: { saldoId: number; consumoId: number }) =>
      saldoContratosModalidadesService.excluirConsumoModalidade(saldoId, consumoId),
    onSuccess: (_, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['saldoContratos'] });
      queryClient.invalidateQueries({ queryKey: HISTORICO_CONSUMO_QUERY_KEY(variables.saldoId) });
    },
  });
};
