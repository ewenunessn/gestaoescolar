import { createTheme, Theme } from '@mui/material/styles';

// Estendendo a interface do tema para incluir a cor do sidebar
declare module '@mui/material/styles' {
  interface TypeBackground {
    sidebar: string;
  }

  interface Palette {
    sidebarSelection: string;
    tableHover: string;
  }

  interface PaletteOptions {
    sidebarSelection?: string;
    tableHover?: string;
  }
}

const baseTheme = {
  typography: {
    fontFamily: [
      'Roboto',
      '"Google Sans"',
      '"Product Sans"',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    fontSize: 13,
    h1: {
      fontSize: '2rem',
    },
    h2: {
      fontSize: '1.75rem',
    },
    h3: {
      fontSize: '1.5rem',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.1rem',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem',
    },
    body2: {
      fontSize: '0.8125rem',
    },
    button: {
      fontSize: '0.8125rem',
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
        root: () => ({
          borderRadius: '12px',
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: () => ({
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
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
            backgroundColor: '#1be18eff',
            color: '#ffffff',
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
        root: () => ({
          '& .MuiTableCell-root': {
            borderBottom: '1px solid #e2e8f0',
          },
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: () => ({
          '& .MuiTableCell-root': {
            borderBottom: '1px solid #cbd5e1',
            fontWeight: 600,
            textAlign: 'center',
            backgroundColor: '#f8fafc',
          },
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme }) => ({
          '&:hover': {
            backgroundColor: `${theme.palette.tableHover} !important`,
          },
          '&.MuiTableRow-hover:hover': {
            backgroundColor: `${theme.palette.tableHover} !important`,
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: () => ({
          borderRight: '1px solid #f1f5f9',
          '&:last-child': {
            borderRight: 'none',
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: () => ({
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        }),
        root: {
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: () => ({
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: () => ({
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: () => ({
          boxShadow: 'none',
          borderBottom: '1px solid #e2e8f0',
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          boxShadow: 'none',
          borderRight: '1px solid #e2e8f0',
          backgroundColor: `${theme.palette.background.sidebar} !important`,
        }),
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
        root: () => ({
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
          '&:before': {
            display: 'none',
          },
        }),
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
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b',
      light: '#94a3b8',
      dark: '#475569',
      contrastText: '#ffffff',
    },
    background: {
      default: '#EFEFEF',
      paper: '#ffffff',
      sidebar: '#ffffff',
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
    action: {
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      contrastText: '#ffffff',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
      contrastText: '#ffffff',
    },
    sidebarSelection: '#ef4444',
    tableHover: '#fff7f0ff',
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
      styleOverrides: (theme) => ({
        '*': {
          boxShadow: 'none !important',
        },
        '*:before': {
          boxShadow: 'none !important',
        },
        '*:after': {
          boxShadow: 'none !important',
        },
        // Estilos específicos para sidebar
        '.MuiDrawer-paper': {
          backgroundColor: `${theme.palette.background.sidebar} !important`,
        },
        '[data-testid="sidebar"], .sidebar, .menu-lateral': {
          backgroundColor: `${theme.palette.background.sidebar} !important`,
        },
        // Estilos específicos para hover das tabelas
        '.MuiTableRow-root:hover': {
          backgroundColor: `${theme.palette.tableHover} !important`,
        },
        '.MuiTable-root .MuiTableRow-root:hover': {
          backgroundColor: `${theme.palette.tableHover} !important`,
        },
        // Estilos padronizados para cards de filtro
        '.filter-card': {
          borderRadius: '12px !important',
          padding: '16px !important',
          marginBottom: '24px !important',
          boxShadow: 'none !important',
        },
        '.filter-search': {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px !important',
          },
        },
        '.filter-content': {
          backgroundColor: theme.palette.background.paper,
          borderRadius: '12px !important',
          padding: '16px !important',
        },
      }),
    },
  },
});

// Função utilitária para obter o logo
export const getLogo = () => {
  return '/logo.png';
};

// Tema único claro
const theme = lightTheme;
export default theme;