import { createTheme, Theme } from '@mui/material/styles';

// Estendendo a interface do tema para incluir a cor do sidebar
declare module '@mui/material/styles' {
  interface TypeBackground {
    sidebar: string;
  }

  interface Palette {
    sidebarSelection: string;
    tableHover: string;
    add: PaletteColor;
    delete: PaletteColor;
    edit: PaletteColor;
  }

  interface PaletteOptions {
    sidebarSelection?: string;
    tableHover?: string;
    add?: PaletteColorOptions;
    delete?: PaletteColorOptions;
    edit?: PaletteColorOptions;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    add: true;
    delete: true;
    edit: true;
  }
}
declare module '@mui/material/IconButton' {
  interface IconButtonPropsColorOverrides {
    add: true;
    delete: true;
    edit: true;
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
      defaultProps: {
        size: 'small',
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          textTransform: 'none' as const,
          borderRadius: '6px',
          fontWeight: 500,
          fontSize: '0.8125rem',
          lineHeight: 1.4,
          paddingTop: '4px',
          paddingBottom: '4px',
          paddingLeft: '12px',
          paddingRight: '12px',
          minHeight: '30px',
          ...(ownerState.size === 'medium' && {
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '14px',
            paddingRight: '14px',
            minHeight: '34px',
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            '&:hover': { backgroundColor: theme.palette.primary.dark },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'success' && {
            backgroundColor: theme.palette.success.main,
            color: theme.palette.success.contrastText,
            '&:hover': { backgroundColor: theme.palette.success.dark },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'error' && {
            backgroundColor: theme.palette.error.main,
            color: theme.palette.error.contrastText,
            '&:hover': { backgroundColor: theme.palette.error.dark },
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
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 500,
          height: '22px',
          ...(ownerState.color === 'default' && ownerState.variant !== 'outlined' && {
            backgroundColor: '#e9ecef',
            color: '#495057',
          }),
          ...(ownerState.color === 'primary' && {
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }),
          ...(ownerState.color === 'success' && {
            backgroundColor: '#d1fae5',
            color: '#065f46',
            '& .MuiChip-label': {
              color: '#065f46',
            },
          }),
          ...(ownerState.color === 'warning' && {
            backgroundColor: '#fef3c7',
            color: '#92400e',
          }),
          ...(ownerState.color === 'error' && {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
          }),
          ...(ownerState.color === 'info' && {
            backgroundColor: '#dbeafe',
            color: '#1e40af',
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: theme.palette.divider,
            color: theme.palette.text.primary,
            backgroundColor: 'transparent',
          }),
        }),
        label: {
          paddingLeft: '8px',
          paddingRight: '8px',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            fontSize: '0.8125rem',
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.8125rem',
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontSize: '0.8125rem',
        },
        select: {
          paddingTop: '5px',
          paddingBottom: '5px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          height: '45px',
        },
        input: {
          paddingTop: '5px !important',
          paddingBottom: '5px !important',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
        },
      },
    },
    MuiAutocomplete: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        inputRoot: {
          fontSize: '0.8125rem',
          borderRadius: '6px',
        },
        option: {
          fontSize: '0.8125rem',
          paddingTop: '4px !important',
          paddingBottom: '4px !important',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: () => ({
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          backgroundColor: '#ffffff',
          overflow: 'auto',
          '@media print': {
            maxHeight: 'none',
            overflow: 'visible',
            boxShadow: 'none',
          },
        }),
      },
    },
    MuiTable: {
      styleOverrides: {
        root: () => ({
          borderCollapse: 'separate',
          borderSpacing: 0,
          '& .MuiTableCell-root': {
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
          },
        }),
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: () => ({
          position: 'sticky',
          top: 0,
          zIndex: 10,
          '& .MuiTableCell-root': {
            backgroundColor: '#f5f5f5',
            color: '#495057',
            fontWeight: 600,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '10px',
            paddingRight: '10px',
            borderBottom: '1px solid #dee2e6',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          },
        }),
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: () => ({
          '& .MuiTableRow-root': {
            backgroundColor: '#ffffff',
            '&:hover': {
              backgroundColor: '#f8f9fa',
            },
            '&:last-child .MuiTableCell-root': {
              borderBottom: 0,
            },
          },
          '& .MuiTableCell-root': {
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '10px',
            paddingRight: '10px',
            fontSize: '0.8125rem',
            color: '#212529',
            borderBottom: '1px solid #f1f3f5',
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
          },
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: () => ({
          '&:hover': {
            backgroundColor: '#f8f9fa !important',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: () => ({
          borderLeft: 'none !important',
          borderRight: 'none !important',
          borderTop: 'none !important',
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
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 36,
          '& .MuiTabs-indicator': {
            height: 2,
            borderRadius: '2px 2px 0 0',
          },
        },
        flexContainer: {
          gap: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 36,
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 14,
          paddingRight: 14,
          textTransform: 'none' as const,
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: '#64748b',
          '&.Mui-selected': {
            fontWeight: 600,
          },
          '& .MuiTab-iconWrapper': {
            fontSize: '1rem',
            marginBottom: '0 !important',
            marginRight: 4,
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
      main: '#000000',
      light: '#333333',
      dark: '#000000',
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
      sidebar: '#1a1d29',
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
    sidebarSelection: '#38b6ff',
    tableHover: '#fff7f0ff',
    add: {
      main: '#38b6ff',
      light: '#6eceff',
      dark: '#1fa3f0',
      contrastText: '#ffffff',
    },
    delete: {
      main: '#e05252',
      light: '#e87878',
      dark: '#c93c3c',
      contrastText: '#ffffff',
    },
    edit: {
      main: '#e8834a',
      light: '#eda070',
      dark: '#d06a32',
      contrastText: '#ffffff',
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
