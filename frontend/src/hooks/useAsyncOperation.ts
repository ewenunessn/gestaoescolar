/**
 * useAsyncOperation Hook
 * 
 * Eliminates ~400-500 lines of duplicated loading/error state management
 * across components that use the pattern: setLoading(true) -> try/catch -> finally setLoading(false)
 * 
 * Usage:
 * ```typescript
 * const { loading, error, execute } = useAsyncOperation(async () => {
 *   const result = await apiCall();
 *   return result;
 * });
 * 
 * const handleSave = async () => {
 *   const result = await execute();
 *   toast.success('Saved!');
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import { useToast } from './useToast';

interface UseAsyncOperationOptions {
  /** Show error toast automatically (default: true) */
  showError?: boolean;
  /** Custom error message override */
  errorMessage?: string;
}

interface AsyncOperationState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: UseAsyncOperationOptions = {}
) {
  const { showError = true, errorMessage } = options;
  const toast = useToast();
  const [state, setState] = useState<AsyncOperationState<T>>({
    loading: false,
    error: null,
    data: null,
  });

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await operation();
      setState(prev => ({ ...prev, loading: false, error: null, data: result }));
      return result;
    } catch (err: any) {
      const errorMsg = errorMessage || err?.message || 'Erro ao processar operação';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));

      if (showError) {
        toast.error(errorMsg);
      }

      return null;
    }
  }, [operation, showError, errorMessage, toast]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    data: state.data,
    execute,
    reset,
  };
}

/**
 * useLoadingStates Hook
 * 
 * Manages multiple loading states for complex forms/pages.
 * Already exists but is not being used. This provides the same functionality
 * with a cleaner API.
 * 
 * Usage:
 * ```typescript
 * const { loading, withLoading } = useLoadingStates();
 * 
 * const loadData = async () => {
 *   await withLoading('fetchData', async () => {
 *     const data = await apiCall();
 *     return data;
 *   });
 * };
 * 
 * // Check specific loading state: loading.fetchData
 * ```
 */

export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const withLoading = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));

    try {
      return await operation();
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    }
  }, []);

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  const resetLoading = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
    } else {
      setLoadingStates({});
    }
  }, []);

  return {
    loading: loadingStates,
    isLoading: (key: string) => loadingStates[key] || false,
    withLoading,
    setLoading,
    resetLoading,
  };
}
