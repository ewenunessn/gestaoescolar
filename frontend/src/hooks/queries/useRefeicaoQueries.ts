import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refeicaoService, refeicaoServiceExtended } from '../../services/refeicoes';
import type { AtualizarRefeicaoRequest, CriarRefeicaoRequest } from '../../types/refeicao';

// Query key
export const REFEICOES_QUERY_KEY = ['refeicoes'];

// Hook para listar refeições
export const useRefeicoes = () => {
  return useQuery({
    queryKey: REFEICOES_QUERY_KEY,
    queryFn: refeicaoService.listar,
  });
};

// Hook para criar refeição
export const useCriarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CriarRefeicaoRequest) => refeicaoService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};

// Hook para editar refeição
export const useEditarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AtualizarRefeicaoRequest }) =>
      refeicaoService.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};

// Hook para deletar refeição
export const useDeletarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => refeicaoService.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};

// Hook para duplicar refeição
export const useDuplicarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) =>
      refeicaoServiceExtended.duplicarRefeicao(id, nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};
