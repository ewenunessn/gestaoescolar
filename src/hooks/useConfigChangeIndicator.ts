import { useState, useCallback } from 'react';

export const useConfigChangeIndicator = () => {
  const [hasRecentChange, setHasRecentChange] = useState(false);

  const showChangeIndicator = useCallback(() => {
    console.log('Mostrando indicador de mudança');
    setHasRecentChange(true);

    // Remover o indicador após 3 segundos
    setTimeout(() => {
      console.log('Removendo indicador de mudança');
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