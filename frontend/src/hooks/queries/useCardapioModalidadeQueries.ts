import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  listarCardapiosModalidade,
  criarCardapioModalidade,
  editarCardapioModalidade,
  removerCardapioModalidade,
  CardapioModalidade
} from '../../services/cardapiosModalidade';

// Query key
export const CARDAPIOS_MODALIDADE_QUERY_KEY = ['cardapios-modalidade'];

// Hook para listar cardápios
export const useCardapiosModalidade = () => {
  return useQuery({
    queryKey: CARDAPIOS_MODALIDADE_QUERY_KEY,
    queryFn: () => listarCardapiosModalidade(),
  });
};

// Hook para criar cardápio
export const useCriarCardapioModalidade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => criarCardapioModalidade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDAPIOS_MODALIDADE_QUERY_KEY });
    },
  });
};

// Hook para editar cardápio
export const useEditarCardapioModalidade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      editarCardapioModalidade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDAPIOS_MODALIDADE_QUERY_KEY });
    },
  });
};

// Hook para remover cardápio
export const useRemoverCardapioModalidade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => removerCardapioModalidade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CARDAPIOS_MODALIDADE_QUERY_KEY });
    },
  });
};
