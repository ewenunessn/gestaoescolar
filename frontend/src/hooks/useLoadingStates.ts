import { useState, useCallback } from 'react';

export interface LoadingStates {
  [key: string]: boolean;
}

export const useLoadingStates = (initialStates: LoadingStates = {}) => {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>(initialStates);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  const resetLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  // Wrapper para executar operações assíncronas com loading automático
  const withLoading = useCallback(async <T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true);
    try {
      return await operation();
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    resetLoading,
    withLoading,
  };
};