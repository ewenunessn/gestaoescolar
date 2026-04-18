import { createTheme, Theme, PaletteColor, PaletteColorOptions } from '@mui/material/styles';

// ──────────────────────────────────────────────────────────────
// DESIGN TOKENS — Gowen Dark Mode
//
// Background:    #0d0d0d  (page canvas — almost pure black)
// Card surface:  #181818  (panels, cards, sidebar)
// Borders:       rgba(255,255,255,0.07)
// Text primary:  #f0f0f0
// Text muted:    #888 / #666
// Accent:        #00bfff  (cyan neon)
// Green:         #22c55e  (active/status)
// Red:           #ef4444  (danger)
// Amber:         #f59e0b  (warning/tokens)
// ──────────────────────────────────────────────────────────────

const GH = {
  bg:       '#0d0d0d',
  canvas:   '#181818',
  canvasSub:'#0d0d0d',
  border:   'rgba(255,255,255,0.07)',
  borderMd: 'rgba(255,255,255,0.10)',
  text:     '#f0f0f0',
  muted:    '#888',
  sub:      '#666',
  cyan:     '#00bfff',
  cyanDim:  'rgba(0,191,255,0.12)',
  green:    '#22c55e',
  greenLt:  '#22c55e',
  greenDim: 'rgba(34,197,94,0.12)',
  blue:     '#00bfff',
  blueDim:  'rgba(0,191,255,0.12)',
  red:      '#ef4444',
  redDim:   'rgba(239,68,68,0.12)',
  orange:   '#f59e0b',
  orangeDim:'rgba(245,158,11,0.12)',
  purple:   '#a855f7',
  yellow:   '#fbbf24',
};

const NAVY   = GH.bg;
const CYAN   = GH.cyan;

// Compat aliases para refs antigas de SLATE → dark mapping
const SLATE: Record<number, string> = {
  50:  GH.canvas,
  100: '#1a1a1a',
  200: 'rgba(255,255,255,0.07)',
  300: 'rgba(255,255,255,0.10)',
  400: GH.sub,
  500: GH.muted,
  600: '#666',
  700: '#555',
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
      '"Inter"',
      '"Geist"',
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
    h1:   { fontSize: '2rem', fontWeight: 700 },
    h2:   { fontSize: '1.5rem', fontWeight: 700 },
    h3:   { fontSize: '1.25rem', fontWeight: 700 },
    h4:   { fontSize: '1rem', fontWeight: 600 },
    h5:   { fontSize: '0.875rem', fontWeight: 600 },
    h6:   { fontSize: '0.8125rem', fontWeight: 600 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    button: { fontSize: '0.8125rem' },
  },
  shape: {
    borderRadius: 12,
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
          borderRadius: '8px',
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
            color: '#0d0d0d',
            '&:hover': { backgroundColor: '#33ccff' },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'success' && {
            backgroundColor: GH.green,
            color: '#fff',
            '&:hover': { backgroundColor: '#4ade80' },
          }),
          ...(ownerState.variant === 'contained' && ownerState.color === 'error' && {
            backgroundColor: theme.palette.error.main,
            color: '#fff',
            '&:hover': { backgroundColor: '#f87171' },
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
          borderRadius: '12px',
          boxShadow: 'none',
          border: `1px solid ${GH.border}`,
          backgroundColor: GH.canvas,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: any }) => {
          // DataGrid/Paper wrapper style — applied only to table papers (identified by inline border)
          // We avoid overriding all papers; use className for DataTable papers instead.
          return {
            backgroundImage: 'none',
            boxShadow: 'none',
            backgroundColor: GH.canvas,
          };
        },
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
            borderRadius: '8px',
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
          borderRadius: '8px',
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
      styleOverrides: {
        inputRoot: {
          fontSize: '0.8125rem',
          borderRadius: '8px',
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
        root: ({ theme }: { theme: Theme }) => ({
          borderRadius: 0,
          border: 'none',
          boxShadow: 'none',
          backgroundColor: theme.palette.background.paper,
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.10)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
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
          borderRadius: '8px',
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
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
        },
        li: {
          fontSize: '0.75rem',
        },
        separator: {
          color: GH.sub,
          fontSize: '0.75rem',
        },
      },
    },
  },
};

