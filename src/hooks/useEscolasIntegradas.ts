import { useMemo } from 'react';
import { useEscolas } from '../contexts/EscolasContext';

/**
 * Hook personalizado que fornece dados integrados de escolas
 */
export function useEscolasIntegradas() {
  const { escolas, loading: escolasLoading, error: escolasError } = useEscolas();

  // Retornar escolas sem modificações
  const escolasIntegradas = useMemo(() => {
    return escolas;
  }, [escolas]);

  // Estatísticas básicas
  const estatisticas = useMemo(() => {
    const escolasAtivas = escolasIntegradas.filter(e => e.ativo);

    return {
      total_escolas: escolas.length,
      escolas_ativas: escolasAtivas.length,
      escolas_inativas: escolas.length - escolasAtivas.length
    };
  }, [escolasIntegradas, escolas]);

  // Escolas agrupadas por status
  const escolasPorStatus = useMemo(() => {
    return {
      ativas: escolasIntegradas.filter(e => e.ativo),
      inativas: escolasIntegradas.filter(e => !e.ativo)
    };
  }, [escolasIntegradas]);

  // Função para buscar escola por ID
  const buscarEscolaPorId = (id: number) => {
    return escolasIntegradas.find(escola => escola.id === id);
  };

  // Função para filtrar escolas por critérios
  const filtrarEscolas = (filtros: {
    ativo?: boolean;
    termo?: string;
  }) => {
    return escolasIntegradas.filter(escola => {
      if (filtros.ativo !== undefined && escola.ativo !== filtros.ativo) {
        return false;
      }
      
      if (filtros.termo) {
        const termo = filtros.termo.toLowerCase();
        return escola.nome.toLowerCase().includes(termo) ||
               (escola.endereco && escola.endereco.toLowerCase().includes(termo));
      }
      
      return true;
    });
  };

  return {
    // Dados
    escolas: escolasIntegradas,
    escolasPorStatus,
    estatisticas,
    
    // Estados
    loading: escolasLoading,
    error: escolasError,
    
    // Funções utilitárias
    buscarEscolaPorId,
    filtrarEscolas
  };
}