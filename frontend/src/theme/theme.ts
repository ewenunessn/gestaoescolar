import { createTheme, Theme } from '@mui/material/styles';

// ──────────────────────────────────────────────────────────────
// DESIGN TOKENS — GitHub Dark Mode
//
// Background:    #0d1117  (page canvas)
// Canvas inset:  #161b22  (panels, cards, sidebar)
// Borders:       #21262d  →  #30363d
// Text primary:  #e6edf3
// Text muted:    #8b949e
// Subtle:        #6e7681
// Green accent:  #238636 / #2ea043
// Blue:          #58a6ff
// ──────────────────────────────────────────────────────────────

const GH = {
  bg:       '#0d1117',
  canvas:   '#161b22',
  canvasSub:'#0d1117',
  border:   '#21262d',
  borderMd: '#30363d',
  text:     '#e6edf3',
  muted:    '#8b949e',
  sub:      '#6e7681',
  green:    '#238636',
  greenLt:  '#2ea043',
  greenDim: 'rgba(35,134,54,0.15)',
  blue:     '#58a6ff',
  blueDim:  'rgba(56,139,253,0.15)',
  red:      '#f85149',
  redDim:   'rgba(248,81,73,0.15)',
  orange:   '#d29922',
  orangeDim:'rgba(210,153,34,0.15)',
  purple:   '#bc8cff',
  yellow:   '#e3b341',
};

const NAVY   = GH.bg;
const GREEN  = GH.greenLt;

// Compat aliases para refs antigas de SLATE → dark mapping
const SLATE: Record<number, string> = {
  50:  GH.canvas,
  100: '#1c2129',
  200: GH.border,
  300: GH.borderMd,
  400: GH.sub,
  500: GH.muted,
  600: '#6e7681',
  700: '#535c66',
  800: GH.text,
  900: '#ffffff',
};

