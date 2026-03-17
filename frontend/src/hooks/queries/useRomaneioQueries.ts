import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guiaService } from '../../services/guiaService';
import { rotaService } from '../../modules/entregas/services/rotaService';

// Query keys
export const ROMANEIO_QUERY_KEY = (params: any) => ['romaneio', params];
export const ROTAS_QUERY_KEY = ['rotas'];

// Hook para listar romaneio
export const useRomaneio = (params: {
  data_inicio?: string;
  data_fim?: string;
  escola_id?: number;
  rota_id?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: ROMANEIO_QUERY_KEY(params),
    queryFn: () => guiaService.listarRomaneio(params),
    enabled: !!params.data_inicio && !!params.data_fim,
  });
};

// Hook para listar rotas
export const useRotas = () => {
  return useQuery({
    queryKey: ROTAS_QUERY_KEY,
    queryFn: () => rotaService.listarRotas(),
  });
};

// Hook para atualizar status de produto escola
export const useAtualizarProdutoEscola = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status: string } }) =>
      guiaService.atualizarProdutoEscola(id, data),
    onSuccess: () => {
      // Invalidar todas as queries de romaneio para recarregar
      queryClient.invalidateQueries({ queryKey: ['romaneio'] });
    },
  });
};
