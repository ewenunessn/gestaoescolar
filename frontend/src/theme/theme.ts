import { createTheme, Theme } from '@mui/material/styles';

const baseTheme = {
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 13, // Reduzido de 14 (padrão) para 13
    h1: {
      fontSize: '2rem', // Reduzido
    },
    h2: {
      fontSize: '1.75rem', // Reduzido
    },
    h3: {
      fontSize: '1.5rem', // Reduzido
    },
    h4: {
      fontSize: '1.25rem', // Reduzido
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.1rem', // Reduzido
    },
    h6: {
      fontSize: '1rem', // Reduzido
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem', // Reduzido
    },
    body2: {
      fontSize: '0.8125rem', // Reduzido
    },
    button: {
      fontSize: '0.8125rem', // Reduzido
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          textTransform: 'none' as const,
          borderRadius: '8px',
          fontWeight: 500,
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'success' && {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.success.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.success.dark,
            },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'error' && {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.error.contrastText,
            '&:hover': {
              backgroundColor: theme.palette.error.dark,
            },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            '&:hover': {
              borderColor: theme.palette.primary.main,
              backgroundColor: theme.palette.action.hover,
            },
          }),
          ...(ownerState.variant === 'text' && {
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              color: theme.palette.text.primary,
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: '12px',
          boxShadow: 'none',
          border: theme.palette.mode === 'light' 
            ? '1px solid #e2e8f0' 
            : '1px solid #374151',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          boxShadow: 'none',
          border: theme.palette.mode === 'light' 
            ? '1px solid #e2e8f0' 
            : '1px solid #374151',
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          ...(ownerState.color === 'primary' && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }),
          ...(ownerState.color === 'success' && {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.success.contrastText,
          }),
          ...(ownerState.color === 'error' && {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.error.contrastText,
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
          }),
        }),
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-root': {
            borderBottom: theme.palette.mode === 'light' 
              ? '1px solid #e2e8f0' 
              : '1px solid #374151',
          },
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: ({ theme }) => ({
          '& .MuiTableCell-root': {
            borderBottom: theme.palette.mode === 'light' 
              ? '2px solid #cbd5e1' 
              : '2px solid #4b5563',
            fontWeight: 600,
            backgroundColor: theme.palette.mode === 'light' 
              ? '#f8fafc' 
              : '#1f2937',
          },
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': {
            backgroundColor: theme.palette.mode === 'light' 
              ? 'rgba(37, 99, 235, 0.04)' 
              : 'rgba(229, 231, 235, 0.08)',
          },
          '&:nth-of-type(even)': {
            backgroundColor: theme.palette.mode === 'light' 
              ? '#f9fafb' 
              : '#1a1a1a',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRight: theme.palette.mode === 'light' 
            ? '1px solid #f1f5f9' 
            : '1px solid #2d3748',
          '&:last-child': {
            borderRight: 'none',
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #e2e8f0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          boxShadow: 'none',
          borderRight: '1px solid #e2e8f0',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&:active': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiSpeedDial: {
      styleOverrides: {
        fab: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
          '&:before': {
            display: 'none',
          },
        },
      },
    },
  },
};

export const lightTheme: Theme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
    },
    secondary: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#b91c1c',
    },
    background: {
      default: '#DCDADF',
      paper: '#F2F1F4',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
    action: {
      hover: 'rgba(37, 99, 235, 0.04)',
      selected: 'rgba(37, 99, 235, 0.08)',
    },
  },
  shadows: [
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
  ],
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxShadow: 'none !important',
        },
        '*:before': {
          boxShadow: 'none !important',
        },
        '*:after': {
          boxShadow: 'none !important',
        },
      },
    },
  },
});

export const darkTheme: Theme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#e5e7eb',
      light: '#f3f4f6',
      dark: '#d1d5db',
    },
    secondary: {
      main: '#f87171',
      light: '#fca5a5',
      dark: '#ef4444',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    background: {
      default: '#191919',
      paper: '#252525',
    },
    text: {
      primary: '#D0D0D2',
      secondary: '#969696',
    },
    divider: '#374151',
    action: {
      hover: 'rgba(229, 231, 235, 0.08)',
      selected: 'rgba(229, 231, 235, 0.12)',
      disabled: 'rgba(156, 163, 175, 0.3)',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  shadows: [
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
    'none',
  ],
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxShadow: 'none !important',
        },
        '*:before': {
          boxShadow: 'none !important',
        },
        '*:after': {
          boxShadow: 'none !important',
        },
      },
    },
  },
});

// Função utilitária para obter o logo baseado no tema
export const getLogo = (isDark: boolean) => {
  return isDark ? '/logo_dark.png' : '/logo.png';
};

// Tema padrão (mantido para compatibilidade)
const theme = lightTheme;
export default theme;