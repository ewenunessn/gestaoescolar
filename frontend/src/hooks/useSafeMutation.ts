import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useRef } from 'react';

/**
 * Wrapper do useMutation que previne requisições duplicadas
 * Ignora chamadas enquanto uma requisição está em andamento
 */
export function useSafeMutation<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const isExecutingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  
  const mutation = useMutation({
    ...options,
    mutationFn: async (variables: TVariables) => {
      const now = Date.now();
      
      // Prevenir duplo clique (menos de 500ms entre cliques)
      if (now - lastCallTimeRef.current < 500) {
        console.warn('⚠️ Clique duplicado detectado, ignorando');
        throw new Error('DUPLICATE_CLICK');
      }
      
      // Prevenir requisições simultâneas
      if (isExecutingRef.current) {
        console.warn('⚠️ Requisição já em andamento, ignorando');
        throw new Error('REQUEST_IN_PROGRESS');
      }
      
      lastCallTimeRef.current = now;
      isExecutingRef.current = true;
      
      try {
        if (!options.mutationFn) {
          throw new Error('mutationFn is required');
        }
        const result = await options.mutationFn(variables);
        return result;
      } finally {
        isExecutingRef.current = false;
      }
    },
  });

  return mutation;
}
