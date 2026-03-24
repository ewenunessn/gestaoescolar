import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { listarUnidadesMedida, buscarUnidadeMedida, UnidadeMedida } from '../../services/unidadesMedida';

/**
 * Hook para listar todas as unidades de medida
 */
export function useUnidadesMedida(tipo?: string): UseQueryResult<UnidadeMedida[], Error> {
  return useQuery({
    queryKey: ['unidades-medida', tipo],
    queryFn: () => listarUnidadesMedida(tipo),
    staleTime: 1000 * 60 * 60, // 1 hora (dados raramente mudam)
  });
}

/**
 * Hook para buscar uma unidade específica
 */
export function useUnidadeMedida(identificador: string | number): UseQueryResult<UnidadeMedida, Error> {
  return useQuery({
    queryKey: ['unidade-medida', identificador],
    queryFn: () => buscarUnidadeMedida(identificador),
    enabled: !!identificador,
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}

/**
 * Hook para listar unidades de massa
 */
export function useUnidadesMassa(): UseQueryResult<UnidadeMedida[], Error> {
  return useUnidadesMedida('massa');
}

/**
 * Hook para listar unidades de volume
 */
export function useUnidadesVolume(): UseQueryResult<UnidadeMedida[], Error> {
  return useUnidadesMedida('volume');
}

/**
 * Hook para listar unidades de contagem
 */
export function useUnidadesUnidade(): UseQueryResult<UnidadeMedida[], Error> {
  return useUnidadesMedida('unidade');
}
