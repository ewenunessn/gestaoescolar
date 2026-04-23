import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';

interface SafeButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void | Promise<void>;
  loadingText?: string;
  debounceMs?: number;
}

/**
 * Botao com protecao contra duplo clique
 * Desabilita automaticamente durante execucao e aplica debounce
 */
export const SafeButton: React.FC<SafeButtonProps> = ({
  onClick,
  children,
  loadingText,
  debounceMs = 500,
  disabled,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const lastClickRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = useCallback(async () => {
    const now = Date.now();

    if (now - lastClickRef.current < debounceMs) {
      console.warn('Clique muito rapido, ignorando');
      return;
    }

    if (isLoadingRef.current) {
      console.warn('Acao ja em andamento, ignorando');
      return;
    }

    lastClickRef.current = now;
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      await onClick();
    } catch (error) {
      console.error('Erro ao executar acao:', error);
    } finally {
      isLoadingRef.current = false;

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [onClick, debounceMs]);

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || isLoading}
      startIcon={isLoading ? <CircularProgress size={16} /> : props.startIcon}
    >
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
};
