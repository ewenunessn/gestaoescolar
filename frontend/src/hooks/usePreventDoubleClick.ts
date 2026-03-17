import { useState, useCallback, useRef } from 'react';

/**
 * Hook para prevenir duplo clique em ações assíncronas
 * Garante que apenas uma requisição seja enviada por vez
 */
export function usePreventDoubleClick<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  delay: number = 1000
): [T, boolean] {
  const [isLoading, setIsLoading] = useState(false);
  const lastCallRef = useRef<number>(0);

  const wrappedFunction = useCallback(
    async (...args: Parameters<T>) => {
      const now = Date.now();
      
      // Se já está executando, ignora
      if (isLoading) {
        console.warn('⚠️ Requisição já em andamento, ignorando clique duplicado');
        return;
      }
      
      // Se foi chamado muito recentemente, ignora (debounce)
      if (now - lastCallRef.current < delay) {
        console.warn('⚠️ Clique muito rápido, ignorando (debounce)');
        return;
      }
      
      lastCallRef.current = now;
      setIsLoading(true);
      
      try {
        const result = await asyncFunction(...args);
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction, delay, isLoading]
  ) as T;

  return [wrappedFunction, isLoading];
}
