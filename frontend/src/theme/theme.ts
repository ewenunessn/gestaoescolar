import { alpha, createTheme, PaletteColor, PaletteColorOptions, ThemeOptions } from '@mui/material/styles';

export type AppThemeMode = 'light' | 'dark';

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

type ThemeTokens = {
  bg: string;
  canvas: string;
  canvasAlt: string;
  sidebar: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryHover: string;
  primaryContrast: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
};

const lightTokens: ThemeTokens = {
  bg: '#f3f0e8',
  canvas: '#fbf8f2',
  canvasAlt: '#f5efe4',
  sidebar: '#ece4d5',
  text: '#1f2430',
  muted: '#5f6777',
  subtle: '#8b92a0',
  border: 'rgba(40, 48, 68, 0.10)',
  borderStrong: 'rgba(40, 48, 68, 0.18)',
  primary: '#235c52',
  primaryHover: '#1b4a42',
  primaryContrast: '#f7f4ee',
  success: '#2f7d57',
  warning: '#b87828',
  danger: '#bf4d43',
  info: '#3b6a87',
};

const darkTokens: ThemeTokens = {
  bg: '#171b24',
  canvas: '#202532',
  canvasAlt: '#262c39',
  sidebar: '#141923',
  text: '#eef2f7',
  muted: '#a1abba',
  subtle: '#738095',
  border: 'rgba(226, 232, 240, 0.08)',
  borderStrong: 'rgba(226, 232, 240, 0.16)',
  primary: '#7db8ad',
  primaryHover: '#96c7be',
  primaryContrast: '#13201d',
  success: '#63bb8a',
  warning: '#d8a55f',
  danger: '#e07f76',
  info: '#84b5d3',
};

const getTokens = (mode: AppThemeMode): ThemeTokens => (
  mode === 'light' ? lightTokens : darkTokens
);

const createComponents = (mode: AppThemeMode, t: ThemeTokens): ThemeOptions['components'] => ({
  MuiCssBaseline: {
    styleOverrides: {
      ':root': {
        colorScheme: mode,
      },
      body: {
        backgroundColor: t.bg,
        color: t.text,
      },
      '#root': {
        minHeight: '100vh',
      },
      '*::-webkit-scrollbar': {
        width: '8px',
        height: '8px',
      },
      '*::-webkit-scrollbar-thumb': {
        backgroundColor: t.borderStrong,
        borderRadius: '999px',
      },
      '*::-webkit-scrollbar-track': {
        backgroundColor: 'transparent',
      },
      '.data-table-paper': {
        border: `1px solid ${t.border}`,
        borderRadius: '10px',
        backgroundColor: t.canvas,
      },
      '.data-table-toolbar': {
        borderBottom: `1px solid ${t.border}`,
        backgroundColor: t.canvas,
      },
      '.data-table-title-bar': {
        width: 4,
        height: 18,
        borderRadius: '999px',
        backgroundColor: t.primary,
      },
      '.data-table-title': {
        color: t.text,
      },
      '.data-table-count': {
        color: t.subtle,
      },
      '.data-table-header-cell': {
        backgroundColor: t.canvasAlt,
        color: t.muted,
        borderBottom: `1px solid ${t.border}`,
        borderRight: `1px solid ${t.border}`,
      },
      '.data-table-body-cell': {
        borderBottom: `1px solid ${t.border}`,
        color: t.text,
      },
      '.data-table-selection-chip': {
        backgroundColor: alpha(t.primary, 0.12),
        color: t.primary,
        borderColor: alpha(t.primary, 0.2),
      },
      '.data-table-search .MuiOutlinedInput-root': {
        backgroundColor: t.canvasAlt,
      },
      '.data-table-action': {
        borderRadius: '8px',
        border: `1px solid ${t.border}`,
        backgroundColor: alpha(t.text, mode === 'light' ? 0.02 : 0.03),
      },
      '.data-table-action:hover': {
        backgroundColor: alpha(t.text, mode === 'light' ? 0.05 : 0.08),
        borderColor: t.borderStrong,
      },
      '.data-table-action-view': {
        color: t.primary,
      },
      '.data-table-action-edit': {
        color: t.info,
      },
      '.data-table-action-delete': {
        color: t.danger,
      },
      '.data-table-btn-create': {
        backgroundColor: t.primary,
        color: t.primaryContrast,
      },
      '.data-table-btn-create:hover': {
        backgroundColor: t.primaryHover,
      },
    },
  },
  MuiButton: {
    defaultProps: {
      size: 'small',
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none',
        fontWeight: 600,
        minHeight: 36,
      },
      containedPrimary: {
        backgroundColor: t.primary,
        color: t.primaryContrast,
      },
      outlined: {
        borderColor: t.borderStrong,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        const baseTint = alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.03 : 0.05);
        const resolveColor = () => {
          switch (ownerState.color) {
            case 'primary':
            case 'add':
              return theme.palette.primary.main;
            case 'success':
              return theme.palette.success.main;
            case 'warning':
              return theme.palette.warning.main;
            case 'error':
            case 'delete':
              return theme.palette.error.main;
            case 'info':
            case 'edit':
              return theme.palette.info.main;
            default:
              return theme.palette.text.secondary;
          }
        };

        const tone = resolveColor();

        return {
          borderRadius: 8,
          border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.08 : 0.12)}`,
          backgroundColor: baseTint,
          color: tone,
          '&:hover': {
            backgroundColor: alpha(tone, 0.14),
            borderColor: alpha(tone, 0.24),
          },
        };
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        border: `1px solid ${t.border}`,
        boxShadow: 'none',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: t.sidebar,
        borderRight: `1px solid ${t.border}`,
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      size: 'small',
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        backgroundColor: t.canvasAlt,
        '& fieldset': {
          borderColor: t.borderStrong,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 999,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: t.canvasAlt,
        color: t.text,
        border: `1px solid ${t.borderStrong}`,
        borderRadius: 10,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 12,
        border: `1px solid ${t.border}`,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${t.border}`,
      },
    },
  },
});

