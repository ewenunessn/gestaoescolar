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
  bg: '#0f1012',
  canvas: '#17181c',
  canvasAlt: '#1f2126',
  sidebar: '#090a0c',
  text: '#f3f4f6',
  muted: '#a3a7b0',
  subtle: '#767b86',
  border: 'rgba(255, 255, 255, 0.07)',
  borderStrong: 'rgba(255, 255, 255, 0.12)',
  primary: '#58a6ff',
  primaryHover: '#7bb8ff',
  primaryContrast: '#07111f',
  success: '#47c97e',
  warning: '#d1a24e',
  danger: '#ff7373',
  info: '#7fb6ff',
};

const getTokens = (mode: AppThemeMode): ThemeTokens => (
  mode === 'light' ? lightTokens : darkTokens
);

export const desktopSans = [
  '"Segoe UI Variable Text"',
  '"Segoe UI Variable Static Text"',
  '"Segoe UI"',
  '"Inter"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Helvetica Neue"',
  'sans-serif',
].join(',');

export const desktopDisplay = [
  '"Segoe UI Variable Display"',
  '"Segoe UI Variable Text"',
  '"Segoe UI"',
  '"Inter"',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Helvetica Neue"',
  'sans-serif',
].join(',');

export const desktopMono = [
  '"Cascadia Mono"',
  '"Cascadia Code"',
  '"Consolas"',
  '"SFMono-Regular"',
  '"Roboto Mono"',
  'monospace',
].join(',');

const createComponents = (mode: AppThemeMode, t: ThemeTokens): ThemeOptions['components'] => ({
  MuiCssBaseline: {
    styleOverrides: {
      ':root': {
        colorScheme: mode,
      },
      body: {
        backgroundColor: t.bg,
        color: t.text,
        fontFamily: desktopSans,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
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
        border: `1px solid ${t.borderStrong}`,
        backgroundColor: alpha(t.text, mode === 'light' ? 0.02 : 0.03),
      },
      '.data-table-action:hover': {
        backgroundColor: alpha(t.text, mode === 'light' ? 0.05 : 0.08),
        borderColor: t.borderStrong,
      },
      '.data-table-action-view': {
        color: t.primary,
      },
      '.data-table-action-add': {
        color: t.success,
      },
      '.data-table-action-edit': {
        color: t.info,
      },
      '.data-table-action-delete': {
        color: t.danger,
      },
      '.data-table-btn-create': {
        backgroundColor: t.success,
        color: mode === 'light' ? '#f7fbf8' : '#08140e',
      },
      '.data-table-btn-create:hover': {
        backgroundColor: alpha(t.success, mode === 'light' ? 0.9 : 0.82),
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
    variants: [
      {
        props: { variant: 'contained', color: 'add' },
        style: {
          backgroundColor: t.success,
          color: mode === 'light' ? '#f7fbf8' : '#08140e',
          '&:hover': {
            backgroundColor: alpha(t.success, mode === 'light' ? 0.9 : 0.82),
          },
        },
      },
      {
        props: { variant: 'contained', color: 'edit' },
        style: {
          backgroundColor: t.info,
          color: '#08131f',
          '&:hover': {
            backgroundColor: alpha(t.info, mode === 'light' ? 0.9 : 0.82),
          },
        },
      },
      {
        props: { variant: 'contained', color: 'delete' },
        style: {
          backgroundColor: t.danger,
          color: '#fff7f7',
          '&:hover': {
            backgroundColor: alpha(t.danger, mode === 'light' ? 0.9 : 0.82),
          },
        },
      },
      {
        props: { variant: 'outlined', color: 'add' },
        style: {
          color: t.success,
          borderColor: alpha(t.success, 0.34),
          '&:hover': {
            borderColor: alpha(t.success, 0.5),
            backgroundColor: alpha(t.success, 0.08),
          },
        },
      },
      {
        props: { variant: 'outlined', color: 'edit' },
        style: {
          color: t.info,
          borderColor: alpha(t.info, 0.34),
          '&:hover': {
            borderColor: alpha(t.info, 0.5),
            backgroundColor: alpha(t.info, 0.08),
          },
        },
      },
      {
        props: { variant: 'outlined', color: 'delete' },
        style: {
          color: t.danger,
          borderColor: alpha(t.danger, 0.34),
          '&:hover': {
            borderColor: alpha(t.danger, 0.5),
            backgroundColor: alpha(t.danger, 0.08),
          },
        },
      },
      {
        props: { variant: 'text', color: 'add' },
        style: {
          color: t.success,
          '&:hover': {
            backgroundColor: alpha(t.success, 0.08),
          },
        },
      },
      {
        props: { variant: 'text', color: 'edit' },
        style: {
          color: t.info,
          '&:hover': {
            backgroundColor: alpha(t.info, 0.08),
          },
        },
      },
      {
        props: { variant: 'text', color: 'delete' },
        style: {
          color: t.danger,
          '&:hover': {
            backgroundColor: alpha(t.danger, 0.08),
          },
        },
      },
    ],
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ ownerState, theme }) => {
        const baseTint = alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.03 : 0.05);
        const resolveColor = () => {
          switch (ownerState.color) {
            case 'add':
              return theme.palette.add.main;
            case 'primary':
              return theme.palette.primary.main;
            case 'success':
              return theme.palette.success.main;
            case 'warning':
              return theme.palette.warning.main;
            case 'delete':
              return theme.palette.delete.main;
            case 'error':
              return theme.palette.error.main;
            case 'edit':
              return theme.palette.edit.main;
            case 'info':
              return theme.palette.info.main;
            default:
              return theme.palette.text.secondary;
          }
        };

        const tone = resolveColor();

        return {
          borderRadius: 8,
          border: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.12 : 0.16)}`,
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
        borderRadius: 8,
        border: `1px solid ${t.border}`,
        backgroundColor: t.canvas,
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
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: 34,
        borderRadius: 8,
      },
      indicator: {
        display: 'none',
      },
      flexContainer: {
        gap: 4,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: 30,
        padding: '6px 12px',
        borderRadius: 6,
        textTransform: 'none',
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: t.muted,
        transition: 'background-color 0.15s ease, color 0.15s ease',
        '&:hover': {
          backgroundColor: alpha(t.text, mode === 'light' ? 0.06 : 0.08),
          color: t.text,
        },
        '&.Mui-selected': {
          backgroundColor: alpha(t.text, mode === 'light' ? 0.08 : 0.1),
          color: t.text,
        },
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
        main: t.success,
        contrastText: mode === 'light' ? '#f7fbf8' : '#08140e',
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
      fontFamily: desktopSans,
      h1: { fontFamily: desktopDisplay, fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontFamily: desktopDisplay, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontFamily: desktopDisplay, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' },
      h4: { fontFamily: desktopDisplay, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em' },
      body1: { fontSize: '0.9rem' },
      body2: { fontSize: '0.82rem' },
      button: { fontFamily: desktopSans, fontSize: '0.82rem', letterSpacing: '-0.01em' },
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
