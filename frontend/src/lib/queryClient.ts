/**
 * Configuração do React Query Client
 * Gerencia cache, sincronização e estado global de dados
 */

import { QueryClient } from '@tanstack/react-query';

// Configuração otimizada do Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000,
      // Manter dados em cache por 10 minutos após não serem usados
      gcTime: 10 * 60 * 1000,
      // Retry automático em caso de erro
      retry: (failureCount, error: any) => {
        // Não fazer retry para erros 4xx (cliente)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Máximo 3 tentativas para outros erros
        return failureCount < 3;
      },
      // Intervalo de retry exponencial
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch quando a janela ganha foco
      refetchOnWindowFocus: true,
      // Refetch quando reconecta à internet
      refetchOnReconnect: true,
      // Não refetch automaticamente quando monta
      refetchOnMount: true,
    },
    mutations: {
      // Retry para mutations apenas em erros de rede
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      // Timeout para mutations
      networkMode: 'online',
    },
  },
});

// Configurações específicas por tipo de dados
export const queryKeys = {
  // Estoque
  estoque: {
    all: ['estoque'] as const,
    escolar: () => [...queryKeys.estoque.all, 'escolar'] as const,
    escola: (escolaId: number) => [...queryKeys.estoque.escolar(), escolaId] as const,
    produto: (produtoId: number) => [...queryKeys.estoque.all, 'produto', produtoId] as const,
    matriz: (produtoIds?: number[]) => [...queryKeys.estoque.escolar(), 'matriz', produtoIds] as const,
    historico: (filters?: any) => [...queryKeys.estoque.all, 'historico', filters] as const,
    validade: (filters?: any) => [...queryKeys.estoque.all, 'validade', filters] as const,
  },
  
  // Produtos
  produtos: {
    all: ['produtos'] as const,
    lists: () => [...queryKeys.produtos.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.produtos.lists(), filters] as const,
    details: () => [...queryKeys.produtos.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.produtos.details(), id] as const,
    categorias: () => [...queryKeys.produtos.all, 'categorias'] as const,
  },
  
  // Escolas
  escolas: {
    all: ['escolas'] as const,
    lists: () => [...queryKeys.escolas.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.escolas.lists(), filters] as const,
    details: () => [...queryKeys.escolas.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.escolas.details(), id] as const,
  },
  
  // Usuários
  usuarios: {
    all: ['usuarios'] as const,
    lists: () => [...queryKeys.usuarios.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.usuarios.lists(), filters] as const,
    details: () => [...queryKeys.usuarios.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.usuarios.details(), id] as const,
    current: () => [...queryKeys.usuarios.all, 'current'] as const,
  },
  
  // Fornecedores
  fornecedores: {
    all: ['fornecedores'] as const,
    lists: () => [...queryKeys.fornecedores.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.fornecedores.lists(), filters] as const,
    details: () => [...queryKeys.fornecedores.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.fornecedores.details(), id] as const,
  },
  
  // Demandas
  demandas: {
    all: ['demandas'] as const,
    lists: () => [...queryKeys.demandas.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.demandas.lists(), filters] as const,
    details: () => [...queryKeys.demandas.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.demandas.details(), id] as const,
  },
  
  // Configurações
  configuracoes: {
    all: ['configuracoes'] as const,
    lists: () => [...queryKeys.configuracoes.all, 'list'] as const,
    list: (filters?: any) => [...queryKeys.configuracoes.lists(), filters] as const,
    detail: (chave: string) => [...queryKeys.configuracoes.all, 'detail', chave] as const,
  },
  
  // Relatórios
  relatorios: {
    all: ['relatorios'] as const,
    estoque: (params?: any) => [...queryKeys.relatorios.all, 'estoque', params] as const,
    validade: (params?: any) => [...queryKeys.relatorios.all, 'validade', params] as const,
    movimentacao: (params?: any) => [...queryKeys.relatorios.all, 'movimentacao', params] as const,
  },
  
  // Estatísticas
  estatisticas: {
    all: ['estatisticas'] as const,
    dashboard: () => [...queryKeys.estatisticas.all, 'dashboard'] as const,
    estoque: () => [...queryKeys.estatisticas.all, 'estoque'] as const,
    escola: (escolaId: number) => [...queryKeys.estatisticas.all, 'escola', escolaId] as const,
  },
} as const;

// Configurações de cache específicas
export const cacheConfig = {
  // Dados que mudam raramente - cache longo
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  },
  
  // Dados que mudam moderadamente - cache médio
  moderate: {
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  },
  
  // Dados que mudam frequentemente - cache curto
  dynamic: {
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 5 * 60 * 1000, // 5 minutos
  },
  
  // Dados em tempo real - sem cache
  realtime: {
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 30 * 1000, // 30 segundos
  },
};

// Utilitários para invalidação de cache
export const invalidateQueries = {
  // Invalidar todos os dados de estoque
  estoque: () => queryClient.invalidateQueries({ queryKey: queryKeys.estoque.all }),
  
  // Invalidar estoque de uma escola específica
  estoqueEscola: (escolaId: number) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.estoque.escola(escolaId) }),
  
  // Invalidar produto específico
  produto: (produtoId: number) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.estoque.produto(produtoId) }),
  
  // Invalidar matriz de estoque
  matriz: () => 
    queryClient.invalidateQueries({ queryKey: queryKeys.estoque.matriz() }),
  
  // Invalidar todos os produtos
  produtos: () => queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all }),
  
  // Invalidar todas as escolas
  escolas: () => queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all }),
  
  // Invalidar todos os fornecedores
  fornecedores: () => queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.all }),
  
  // Invalidar usuário atual
  currentUser: () => queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.current() }),
  
  // Invalidar estatísticas
  estatisticas: () => queryClient.invalidateQueries({ queryKey: queryKeys.estatisticas.all }),
};

// Prefetch de dados importantes
export const prefetchQueries = {
  // Prefetch dados essenciais do dashboard
  dashboard: async () => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.estoque.escolar(),
        staleTime: cacheConfig.moderate.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.estatisticas.dashboard(),
        staleTime: cacheConfig.moderate.staleTime,
      }),
    ]);
  },
  
  // Prefetch dados de uma escola
  escola: async (escolaId: number) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.estoque.escola(escolaId),
        staleTime: cacheConfig.moderate.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.estatisticas.escola(escolaId),
        staleTime: cacheConfig.moderate.staleTime,
      }),
    ]);
  },
};

export default queryClient;