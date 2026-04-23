/**
 * Generic CRUD Service Factory
 * 
 * Eliminates ~700 lines of duplicated CRUD code across service files.
 * Every service that follows the listarX, buscarX, criarX, editarX, removerX pattern
 * should use this factory instead.
 * 
 * Usage:
 * ```typescript
 * export const produtoService = createCrudService<Produto, ProdutoCreate, ProdutoUpdate>('produtos');
 * 
 * // Custom operations beyond basic CRUD:
 * export const produtoService = {
 *   ...createCrudService<Produto, ProdutoCreate, ProdutoUpdate>('produtos'),
 *   customOperation: async (id: number) => { ... }
 * };
 * ```
 */

import { apiWithRetry } from './api';

/**
 * Extracts data from API response, handling both standard and legacy formats.
 * Eliminates 82+ occurrences of `data.data || data` / `data.data || []` patterns.
 */
function extractResponseData<T>(response: unknown, fallback?: T): T {
  const data = response as Record<string, unknown> | undefined;

  if (!data || typeof data !== 'object') {
    return (data ?? fallback) as T;
  }

  // New format: { success: true, data: ... }
  if (data.success === true && data.data !== undefined) {
    return data.data as T;
  }

  // Legacy format: just return data.data or fallback
  if (data.data !== undefined) {
    return data.data as T;
  }

  return (data as unknown as T) ?? (fallback as T);
}

export interface CrudService<T, TCreate = Partial<T>, TUpdate = Partial<T>> {
  listar: () => Promise<T[]>;
  buscarPorId: (id: number) => Promise<T | null>;
  criar: (data: TCreate) => Promise<T>;
  atualizar: (id: number, data: TUpdate) => Promise<T>;
  remover: (id: number) => Promise<void>;
}

/**
 * Creates a standard CRUD service for a given entity.
 * 
 * @param endpoint - The API endpoint (e.g., 'produtos', 'escolas')
 * @returns Object with listar, buscarPorId, criar, atualizar, remover methods
 * 
 * @example
 * // Basic usage
 * export const produtoService = createCrudService<Produto, ProdutoCreate, ProdutoUpdate>('produtos');
 * 
 * @example
 * // With custom operations
 * export const escolaService = {
 *   ...createCrudService<Escola, EscolaCreate, EscolaUpdate>('escolas'),
 *   buscarPorCodigoInep: async (codigoInep: string) => {
 *     const { data } = await apiWithRetry.get(`/escolas/codigo-inep/${codigoInep}`);
 *     return extractResponseData<Escola>(data, null);
 *   }
 * };
 */
export function createCrudService<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  endpoint: string
): CrudService<T, TCreate, TUpdate> {
  const ensureLeadingSlash = (ep: string) => (ep.startsWith('/') ? ep : `/${ep}`);
  const baseEndpoint = ensureLeadingSlash(endpoint);

  return {
    listar: async (): Promise<T[]> => {
      const { data } = await apiWithRetry.get(baseEndpoint);
      return extractResponseData<T[]>(data, []);
    },

    buscarPorId: async (id: number): Promise<T | null> => {
      const { data } = await apiWithRetry.get(`${baseEndpoint}/${id}`);
      return extractResponseData<T | null>(data, null);
    },

    criar: async (input: TCreate): Promise<T> => {
      const { data } = await apiWithRetry.post(baseEndpoint, input);
      return extractResponseData<T>(data);
    },

    atualizar: async (id: number, input: TUpdate): Promise<T> => {
      const { data } = await apiWithRetry.put(`${baseEndpoint}/${id}`, input);
      return extractResponseData<T>(data);
    },

    remover: async (id: number): Promise<void> => {
      await apiWithRetry.delete(`${baseEndpoint}/${id}`);
    },
  };
}

// Export the helper for custom services that need it
export { extractResponseData };
