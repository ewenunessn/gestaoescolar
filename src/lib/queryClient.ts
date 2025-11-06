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

// Função para obter tenant ID atual do localStorage
const getCurrentTenantId = () => {
  return localStorage.getItem('currentTenantId') || 'no-tenant';
};

// Configurações específicas por tipo de dados com isolamento por tenant
export const queryKeys = {
  // Estoque
  estoque: {
    all: (tenantId?: string) => ['estoque', tenantId || getCurrentTenantId()] as const,
    escolar: (tenantId?: string) => [...queryKeys.estoque.all(tenantId), 'escolar'] as const,
    escola: (escolaId: number, tenantId?: string) => [...queryKeys.estoque.escolar(tenantId), escolaId] as const,
    produto: (produtoId: number, tenantId?: string) => [...queryKeys.estoque.all(tenantId), 'produto', produtoId] as const,
    matriz: (produtoIds?: number[], tenantId?: string) => [...queryKeys.estoque.escolar(tenantId), 'matriz', produtoIds] as const,
    historico: (filters?: any, tenantId?: string) => [...queryKeys.estoque.all(tenantId), 'historico', filters] as const,
    validade: (filters?: any, tenantId?: string) => [...queryKeys.estoque.all(tenantId), 'validade', filters] as const,
  },
  
  // Produtos
  produtos: {
    all: (tenantId?: string) => ['produtos', tenantId || getCurrentTenantId()] as const,
    lists: (tenantId?: string) => [...queryKeys.produtos.all(tenantId), 'list'] as const,
    list: (filters?: any, tenantId?: string) => [...queryKeys.produtos.lists(tenantId), filters] as const,
    details: (tenantId?: string) => [...queryKeys.produtos.all(tenantId), 'detail'] as const,
    detail: (id: number, tenantId?: string) => [...queryKeys.produtos.details(tenantId), id] as const,
    categorias: (tenantId?: string) => [...queryKeys.produtos.all(tenantId), 'categorias'] as const,
  },
  
  // Escolas
  escolas: {
    all: (tenantId?: string) => ['escolas', tenantId || getCurrentTenantId()] as const,
    lists: (tenantId?: string) => [...queryKeys.escolas.all(tenantId), 'list'] as const,
    list: (filters?: any, tenantId?: string) => [...queryKeys.escolas.lists(tenantId), filters] as const,
    details: (tenantId?: string) => [...queryKeys.escolas.all(tenantId), 'detail'] as const,
    detail: (id: number, tenantId?: string) => [...queryKeys.escolas.details(tenantId), id] as const,
  },
  
  // Modalidades
  modalidades: {
    all: (tenantId?: string) => ['modalidades', tenantId || getCurrentTenantId()] as const,
    lists: (tenantId?: string) => [...queryKeys.modalidades.all(tenantId), 'list'] as const,
    list: (filters?: any, tenantId?: string) => [...queryKeys.modalidades.lists(tenantId), filters] as const,
    details: (tenantId?: string) => [...queryKeys.modalidades.all(tenantId), 'detail'] as const,
    detail: (id: number, tenantId?: string) => [...queryKeys.modalidades.details(tenantId), id] as const,
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
    all: (tenantId?: string) => ['fornecedores', tenantId || getCurrentTenantId()] as const,
    lists: (tenantId?: string) => [...queryKeys.fornecedores.all(tenantId), 'list'] as const,
    list: (filters?: any, tenantId?: string) => [...queryKeys.fornecedores.lists(tenantId), filters] as const,
    details: (tenantId?: string) => [...queryKeys.fornecedores.all(tenantId), 'detail'] as const,
    detail: (id: number, tenantId?: string) => [...queryKeys.fornecedores.details(tenantId), id] as const,
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
    staleTime: 30 * 1000, // 30 segundos (reduzido)
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true, // Atualiza ao focar na janela
  },
  
  // Dados que mudam frequentemente - cache curto
  dynamic: {
    staleTime: 15 * 1000, // 15 segundos (reduzido)
    gcTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: true, // Atualiza ao focar na janela
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
  estoque: (tenantId?: string) => queryClient.invalidateQueries({ queryKey: queryKeys.estoque.all(tenantId) }),
  
  // Invalidar estoque de uma escola específica
  estoqueEscola: (escolaId: number, tenantId?: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.estoque.escola(escolaId, tenantId) }),
  
  // Invalidar produto específico
  produto: (produtoId: number, tenantId?: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.estoque.produto(produtoId, tenantId) }),
  
  // Invalidar matriz de estoque
  matriz: (tenantId?: string) => 
    queryClient.invalidateQueries({ queryKey: queryKeys.estoque.matriz(undefined, tenantId) }),
  
  // Invalidar todos os produtos
  produtos: (tenantId?: string) => queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all(tenantId) }),
  
  // Invalidar todas as escolas
  escolas: (tenantId?: string) => queryClient.invalidateQueries({ queryKey: queryKeys.escolas.all(tenantId) }),
  
  // Invalidar todas as modalidades
  modalidades: (tenantId?: string) => queryClient.invalidateQueries({ queryKey: queryKeys.modalidades.all(tenantId) }),
  
  // Invalidar todos os fornecedores
  fornecedores: (tenantId?: string) => queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.all(tenantId) }),
  
  // Invalidar usuário atual
  currentUser: () => queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.current() }),
  
  // Invalidar estatísticas
  estatisticas: () => queryClient.invalidateQueries({ queryKey: queryKeys.estatisticas.all }),
  
  // Invalidar todos os dados de um tenant específico
  allTenantData: (tenantId?: string) => {
    const currentTenant = tenantId || getCurrentTenantId();
    queryClient.invalidateQueries({ queryKey: ['estoque', currentTenant] });
    queryClient.invalidateQueries({ queryKey: ['produtos', currentTenant] });
    queryClient.invalidateQueries({ queryKey: ['escolas', currentTenant] });
    queryClient.invalidateQueries({ queryKey: ['modalidades', currentTenant] });
    queryClient.invalidateQueries({ queryKey: ['fornecedores', currentTenant] });
  },
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