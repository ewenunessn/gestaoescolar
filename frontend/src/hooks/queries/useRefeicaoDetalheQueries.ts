import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refeicaoService, refeicaoServiceExtended } from '../../services/refeicoes';
import { produtoService } from '../../services/produtos';
import { modalidadeService } from '../../services/modalidades';

// Query keys
export const REFEICAO_DETALHE_QUERY_KEY = (id: number) => ['refeicao', id];
export const REFEICAO_PRODUTOS_QUERY_KEY = (id: number) => ['refeicao-produtos', id];
export const PRODUTOS_QUERY_KEY = ['produtos'];
export const MODALIDADES_QUERY_KEY = ['modalidades'];

// Hook para buscar uma refeição específica
export const useRefeicao = (id: number) => {
  return useQuery({
    queryKey: REFEICAO_DETALHE_QUERY_KEY(id),
    queryFn: () => refeicaoService.buscarPorId(id),
    enabled: !!id,
  });
};

// Hook para listar produtos da refeição
export const useProdutosDaRefeicao = (refeicaoId: number) => {
  return useQuery({
    queryKey: REFEICAO_PRODUTOS_QUERY_KEY(refeicaoId),
    queryFn: () => refeicaoServiceExtended.listarProdutos(refeicaoId),
    enabled: !!refeicaoId,
  });
};

// Hook para listar todos os produtos disponíveis
export const useProdutos = () => {
  return useQuery({
    queryKey: PRODUTOS_QUERY_KEY,
    queryFn: produtoService.listar,
  });
};

// Hook para listar modalidades
export const useModalidades = () => {
  return useQuery({
    queryKey: MODALIDADES_QUERY_KEY,
    queryFn: modalidadeService.listar,
  });
};

// Hook para editar refeição
export const useEditarRefeicao = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => refeicaoService.atualizar(id, data),
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
    mutationFn: (id: number) => refeicaoService.remover(id),
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
      tipoMedida: 'gramas' | 'mililitros' | 'unidades';
      perCapitaPorModalidade?: Array<{ modalidade_id: number; per_capita: number }>;
    }) => refeicaoServiceExtended.adicionarProduto({
      refeicao_id: refeicaoId,
      produto_id: produtoId,
      per_capita: perCapita,
      tipo_medida: tipoMedida,
      per_capita_por_modalidade: perCapitaPorModalidade,
    }),
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
      tipoMedida?: 'gramas' | 'mililitros' | 'unidades';
      perCapitaPorModalidade?: Array<{ modalidade_id: number; per_capita: number }>;
    }) => refeicaoServiceExtended.editarProduto(id, {
      per_capita: perCapita,
      tipo_medida: tipoMedida,
      per_capita_por_modalidade: perCapitaPorModalidade,
    }),
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
    mutationFn: ({ id, refeicaoId }: { id: number; refeicaoId: number }) => refeicaoServiceExtended.removerProduto(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: REFEICAO_PRODUTOS_QUERY_KEY(variables.refeicaoId) });
      queryClient.invalidateQueries({ queryKey: ['valores-nutricionais', variables.refeicaoId] });
      queryClient.invalidateQueries({ queryKey: ['custo-refeicao', variables.refeicaoId] });
    },
  });
};
