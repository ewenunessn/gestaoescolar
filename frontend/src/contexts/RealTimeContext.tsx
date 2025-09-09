import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRealTimeSettings } from '../hooks/useRealTimeSettings';
import { useRealTimeNotifications } from '../hooks/useRealTimeNotifications';
import { RealTimeNotificationContainer } from '../components/RealTimeNotificationContainer';

interface RealTimeContextType {
  settings: ReturnType<typeof useRealTimeSettings>['settings'];
  updateSettings: ReturnType<typeof useRealTimeSettings>['updateSettings'];
  resetSettings: ReturnType<typeof useRealTimeSettings>['resetSettings'];
  addNotification: ReturnType<typeof useRealTimeNotifications>['addNotification'];
  removeNotification: ReturnType<typeof useRealTimeNotifications>['removeNotification'];
  clearAllNotifications: ReturnType<typeof useRealTimeNotifications>['clearAllNotifications'];
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

interface RealTimeProviderProps {
  children: ReactNode;
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({ children }) => {
  const { settings, updateSettings, resetSettings } = useRealTimeSettings();
  const { 
    notifications, 
    addNotification, 
    removeNotification, 
    clearAllNotifications 
  } = useRealTimeNotifications();

  // Limpar notificações quando as configurações mudarem
  useEffect(() => {
    if (!settings.showNotifications) {
      clearAllNotifications();
    }
  }, [settings.showNotifications, clearAllNotifications]);

  const contextValue: RealTimeContextType = {
    settings,
    updateSettings,
    resetSettings,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
      {settings.showNotifications && (
        <RealTimeNotificationContainer />
      )}
    </RealTimeContext.Provider>
  );
};

export const useRealTimeContext = (): RealTimeContextType => {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTimeContext must be used within a RealTimeProvider');
  }
  return context;
};

// Hook personalizado para adicionar notificações de tempo real
export const useRealTimeNotify = () => {
  const { addNotification, settings } = useRealTimeContext();

  const notifyDataUpdate = (message: string, onRefresh?: () => void) => {
    if (!settings.showNotifications) return;

    addNotification({
      message,
      type: 'info',
      autoHide: false,
      onAction: onRefresh,
      actionLabel: 'Atualizar',
    });
  };

  const notifySuccess = (message: string) => {
    addNotification({
      message,
      type: 'success',
      autoHide: true,
      duration: 3000,
    });
  };

  const notifyWarning = (message: string) => {
    addNotification({
      message,
      type: 'warning',
      autoHide: true,
      duration: 5000,
    });
  };

  const notifyError = (message: string) => {
    addNotification({
      message,
      type: 'error',
      autoHide: true,
      duration: 7000,
    });
  };

  return {
    notifyDataUpdate,
    notifySuccess,
    notifyWarning,
    notifyError,
  };
};