import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Tema neutro apenas para login - sem herdar tema global
const loginTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#28d99a',
    },
    secondary: {
      main: '#6b7280',
    },
    background: {
      default: '#eeeeee',
      paper: '#ffffff',
    },
    text: {
      primary: '#2f3135',
      secondary: '#747981',
    },
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
        },
      },
    },
  },
});

interface AuthPageShellProps {
  children: React.ReactNode;
}

export default function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <ThemeProvider theme={loginTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
