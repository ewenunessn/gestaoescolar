import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodoServiceExtended, Periodo, PeriodoCreate, PeriodoUpdate } from '../../services/periodos';

// Query para listar períodos
export const usePeriodos = () => {
  return useQuery({
    queryKey: ['periodos'],
    queryFn: periodoServiceExtended.listar,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

// Query para obter período ativo
export const usePeriodoAtivo = () => {
  return useQuery({
    queryKey: ['periodo-ativo'],
    queryFn: periodoServiceExtended.obterPeriodoAtivo,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

// Mutation para criar período
export const useCriarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PeriodoCreate) => periodoServiceExtended.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para atualizar período
export const useAtualizarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PeriodoUpdate }) =>
      periodoServiceExtended.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para ativar período
export const useAtivarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: periodoServiceExtended.ativarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
      queryClient.invalidateQueries({ queryKey: ['periodo-ativo'] });
    },
  });
};

// Mutation para fechar período
export const useFecharPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: periodoServiceExtended.fecharPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para reabrir período
export const useReabrirPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: periodoServiceExtended.reabrirPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para deletar período
export const useDeletarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: periodoServiceExtended.remover,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para selecionar período do usuário
export const useSelecionarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: periodoServiceExtended.selecionarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries();
      window.location.reload();
    },
  });
};
