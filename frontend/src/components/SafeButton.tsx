import React, { useState, useCallback } from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';

interface SafeButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void | Promise<void>;
  loadingText?: string;
  debounceMs?: number;
}

/**
 * Botão com proteção contra duplo clique
 * Desabilita automaticamente durante execução e aplica debounce
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
  const [lastClick, setLastClick] = useState(0);

  const handleClick = useCallback(async () => {
    const now = Date.now();
    
    // Debounce: ignora cliques muito rápidos
    if (now - lastClick < debounceMs) {
      console.warn('⚠️ Clique muito rápido, ignorando');
      return;
    }
    
    // Previne cliques enquanto está executando
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