// Estendendo a interface do tema
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
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Helvetica',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
    ].join(','),
    fontSize: 14,
    h1:   { fontSize: '2rem', fontWeight: 600 },
    h2:   { fontSize: '1.5rem', fontWeight: 600 },
    h3:   { fontSize: '1.25rem', fontWeight: 600 },
    h4:   { fontSize: '1rem', fontWeight: 600 },
    h5:   { fontSize: '0.875rem', fontWeight: 600 },
    h6:   { fontSize: '0.8125rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    button: { fontSize: '0.8125rem' },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small',
        disableElevation: true,
      },
      styleOverrides: {
        root: ({ theme, ownerState }: { theme: any; ownerState: any }) => ({
          textTransform: 'none',
          borderRadius: '6px',
          fontWeight: 500,
          fontSize: '0.8125rem',
          lineHeight: 1.4,
          paddingTop: '4px',
          paddingBottom: '4px',
          paddingLeft: '12px',
          paddingRight: '12px',
          minHeight: '32px',
          ...(ownerState.size === 'medium' && {
            paddingTop: '5px',
            paddingBottom: '5px',
            paddingLeft: '14px',
            paddingRight: '14px',
            minHeight: '36px',
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'primary' && {
            backgroundColor: theme.palette.primary.main,
            color: '#fff',
            '&:hover': { backgroundColor: '#26a641' },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'success' && {
            backgroundColor: GH.green,
            color: '#fff',
            '&:hover': { backgroundColor: GH.greenLt },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'error' && {
            backgroundColor: theme.palette.error.main,
            color: '#fff',
            '&:hover': { backgroundColor: theme.palette.error.dark },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: GH.borderMd,
            color: GH.text,
            '&:hover': {
              borderColor: GH.muted,
              backgroundColor: 'rgba(255,255,255,0.04)',
            },
          }),
          ...(ownerState.variant === 'text' && {
            color: GH.muted,
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: GH.text,
            },
          }),
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: () => ({
          borderRadius: '6px',
          boxShadow: 'none',
          border: `1px solid ${GH.border}`,
          backgroundColor: GH.canvas,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: () => ({
          backgroundImage: 'none',
          boxShadow: 'none',
          backgroundColor: GH.canvas,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }: { theme: any }) => ({
          color: theme.palette.text.secondary,
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.06)',
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
        root: ({ ownerState }: { ownerState: any }) => ({
          borderRadius: '16px',
          fontSize: '0.7rem',
          fontWeight: 500,
          height: '22px',
          ...(ownerState.color === 'default' && ownerState.variant !== 'outlined' && {
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: GH.muted,
          }),
          ...(ownerState.color === 'success' && {
            backgroundColor: GH.greenDim,
            color: GH.greenLt,
            '& .MuiChip-deleteIcon': { color: GH.green, opacity: 0.6 },
          }),
          ...(ownerState.color === 'warning' && {
            backgroundColor: GH.orangeDim,
            color: GH.orange,
            '& .MuiChip-deleteIcon': { color: GH.orange, opacity: 0.6 },
          }),
          ...(ownerState.color === 'error' && {
            backgroundColor: GH.redDim,
            color: GH.red,
            '& .MuiChip-deleteIcon': { color: GH.red, opacity: 0.6 },
          }),
          ...(ownerState.color === 'info' && {
            backgroundColor: GH.blueDim,
            color: GH.blue,
            '& .MuiChip-deleteIcon': { color: GH.blue, opacity: 0.6 },
          }),
          ...(ownerState.variant === 'outlined' && {
            borderColor: GH.borderMd,
            backgroundColor: 'transparent',
            color: GH.muted,
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
            backgroundColor: GH.bg,
            color: GH.text,
            '& fieldset': {
              borderColor: GH.borderMd,
            },
            '&:hover fieldset': {
              borderColor: GH.muted,
            },
            '&.Mui-focused fieldset': {
              borderColor: GH.blue,
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.8125rem',
            color: GH.muted,
            '&.Mui-focused': {
              color: GH.text,
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: GH.sub,
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
          backgroundColor: GH.bg,
          color: GH.text,
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
          height: '36px',
          color: GH.text,
        },
        input: {
          paddingTop: '5px !important',
          paddingBottom: '5px !important',
          fontSize: '0.8125rem',
          '&::placeholder': {
            color: GH.sub,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          color: GH.muted,
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
          paddingTop: '5px !important',
          paddingBottom: '5px !important',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
          '&.Mui-focused': {
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
        },
        paper: {
          backgroundColor: GH.canvas,
          border: `1px solid ${GH.borderMd}`,
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          color: GH.muted,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: () => ({
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          backgroundColor: GH.canvas,
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
            backgroundColor: GH.bg,
            color: GH.muted,
            fontWeight: 500,
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            paddingTop: '6px',
            paddingBottom: '6px',
            paddingLeft: '12px',
            paddingRight: '12px',
            borderBottom: `1px solid ${GH.border}`,
          },
        }),
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: () => ({
          '& .MuiTableRow-root': {
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.02)',
            },
            '&:last-child .MuiTableCell-root': {
              borderBottom: 0,
            },
          },
          '& .MuiTableCell-root': {
            paddingTop: '8px',
            paddingBottom: '8px',
            paddingLeft: '12px',
            paddingRight: '12px',
            fontSize: '0.8125rem',
            color: GH.text,
            borderBottom: `1px solid ${GH.border}`,
            backgroundColor: 'transparent',
            lineHeight: 1.5,
          },
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: () => ({
          transition: 'background-color 0.12s ease',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.02) !important',
          },
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: () => ({
          borderBottomWidth: '1px',
        }),
        sizeSmall: {
          padding: '8px 12px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: () => ({
          boxShadow: 'none',
          border: `1px solid ${GH.borderMd}`,
          backgroundColor: GH.canvas,
        }),
        root: {
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: () => ({
          color: GH.text,
        }),
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: () => ({
          color: GH.muted,
        }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: () => ({
          boxShadow: 'none',
          border: `1px solid ${GH.borderMd}`,
          backgroundColor: GH.canvas,
        }),
        list: {
          backgroundColor: GH.canvas,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: () => ({
          color: GH.text,
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: () => ({
          boxShadow: 'none',
          border: `1px solid ${GH.borderMd}`,
          backgroundColor: GH.canvas,
        }),
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: () => ({
          boxShadow: 'none',
          borderBottom: `1px solid ${GH.border}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }: { theme: any }) => ({
          boxShadow: 'none',
          borderRight: `1px solid ${GH.border}`,
          backgroundColor: `${theme.palette.background.sidebar} !important`,
        }),
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
        },
      },
    },
    MuiSpeedDial: {
      styleOverrides: {
        fab: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: () => ({
          boxShadow: 'none',
          border: `1px solid ${GH.border}`,
          '&:before': { display: 'none' },
          backgroundColor: GH.canvas,
        }),
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: () => ({
          backgroundColor: 'transparent',
          color: GH.text,
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
        flexContainer: { gap: 0 },
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
          textTransform: 'none',
          fontSize: '0.8125rem',
          fontWeight: 500,
          color: GH.muted,
          '&.Mui-selected': { fontWeight: 600, color: GH.text },
          '& .MuiTab-iconWrapper': {
            fontSize: '1rem',
            marginBottom: '0 !important',
            marginRight: 4,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1f2428',
          color: GH.text,
          fontSize: '0.75rem',
          borderRadius: '6px',
          padding: '5px 10px',
          border: `1px solid ${GH.borderMd}`,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: any }) => ({
          '& .MuiSwitch-thumb': {
            backgroundColor: '#767c82',
          },
          ...(ownerState.checked && {
            '& .MuiSwitch-thumb': {
              backgroundColor: GH.green,
            },
            '& .MuiSwitch-track': {
              opacity: 0.5,
            },
          }),
        }),
        track: {
          backgroundColor: GH.sub,
          opacity: 0.35,
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        toolbar: {
          minHeight: '44px',
          paddingLeft: 12,
          paddingRight: 12,
        },
        selectLabel: {
          fontSize: '0.6875rem',
          color: GH.muted,
        },
        displayedRows: {
          fontSize: '0.6875rem',
          color: GH.muted,
        },
        select: {
          fontSize: '0.6875rem',
          color: GH.text,
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.06)',
        },
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────
// DARK THEME — GitHub style
// ──────────────────────────────────────────────────────────────
export const darkTheme: Theme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: GH.green,
      light: GH.greenLt,
      dark: '#1a7e2b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: GH.blue,
      light: '#79c0ff',
      dark: '#388bfd',
      contrastText: '#0d1117',
    },
    background: {
      default: GH.bg,
      paper: GH.canvas,
      sidebar: '#0d1117',
    },
    text: {
      primary: GH.text,
      secondary: GH.muted,
    },
    divider: GH.border,
    action: {
      hover: 'rgba(255, 255, 255, 0.04)',
      selected: 'rgba(255, 255, 255, 0.06)',
    },
    success: {
      main: GH.greenLt,
      light: '#4ae168',
      dark: GH.green,
      contrastText: '#ffffff',
    },
    warning: {
      main: GH.orange,
      light: GH.yellow,
      dark: '#bb8009',
      contrastText: '#0d1117',
    },
    error: {
      main: GH.red,
      light: '#ff9492',
      dark: '#da3633',
      contrastText: '#ffffff',
    },
    info: {
      main: GH.blue,
      light: '#79c0ff',
      dark: '#388bfd',
      contrastText: '#0d1117',
    },
    sidebarSelection: GH.greenLt,
    tableHover: 'rgba(255,255,255,0.02)',
    add: {
      main: GH.greenLt,
      light: '#4ae168',
      dark: GH.green,
      contrastText: '#ffffff',
    },
    delete: {
      main: GH.red,
      light: '#ff9492',
      dark: '#da3633',
      contrastText: '#ffffff',
    },
    edit: {
      main: GH.blue,
      light: '#79c0ff',
      dark: '#388bfd',
      contrastText: '#0d1117',
    },
  },
  components: {
    ...baseTheme.components,
    MuiCssBaseline: {
      styleOverrides: () => ({
        '*': { boxShadow: 'none !important' },
        '*:before': { boxShadow: 'none !important' },
        '*:after': { boxShadow: 'none !important' },
        'body': {
          backgroundColor: GH.bg,
          color: GH.text,
          scrollbarColor: `${GH.borderMd} ${GH.bg}`,
          '&::-webkit-scrollbar': { width: '8px', height: '8px' },
          '&::-webkit-scrollbar-track': { backgroundColor: GH.bg },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: GH.borderMd,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: GH.sub,
          },
        },
        '.MuiDrawer-paper': {
          backgroundColor: `${GH.bg} !important`,
        },
        '[data-testid="sidebar"], .sidebar, .menu-lateral': {
          backgroundColor: `${GH.bg} !important`,
        },
        '.MuiTableRow-root:hover': {
          backgroundColor: `rgba(255,255,255,0.02) !important`,
        },
        '.MuiTable-root .MuiTableRow-root:hover': {
          backgroundColor: `rgba(255,255,255,0.02) !important`,
        },
        '::-webkit-input-placeholder': {
          color: GH.sub,
        },
      }),
    },
  },
});

// ──────────────────────────────────────────────────────────────
// EXPORT
// ──────────────────────────────────────────────────────────────
export const getLogo = () => '/logo.png';

const theme = darkTheme;
export default theme;