// ──────────────────────────────────────────────────────────────
// DARK THEME — Gowen style
// ──────────────────────────────────────────────────────────────
export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: GH.cyan,
      light: '#33ccff',
      dark: '#0099cc',
      contrastText: '#0d0d0d',
    },
    secondary: {
      main: GH.cyan,
      light: '#33ccff',
      dark: '#0099cc',
      contrastText: '#0d0d0d',
    },
    background: {
      default: GH.bg,
      paper: GH.canvas,
      sidebar: '#111111',
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
      main: GH.cyan,
      light: '#33ccff',
      dark: '#0099cc',
      contrastText: '#0d0d0d',
    },
    sidebarSelection: GH.cyan,
    tableHover: 'rgba(255,255,255,0.03)',
    add: {
      main: GH.cyan,
      light: '#33ccff',
      dark: '#0099cc',
      contrastText: '#0d0d0d',
    },
    delete: {
      main: GH.red,
      light: '#ff9492',
      dark: '#da3633',
      contrastText: '#ffffff',
    },
    edit: {
      main: GH.cyan,
      light: '#33ccff',
      dark: '#0099cc',
      contrastText: '#0d0d0d',
    },
  },
  components: {
    ...baseTheme.components as any,
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
        /* ── DataTable wrapper ── */
        '.data-table-paper': {
          border: `1px solid ${GH.border} !important`,
          borderRadius: '12px !important',
          backgroundColor: `${GH.canvas} !important`,
          overflow: 'hidden',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
        '.data-table-toolbar': {
          px: 2, py: 1.25,
          borderBottom: `1px solid ${GH.border}`,
          backgroundColor: `${GH.canvas} !important`,
        },
        '.data-table-title-bar': {
          width: 3, height: 18, borderRadius: '2px',
          backgroundColor: GH.green,
        },
        '.data-table-title': {
          fontSize: '0.8125rem', fontWeight: 600,
          color: `${GH.text} !important`,
          letterSpacing: '-0.01em',
        },
        '.data-table-count': {
          fontSize: '0.6875rem', color: GH.sub,
          fontWeight: 400,
        },
        '.data-table-header-cell': {
          fontWeight: '500 !important',
          backgroundColor: `${GH.bg} !important`,
          color: `${GH.muted} !important`,
          fontSize: '0.6875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: `1px solid ${GH.border}`,
          borderRight: `1px solid ${GH.border}`,
          padding: '6px 12px !important',
          position: 'sticky', top: 0, zIndex: 2,
        },
        '.data-table-header-cell:last-child': {
          borderRight: 'none',
        },
        '.data-table-body-cell': {
          borderBottom: `1px solid ${GH.border} !important`,
          borderColor: `${GH.border} !important`,
          color: `${GH.text} !important`,
          fontSize: '0.8125rem',
          padding: '8px 12px !important',
          backgroundColor: 'transparent !important',
          lineHeight: 1.5,
        },
        '.data-table-checkbox': {
          color: `${GH.muted} !important`,
        },
        '.data-table-checkbox.Mui-checked, .data-table-checkbox.MuiCheckbox-indeterminate': {
          color: `${GH.green} !important`,
        },
        '.data-table-pagination': {
          borderTop: `1px solid ${GH.border}`,
          backgroundColor: `${GH.canvas} !important`,
        },
        '.data-table-search': {
          width: 240,
          '& .MuiOutlinedInput-root': {
            bgcolor: `${GH.bg} !important`,
            borderRadius: '6px',
            fontSize: '0.75rem',
            height: 32,
            '& fieldset': { borderColor: GH.borderMd },
            '&:hover fieldset': { borderColor: GH.muted },
            '&.Mui-focused fieldset': { borderColor: GH.green },
          },
          '& .MuiInputBase-input': {
            color: `${GH.text} !important`,
            padding: '0 10px',
            '&::placeholder': { color: GH.sub, opacity: 1 },
          },
        },
        '.data-table-menu': {
          bgcolor: `${GH.canvas} !important`,
          border: `1px solid ${GH.borderMd} !important`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          borderRadius: '12px',
          minWidth: 180,
        },
        '.data-table-selection-chip': {
          bgcolor: `${GH.cyanDim} !important`,
          color: `${GH.cyan} !important`,
          borderColor: `${GH.cyan}33 !important`,
          fontSize: '0.6875rem',
          fontWeight: 500,
          height: 22,
          '& .MuiChip-deleteIcon': {
            color: `${GH.cyan} !important`,
            opacity: 0.7,
            '&:hover': { opacity: 1 },
          },
        },
        '.data-table-btn-create': {
          bgcolor: `${GH.green} !important`,
          color: '#fff !important',
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '6px',
          fontSize: '0.75rem',
          px: 2,
          letterSpacing: '-0.01em',
          '&:hover': { bgcolor: '#4ade80 !important' },
          transition: 'all 0.15s ease',
        },
        /* ── Breadcrumbs ── */
        '.data-breadcrumb-area': {
          mb: 0.25,
        },
        '.data-breadcrumb-back': {
          mr: 0.5, p: 0.5,
        },
        '.data-breadcrumb-row': {
          display: 'flex', alignItems: 'center',
        },
        '.data-breadcrumb-link': {
          fontSize: '0.75rem',
          color: `${GH.muted} !important`,
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 0.4,
          '&:hover': { textDecoration: 'underline', color: `${GH.text} !important` },
        },
        '.data-breadcrumb-current': {
          fontSize: '0.75rem',
          fontWeight: 500,
          color: `${GH.text} !important`,
          display: 'flex', alignItems: 'center', gap: 0.4,
        },
        /* ── Global placeholders ── */
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
