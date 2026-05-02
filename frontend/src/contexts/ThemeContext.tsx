import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { AppThemeMode } from '../theme/theme';

type ThemeContextType = {
  mode: AppThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: AppThemeMode) => void;
};

const STORAGE_KEY = 'app-theme-mode';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialTheme = (): AppThemeMode => {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
};

export const CustomThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    window.desktopShell?.setTitleBarTheme?.(mode);
  }, [mode]);

  const setTheme = (nextMode: AppThemeMode) => {
    setModeState(nextMode);
    localStorage.setItem(STORAGE_KEY, nextMode);
  };

  const value = useMemo<ThemeContextType>(() => ({
    mode,
    toggleTheme: () => setTheme(mode === 'dark' ? 'light' : 'dark'),
    setTheme,
  }), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemePreference = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemePreference must be used within a CustomThemeProvider');
  }
  return context;
};
