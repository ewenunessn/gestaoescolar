import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button, ButtonProps } from '@mui/material';
import { LoadingOverlay } from './LoadingOverlay';

interface SafeButtonWithOverlayProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void | Promise<void>;
  loadingMessage?: string;
  showOverlay?: boolean;
  debounceMs?: number;
}

/**
 * Botao com protecao contra duplo clique + overlay de loading
 * Combina o melhor dos dois mundos:
 * - Desabilita o botao
 * - Mostra overlay bloqueando toda a interface
 */
export const SafeButtonWithOverlay: React.FC<SafeButtonWithOverlayProps> = ({
  onClick,
  children,
  loadingMessage = 'Processando...',
  showOverlay = true,
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
    <>
      <Button
        {...props}
        onClick={handleClick}
        disabled={disabled || isLoading}
      >
        {children}
      </Button>

      {showOverlay && (
        <LoadingOverlay open={isLoading} message={loadingMessage} />
      )}
    </>
  );
};
