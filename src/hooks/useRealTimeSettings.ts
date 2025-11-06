import { useState, useEffect } from 'react';

interface RealTimeSettings {
  enabled: boolean;
  refreshInterval: number;
  showNotifications: boolean;
  autoRefresh: boolean;
}

const DEFAULT_SETTINGS: RealTimeSettings = {
  enabled: true,
  refreshInterval: 30000, // 30 segundos
  showNotifications: true,
  autoRefresh: false,
};

const STORAGE_KEY = 'realtime_settings';

export function useRealTimeSettings() {
  const [settings, setSettings] = useState<RealTimeSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de tempo real:', error);
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Erro ao salvar configurações de tempo real:', error);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<RealTimeSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}