import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buscarRefeicao,
  editarRefeicao,
  deletarRefeicao,
  listarProdutosDaRefeicao,
  adicionarProdutoNaRefeicao,
  editarProdutoNaRefeicao,
  removerProdutoDaRefeicao,
} from '../../services/refeicoes';
import { listarProdutos } from '../../services/produtos';
import { listarModalidades } from '../../services/modalidades';

// Query keys
export const REFEICAO_DETALHE_QUERY_KEY = (id: number) => ['refeicao', id];
export const REFEICAO_PRODUTOS_QUERY_KEY = (id: number) => ['refeicao-produtos', id];
export const PRODUTOS_QUERY_KEY = ['produtos'];
export const MODALIDADES_QUERY_KEY = ['modalidades'];

// Hook para buscar uma refeição específica
export const useRefeicao = (id: number) => {
  return useQuery({
    queryKey: REFEICAO_DETALHE_QUERY_KEY(id),
    queryFn: () => buscarRefeicao(id),
    enabled: !!id,
  });
};

// Hook para listar produtos da refeição
export const useProdutosDaRefeicao = (refeicaoId: number) => {
  return useQuery({
    queryKey: REFEICAO_PRODUTOS_QUERY_KEY(refeicaoId),
    queryFn: () => listarProdutosDaRefeicao(refeicaoId),
    enabled: !!refeicaoId,
  });
};

// Hook para listar todos os produtos disponíveis
export const useProdutos = () => {
  return useQuery({
    queryKey: PRODUTOS_QUERY_KEY,
    queryFn: listarProdutos,
  });
};

// Hook para listar modalidades
export const useModalidades = () => {
  return useQuery({
    queryKey: MODALIDADES_QUERY_KEY,
    queryFn: listarModalidades,
  });
};

// Hook para editar refeição
export const useEditarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => editarRefeicao(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REFEICAO_DETALHE_QUERY_KEY(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['refeicoes'] });
    },
  });
};

// Hook para deletar refeição
export const useDeletarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletarRefeicao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refeicoes'] });
    },
  });
};

// Hook para adicionar produto na refeição
export const useAdicionarProdutoNaRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      refeicaoId,
      produtoId,
      perCapita,
      tipoMedida,
      perCapitaPorModalidade,
    }: {
      refeicaoId: number;
      produtoId: number;
      perCapita: number;
      tipoMedida: 'gramas' | 'unidades';
      perCapitaPorModalidade?: Array<{ modalidade_id: number; per_capita: number }>;
    }) => adicionarProdutoNaRefeicao(refeicaoId, produtoId, perCapita, tipoMedida, perCapitaPorModalidade),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REFEICAO_PRODUTOS_QUERY_KEY(variables.refeicaoId) });
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', variables.refeicaoId] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', variables.refeicaoId] });
    },
  });
};

// Hook para editar produto na refeição
export const useEditarProdutoNaRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      refeicaoId,
      perCapita,
      tipoMedida,
      perCapitaPorModalidade,
    }: {
      id: number;
      refeicaoId: number;
      perCapita: number;
      tipoMedida?: 'gramas' | 'unidades';
      perCapitaPorModalidade?: Array<{ modalidade_id: number; per_capita: number }>;
    }) => editarProdutoNaRefeicao(id, perCapita, tipoMedida, perCapitaPorModalidade),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REFEICAO_PRODUTOS_QUERY_KEY(variables.refeicaoId) });
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', variables.refeicaoId] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', variables.refeicaoId] });
    },
  });
};

// Hook para remover produto da refeição
export const useRemoverProdutoDaRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, refeicaoId }: { id: number; refeicaoId: number }) => removerProdutoDaRefeicao(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REFEICAO_PRODUTOS_QUERY_KEY(variables.refeicaoId) });
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', variables.refeicaoId] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', variables.refeicaoId] });
    },
  });
};