export const createAppTheme = (mode: AppThemeMode) => {
  const t = getTokens(mode);

  return createTheme({
    palette: {
      mode,
      primary: {
        main: t.primary,
        light: t.primaryHover,
        dark: t.primaryHover,
        contrastText: t.primaryContrast,
      },
      secondary: {
        main: t.info,
      },
      success: {
        main: t.success,
      },
      warning: {
        main: t.warning,
      },
      error: {
        main: t.danger,
      },
      info: {
        main: t.info,
      },
      background: {
        default: t.bg,
        paper: t.canvas,
        sidebar: t.sidebar,
      },
      text: {
        primary: t.text,
        secondary: t.muted,
      },
      divider: t.border,
      action: {
        hover: alpha(t.text, mode === 'light' ? 0.05 : 0.08),
        selected: alpha(t.primary, 0.14),
      },
      sidebarSelection: alpha(t.primary, mode === 'light' ? 0.16 : 0.22),
      tableHover: alpha(t.text, mode === 'light' ? 0.03 : 0.05),
      add: {
        main: t.primary,
        contrastText: t.primaryContrast,
      },
      edit: {
        main: t.info,
        contrastText: mode === 'light' ? '#ffffff' : '#10222d',
      },
      delete: {
        main: t.danger,
        contrastText: '#ffffff',
      },
    },
    typography: {
      fontFamily: [
        '"Segoe UI"',
        '"Inter"',
        '-apple-system',
        'BlinkMacSystemFont',
        'sans-serif',
      ].join(','),
      h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' },
      h4: { fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' },
      body1: { fontSize: '0.9rem' },
      body2: { fontSize: '0.82rem' },
      button: { fontSize: '0.82rem' },
    },
    shape: {
      borderRadius: 10,
    },
    components: createComponents(mode, t),
  });
};

export const getLogo = () => '/logo.png';

const theme = createAppTheme('dark');
export default theme;
