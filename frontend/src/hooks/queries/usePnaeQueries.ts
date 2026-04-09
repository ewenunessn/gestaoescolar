// React Query hooks para PNAE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardPNAE,
  getRelatorioAgriculturaFamiliar,
  getRelatorioPerCapita,
  listarRelatorios,
  salvarRelatorio,
  getValoresPerCapita,
  criarValorPerCapita,
  atualizarValorPerCapita,
} from '../../services/pnae';

// Dashboard
export const useDashboardPNAE = () => {
  // Só executar se houver token válido
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const hasValidToken = token && token !== 'null' && token !== 'undefined' && token.length > 10;
  
  return useQuery({
    queryKey: ['pnae', 'dashboard'],
    queryFn: getDashboardPNAE,
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: hasValidToken, // Só executar se tiver token válido
  });
};

// Relatório Agricultura Familiar
export const useRelatorioAgriculturaFamiliar = (params?: {
  ano?: number;
  mes_inicio?: number;
  mes_fim?: number;
}) => {
  return useQuery({
    queryKey: ['pnae', 'relatorio-af', params],
    queryFn: () => getRelatorioAgriculturaFamiliar(params),
    enabled: !!params?.ano, // Só executa se tiver ano
  });
};

// Relatório Per Capita
export const useRelatorioPerCapita = (params?: { ano?: number }) => {
  return useQuery({
    queryKey: ['pnae', 'relatorio-per-capita', params],
    queryFn: () => getRelatorioPerCapita(params),
  });
};

// Listar Relatórios Salvos
export const useRelatoriosSalvos = (params?: {
  tipo_relatorio?: string;
  ano?: number;
  mes?: number;
}) => {
  return useQuery({
    queryKey: ['pnae', 'relatorios-salvos', params],
    queryFn: () => listarRelatorios(params),
  });
};

// Salvar Relatório
export const useSalvarRelatorio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: salvarRelatorio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pnae', 'relatorios-salvos'] });
    },
  });
};

// Valores Per Capita
export const useValoresPerCapita = (params?: { ano?: number }) => {
  return useQuery({
    queryKey: ['pnae', 'valores-per-capita', params],
    queryFn: () => getValoresPerCapita(params),
  });
};

// Criar Valor Per Capita
export const useCriarValorPerCapita = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: criarValorPerCapita,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pnae', 'valores-per-capita'] });
    },
  });
};

// Atualizar Valor Per Capita
export const useAtualizarValorPerCapita = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      atualizarValorPerCapita(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pnae', 'valores-per-capita'] });
    },
  });
};
