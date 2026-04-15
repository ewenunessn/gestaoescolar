import { useState, useCallback } from 'react';

export const useConfigChangeIndicator = () => {
  const [hasRecentChange, setHasRecentChange] = useState(false);

  const showChangeIndicator = useCallback(() => {
    setHasRecentChange(true);

    // Remover o indicador após 3 segundos
    setTimeout(() => {
      setHasRecentChange(false);
    }, 3000);
  }, []);

  const clearIndicator = useCallback(() => {
    setHasRecentChange(false);
  }, []);

  return {
    hasRecentChange,
    showChangeIndicator,
    clearIndicator
  };
};