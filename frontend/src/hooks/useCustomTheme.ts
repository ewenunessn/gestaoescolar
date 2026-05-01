import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useThemePreference } from '../contexts/ThemeContext';

export const useCustomTheme = () => {
  const muiTheme = useMuiTheme();
  const { mode, toggleTheme, setTheme } = useThemePreference();

  return {
    theme: muiTheme,
    mode,
    toggleTheme,
    setTheme,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
};
