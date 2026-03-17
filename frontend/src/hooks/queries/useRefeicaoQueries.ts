import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listarRefeicoes, 
  criarRefeicao, 
  editarRefeicao, 
  deletarRefeicao,
  Refeicao 
} from '../../services/refeicoes';

// Query key
export const REFEICOES_QUERY_KEY = ['refeicoes'];

// Hook para listar refeições
export const useRefeicoes = () => {
  return useQuery({
    queryKey: REFEICOES_QUERY_KEY,
    queryFn: listarRefeicoes,
  });
};

// Hook para criar refeição
export const useCriarRefeicao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<Refeicao, 'id'>) => criarRefeicao(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};

// Hook para editar refeição
export const useEditarRefeicao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Refeicao> }) => 
      editarRefeicao(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};

// Hook para deletar refeição
export const useDeletarRefeicao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => deletarRefeicao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFEICOES_QUERY_KEY });
    },
  });
};
