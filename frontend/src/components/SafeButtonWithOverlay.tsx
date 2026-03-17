import React, { useState, useCallback } from 'react';
import { Button, ButtonProps } from '@mui/material';
import { LoadingOverlay } from './LoadingOverlay';

interface SafeButtonWithOverlayProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void | Promise<void>;
  loadingMessage?: string;
  showOverlay?: boolean;
  debounceMs?: number;
}

/**
 * Botão com proteção contra duplo clique + overlay de loading
 * Combina o melhor dos dois mundos:
 * - Desabilita o botão
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
  const [lastClick, setLastClick] = useState(0);

  const handleClick = useCallback(async () => {
    const now = Date.now();
    
    // Debounce
    if (now - lastClick < debounceMs) {
      console.warn('⚠️ Clique muito rápido, ignorando');
      return;
    }
    
    // Previne cliques durante execução
    if (isLoading) {
      console.warn('⚠️ Ação já em andamento, ignorando');
      return;
    }
    
    setLastClick(now);
    setIsLoading(true);
    
    try {
      await onClick();
    } catch (error) {
      console.error('Erro ao executar ação:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onClick, isLoading, lastClick, debounceMs]);

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
