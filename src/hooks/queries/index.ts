/**
 * Índice de todos os hooks do React Query
 * Facilita importação e organização
 */

// Hooks de Estoque
export * from './useEstoqueQueries';

// Hooks de Produtos
export * from './useProdutoQueries';

// Hooks de Escolas
export * from './useEscolaQueries';

// Hooks de Demandas
export * from './useDemandaQueries';

// Hooks de Configurações
export * from './useConfigQueries';

// Hooks de Fornecedores
export * from './useFornecedorQueries';

// Re-export do cliente e utilitários
export { queryClient, queryKeys, invalidateQueries, prefetchQueries } from '../../lib/queryClient';