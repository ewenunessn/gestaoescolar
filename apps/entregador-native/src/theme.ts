import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1976d2',
    secondary: '#4caf50',
    error: '#f44336',
    background: '#f5f5f5',
    surface: '#ffffff',
    // Suavizar o ripple effect
    onSurfaceVariant: 'rgba(0, 0, 0, 0.05)',
  },
  // Configurações de animação
  animation: {
    ...DefaultTheme.animation,
    scale: 1.0,
  },
  // Desabilitar ou suavizar o ripple
  rippleEffectEnabled: false,
};
