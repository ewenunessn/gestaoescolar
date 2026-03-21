import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listarPeriodos,
  obterPeriodoAtivo,
  criarPeriodo,
  atualizarPeriodo,
  ativarPeriodo,
  fecharPeriodo,
  reabrirPeriodo,
  deletarPeriodo,
  selecionarPeriodo,
  Periodo
} from '../../services/periodos';

// Query para listar períodos
export const usePeriodos = () => {
  return useQuery({
    queryKey: ['periodos'],
    queryFn: listarPeriodos,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: false, // Desabilitar retry para evitar sobrecarga
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
  });
};

// Query para obter período ativo
export const usePeriodoAtivo = () => {
  return useQuery({
    queryKey: ['periodo-ativo'],
    queryFn: obterPeriodoAtivo,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: false, // Desabilitar retry para evitar sobrecarga
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
  });
};

// Mutation para criar período
export const useCriarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: criarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para atualizar período
export const useAtualizarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => atualizarPeriodo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para ativar período
export const useAtivarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ativarPeriodo,
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
    mutationFn: fecharPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para reabrir período
export const useReabrirPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reabrirPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para deletar período
export const useDeletarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletarPeriodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos'] });
    },
  });
};

// Mutation para selecionar período do usuário
export const useSelecionarPeriodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: selecionarPeriodo,
    onSuccess: () => {
      // Invalidar todas as queries
      queryClient.invalidateQueries();
      
      // Recarregar a página após um pequeno delay para garantir que a API foi atualizada
      setTimeout(() => {
        window.location.reload();
      }, 300);
    },
  });
};
