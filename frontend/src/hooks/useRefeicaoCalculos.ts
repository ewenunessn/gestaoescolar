import { useQuery } from '@tanstack/react-query';
import { calcularValoresNutricionais, calcularCusto } from '../services/refeicaoCalculos';

export function useValoresNutricionais(
  refeicaoId: number, 
  rendimentoPorcoes: number | null, 
  enabled: boolean = true,
  modalidadeId: number | null = null
) {
  return useQuery({
    queryKey: ['valores-nutricionais', refeicaoId, rendimentoPorcoes, modalidadeId],
    queryFn: () => calcularValoresNutricionais(refeicaoId, rendimentoPorcoes || 1, modalidadeId),
    enabled: enabled && !!rendimentoPorcoes && rendimentoPorcoes > 0,
    staleTime: 30000, // 30 segundos
    retry: false,
  });
}

export function useCustoRefeicao(
  refeicaoId: number, 
  rendimentoPorcoes: number | null, 
  enabled: boolean = true,
  modalidadeId: number | null = null
) {
  return useQuery({
    queryKey: ['custo-refeicao', refeicaoId, rendimentoPorcoes, modalidadeId],
    queryFn: () => calcularCusto(refeicaoId, rendimentoPorcoes || 1, modalidadeId),
    enabled: enabled && !!rendimentoPorcoes && rendimentoPorcoes > 0,
    staleTime: 30000, // 30 segundos
    retry: false,
  });
}
