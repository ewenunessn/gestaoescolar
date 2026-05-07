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
  bg: '#e6e8eb',
  canvas: '#ffffff',
  canvasAlt: '#f1f3f5',
  sidebar: '#fbfcfd',
  text: '#20242a',
  muted: '#58606b',
  subtle: '#737b86',
  border: '#d4d9df',
  borderStrong: '#b9c1ca',
  primary: '#16c785',
  primaryHover: '#0fa870',
  primaryContrast: '#ffffff',
  success: '#10b981',
  warning: '#b18400',
  danger: '#dc3f3f',
  info: '#2563eb',
};

const darkTokens: ThemeTokens = {
  bg: '#000000',
  canvas: '#141414',
  canvasAlt: '#232323',
  sidebar: '#000000',
  text: '#f7f7f8',
  muted: '#a4a6ad',
  subtle: '#6f727b',
  border: '#343434',
  borderStrong: '#3a3a3a',
  primary: '#2fe4cf',
  primaryHover: '#20c7b6',
  primaryContrast: '#03110f',
  success: '#35d7a9',
  warning: '#f2a23a',
  danger: '#ff6a57',
  info: '#20aee6',
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
        backgroundColor: mode === 'light' ? t.canvas : '#232323',
        boxShadow: mode === 'light' ? '0 16px 34px rgba(32, 36, 42, 0.07)' : 'none',
      },
      '.data-table-toolbar': {
        borderBottom: `1px solid ${t.border}`,
        backgroundColor: mode === 'light' ? t.canvas : '#232323',
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
        backgroundColor: mode === 'light' ? t.canvasAlt : '#1d1d1d',
        color: mode === 'light' ? '#47515d' : t.muted,
        borderBottom: `1px solid ${t.border}`,
        borderRight: `1px solid ${t.border}`,
      },
      '.data-table-body-cell': {
        borderBottom: `1px solid ${t.border}`,
        color: t.text,
        backgroundColor: mode === 'light' ? 'transparent' : '#232323',
      },
      '.data-table-selection-chip': {
        backgroundColor: alpha(t.primary, 0.12),
        color: t.primary,
        borderColor: alpha(t.primary, 0.2),
      },
      '.data-table-search .MuiOutlinedInput-root': {
        backgroundColor: mode === 'light' ? t.canvasAlt : '#1d1d1d',
      },
      '.data-table-action': {
        borderRadius: '8px',
        border: `1px solid ${t.borderStrong}`,
        backgroundColor: mode === 'light' ? '#f7f9fb' : alpha(t.text, 0.03),
      },
      '.data-table-action:hover': {
        backgroundColor: alpha(t.text, mode === 'light' ? 0.08 : 0.08),
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
        color: mode === 'light' ? '#ffffff' : '#08140e',
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
        color: t.text,
      },
    },
    variants: [
      {
        props: { variant: 'contained', color: 'add' },
        style: {
          backgroundColor: t.success,
          color: mode === 'light' ? '#ffffff' : '#08140e',
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
        border: `1px solid ${mode === 'light' ? t.borderStrong : t.border}`,
        backgroundColor: t.canvas,
        boxShadow: mode === 'light' ? '0 12px 30px rgba(32, 36, 42, 0.06)' : 'none',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: t.sidebar,
        borderRight: 0,
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
        backgroundColor: mode === 'light' ? '#f8fafc' : '#232323',
        color: t.text,
        '& fieldset': {
          borderColor: mode === 'light' ? t.borderStrong : '#343434',
        },
        '&:hover fieldset': {
          borderColor: mode === 'light' ? '#96a1ad' : '#4a4a4a',
        },
        '&.Mui-focused fieldset': {
          borderColor: mode === 'light' ? t.primary : '#5a5a5a',
          borderWidth: 1,
        },
        '&.Mui-disabled': {
          backgroundColor: mode === 'light' ? alpha(t.canvasAlt, 0.72) : '#1b1b1b',
          color: t.subtle,
        },
        '&.Mui-disabled fieldset': {
          borderColor: mode === 'light' ? t.border : '#2b2b2b',
        },
      },
      input: {
        color: t.text,
        '&::placeholder': {
          color: mode === 'light' ? t.subtle : '#9a9a9a',
          opacity: 1,
        },
      },
      multiline: {
        padding: '10px 12px',
        alignItems: 'flex-start',
        '& textarea': {
          color: t.text,
          '&::placeholder': {
            color: mode === 'light' ? t.subtle : '#9a9a9a',
            opacity: 1,
          },
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
        border: `1px solid ${mode === 'light' ? t.borderStrong : t.border}`,
        backgroundColor: mode === 'light' ? t.canvas : '#232323',
        backgroundImage: 'none',
      },
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'light' ? t.canvas : '#232323',
        color: t.text,
      },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'light' ? t.canvas : '#232323',
        color: t.text,
        borderColor: t.border,
      },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        backgroundColor: mode === 'light' ? t.canvas : '#232323',
        borderColor: t.border,
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${mode === 'light' ? '#d9dee5' : t.border}`,
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
        light: mode === 'light' ? '#7bea52' : '#65f2e3',
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
        hover: alpha(t.text, mode === 'light' ? 0.08 : 0.08),
        selected: alpha(t.primary, 0.14),
      },
      sidebarSelection: mode === 'light' ? '#d8f5e7' : alpha(t.primary, 0.22),
      tableHover: mode === 'light' ? '#eef3f6' : alpha(t.text, 0.05),
      add: {
        main: t.success,
        contrastText: mode === 'light' ? '#ffffff' : '#08140e',
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
      h1: { fontFamily: desktopDisplay, fontSize: '2rem', fontWeight: 700, letterSpacing: 0 },
      h2: { fontFamily: desktopDisplay, fontSize: '1.6rem', fontWeight: 700, letterSpacing: 0 },
      h3: { fontFamily: desktopDisplay, fontSize: '1.25rem', fontWeight: 700, letterSpacing: 0 },
      h4: { fontFamily: desktopDisplay, fontSize: '1.05rem', fontWeight: 700, letterSpacing: 0 },
      body1: { fontSize: '0.9rem' },
      body2: { fontSize: '0.82rem' },
      button: { fontFamily: desktopSans, fontSize: '0.82rem', letterSpacing: 0 },
    },
    shape: {
      borderRadius: 10,
    },
    components: createComponents(mode, t),
  });
};

export const getLogo = () => '/logo.png';

const theme = createAppTheme('light');
export default theme;
