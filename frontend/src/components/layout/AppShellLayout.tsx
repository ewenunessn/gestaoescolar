import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Badge,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AppWindow,
  BarChart3,
  BellRing,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChefHat,
  ChevronDown,
  CircleUserRound,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Menu as MenuIcon,
  Moon,
  Package2,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  School,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Sprout,
  Store,
  Sun,
  Truck,
  UsersRound,
  Utensils,
  Warehouse,
} from "lucide-react";
import type { Theme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

import { useThemePreference } from "../../contexts/ThemeContext";
import { NotificacoesProvider } from "../../contexts/NotificacoesContext";
import { NotificacoesEscolaProvider } from "../../contexts/NotificacoesEscolaContext";
import { useConfigContext } from "../../contexts/ConfigContext";
import { logout } from "../../services/auth";
import { useConfigChangeIndicator } from "../../hooks/useConfigChangeIndicator";
import { useUserPermissions } from "../../hooks/useUserPermissions";
import { useUserRole } from "../../hooks/useUserRole";
import { ActivePeriodSelector } from "../navigation/ActivePeriodSelector";
import NotificacoesEscolaMenu from "../NotificacoesEscolaMenu";
import NotificacoesMenu from "../NotificacoesMenu";
import { DesktopTitlebarMenu } from "./DesktopTitlebarMenu";
import { NutriLogLogo } from "./NutriLogLogo";
import { ROUTE_PERMISSION_SLUGS } from "../../routes/permissionSlugs";

const drawerWidth = 248;
const collapsedDrawerWidth = 78;
const desktopTitleBarHeight = 32;
const navInset = 0.75;
const navIconWidth = 30;
const navItemPaddingX = 1.25;
const sidebarFontFamily = '"Segoe UI Variable", "Segoe UI", "Inter", "Roboto", sans-serif';
const iconProps = { size: 15, strokeWidth: 1.75 };
const compactIconProps = { size: 14, strokeWidth: 1.75 };

type LayoutTokens = {
  bgPrimary: string;
  bgSecondary: string;
  bgElevated: string;
  bgAccent: string;
  navActiveBg: string;
  navActiveBorder: string;
  navActiveText: string;
  borderSubtle: string;
  borderMedium: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  success: string;
  danger: string;
  primaryTint: string;
  successTint: string;
  dangerTint: string;
  shadow: string;
};

const getLayoutTokens = (theme: Theme): LayoutTokens => ({
  bgPrimary: theme.palette.background.sidebar,
  bgSecondary: theme.palette.background.paper,
  bgElevated: theme.palette.mode === "light" ? "#eeeeee" : "#1d1d1d",
  bgAccent: theme.palette.mode === "light" ? "#f3f3f3" : "#171717",
  navActiveBg: theme.palette.mode === "light" ? "#e7e7e7" : "#202020",
  navActiveBorder: "transparent",
  navActiveText: theme.palette.mode === "light" ? "#202020" : "#f5f5f5",
  borderSubtle: theme.palette.divider,
  borderMedium: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.14 : 0.2),
  textPrimary: theme.palette.text.primary,
  textSecondary: theme.palette.text.secondary,
  textMuted: alpha(theme.palette.text.secondary, 0.8),
  primary: theme.palette.primary.main,
  success: theme.palette.success.main,
  danger: theme.palette.error.main,
  primaryTint: alpha(theme.palette.primary.main, 0.16),
  successTint: alpha(theme.palette.success.main, 0.18),
  dangerTint: alpha(theme.palette.error.main, 0.18),
  shadow: theme.palette.mode === "light" ? "0 12px 30px rgba(47,49,53,0.06)" : "0 10px 24px rgba(0,0,0,0.16)",
});

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Principal: <LayoutDashboard {...iconProps} />,
  Abastecimento: <AppWindow {...iconProps} />,
  Cadastros: <UsersRound {...iconProps} />,
  "Cardápios": <Utensils {...iconProps} />,
  Compras: <ShoppingBasket {...iconProps} />,
  Entregas: <Truck {...iconProps} />,
  Estoque: <Package2 {...iconProps} />,
  "Configurações": <Settings {...iconProps} />,
  "Portal Escola": <Building2 {...iconProps} />,
};

const MENU_ESCOLA = [
  {
    category: "Portal Escola",
    items: [
      { text: "Minha Escola", icon: <Home {...iconProps} />, path: "/portal-escola" },
      { text: "Cardápio", icon: <Utensils {...iconProps} />, path: "/portal-escola/cardapio" },
      { text: "Solicitações", icon: <FileText {...iconProps} />, path: "/portal-escola/solicitacoes" },
      { text: "Comprovantes", icon: <ShieldCheck {...iconProps} />, path: "/portal-escola/comprovantes" },
      { text: "Alunos", icon: <UsersRound {...iconProps} />, path: "/portal-escola/alunos" },
    ],
  },
];

const getMenuConfig = (_cfg: unknown) => [
  {
    standalone: true,
    item: { text: "Dashboard", icon: <LayoutDashboard {...iconProps} />, path: "/dashboard" },
  },
  {
    category: "Cadastros",
    items: [
      { text: "Escolas", icon: <School {...iconProps} />, path: "/escolas" },
      { text: "Modalidades", icon: <SlidersHorizontal {...iconProps} />, path: "/modalidades" },
      { text: "Produtos", icon: <Package2 {...iconProps} />, path: "/produtos" },
      { text: "Nutricionistas", icon: <Utensils {...iconProps} />, path: "/nutricionistas" },
      { text: "Fornecedores", icon: <Store {...iconProps} />, path: "/fornecedores" },
      { text: "Contratos", icon: <ClipboardList {...iconProps} />, path: "/contratos" },
    ],
  },
  {
    category: "Cardápios",
    items: [
      { text: "Preparações", icon: <ChefHat {...iconProps} />, path: "/preparacoes" },
      { text: "Cardápios", icon: <BookOpen {...iconProps} />, path: "/cardapios" },
      { text: "Tipos de Refeição", icon: <CalendarDays {...iconProps} />, path: "/tipos-refeicao" },
    ],
  },
  {
    category: "Compras",
    items: [
      { text: "Saldos de Contratos", icon: <BriefcaseBusiness {...iconProps} />, path: "/saldos-contratos-modalidades" },
      { text: "Dashboard PNAE", icon: <Sprout {...iconProps} />, path: "/pnae/dashboard" },
    ],
  },
  {
    category: "Abastecimento",
    items: [
      { text: "Visao Geral", icon: <BarChart3 {...iconProps} />, path: "/abastecimento" },
      { text: "Guias de Demanda", icon: <ListChecks {...iconProps} />, path: "/guias-demanda" },
      { text: "Compras / Pedidos", icon: <ShoppingBasket {...iconProps} />, path: "/compras" },
      { text: "Entregas", icon: <Truck {...iconProps} />, path: "/entregas" },
      { text: "Comprovantes", icon: <ClipboardCheck {...iconProps} />, path: "/comprovantes-entrega" },
      { text: "Rotas", icon: <Map {...iconProps} />, path: "/gestao-rotas" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Central", icon: <Warehouse {...iconProps} />, path: "/estoque-central" },
      { text: "Estoque Escolar", icon: <Boxes {...iconProps} />, path: "/estoque-escolar" },
      { text: "Solicitações Recebidas", icon: <CalendarCheck {...iconProps} />, path: "/solicitacoes-alimentos" },
    ],
  },
];

type MenuItemConfig = {
  text: string;
  icon: React.ReactNode;
  path: string;
  adminOnly?: boolean;
};

const SETTINGS_MENU_ITEMS: MenuItemConfig[] = [
  { text: "Instituição", icon: <Building2 {...iconProps} />, path: "/configuracao-instituicao" },
  { text: "Calendário Letivo", icon: <CalendarDays {...iconProps} />, path: "/calendario-letivo" },
  { text: "Períodos", icon: <CalendarCheck {...iconProps} />, path: "/periodos", adminOnly: true },
  { text: "Usuários", icon: <ShieldCheck {...iconProps} />, path: "/gerenciamento-usuarios", adminOnly: true },
  { text: "Disparos", icon: <BellRing {...iconProps} />, path: "/disparos-notificacao", adminOnly: true },
];

const MODULO_SLUGS: Record<string, string> = {
  Dashboard: "dashboard",
  "Visao Geral": "planejamento_compras",
  "Compras / Pedidos": ROUTE_PERMISSION_SLUGS.compras,
  Rotas: "rotas",
  Escolas: "escolas",
  Modalidades: "modalidades",
  Produtos: "produtos",
  Nutricionistas: "nutricionistas",
  Fornecedores: "fornecedores",
  Contratos: "contratos",
  Preparações: ROUTE_PERMISSION_SLUGS.preparacoes,
  "Cardápios": "cardapios",
  "Tipos de Refeição": "tipos_refeicao",
  "Guias de Demanda": ROUTE_PERMISSION_SLUGS.guiasDemanda,
  Pedidos: ROUTE_PERMISSION_SLUGS.compras,
  "Saldos de Contratos": "saldo_contratos",
  "Dashboard PNAE": "pnae",
  "Gestão de Rotas": "rotas",
  Romaneio: "romaneio",
  Entregas: "entregas",
  Comprovantes: "comprovantes",
  "Estoque Central": "estoque",
  "Estoque Escolar": "estoque",
  "Solicitações Recebidas": "solicitacoes",
  Instituição: "configuracoes",
  "Calendário Letivo": "calendario",
  Períodos: "periodos",
  Usuários: "usuarios",
  Disparos: "notificacoes",
};

const isActivePath = (pathname: string, path: string) => pathname === path || (path !== "/" && pathname.startsWith(path));

const NavItem = ({
  item,
  pathname,
  onNavigate,
  collapsed,
  tokens,
  showIcon = true,
}: {
  item: { text: string; icon: React.ReactNode; path: string };
  pathname: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  tokens: LayoutTokens;
  showIcon?: boolean;
}) => {
  const active = isActivePath(pathname, item.path);
  const content = (
    <ListItemButton
      onClick={() => onNavigate(item.path)}
      sx={{
        mx: navInset,
        my: 0.18,
        px: collapsed ? 1 : navItemPaddingX,
        py: 0.72,
        minHeight: 32,
        borderRadius: 1.25,
        justifyContent: collapsed ? "center" : "flex-start",
        backgroundColor: active ? tokens.navActiveBg : "transparent",
        color: active ? tokens.navActiveText : tokens.textSecondary,
        border: 0,
        "&:hover": {
          backgroundColor: active ? tokens.navActiveBg : tokens.bgElevated,
          color: tokens.textPrimary,
        },
      }}
    >
      {showIcon && (
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : navIconWidth,
            color: "inherit",
            justifyContent: "center",
            "& svg": { width: 15, height: 15 },
          }}
        >
          {item.icon}
        </ListItemIcon>
      )}
      {!showIcon && !collapsed && <Box aria-hidden="true" sx={{ width: navIconWidth, flexShrink: 0 }} />}
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.82rem",
            fontWeight: active ? 600 : 500,
          }}
        />
      )}
    </ListItemButton>
  );

  return collapsed ? (
    <Tooltip title={item.text} placement="right">
      {content}
    </Tooltip>
  ) : content;
};

const CategoryGroup = ({
  category,
  items,
  pathname,
  onNavigate,
  collapsed,
  tokens,
}: {
  category: string;
  items: Array<{ text: string; icon: React.ReactNode; path: string }>;
  pathname: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  tokens: LayoutTokens;
}) => {
  const hasActive = items.some((item) => isActivePath(pathname, item.path));
  const [open, setOpen] = useState(hasActive);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const icon = CATEGORY_ICONS[category] ?? <AppWindow {...iconProps} />;

  if (collapsed) {
    return (
      <Tooltip
        placement="right"
        title={
          <Box>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, mb: 1, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {category}
            </Typography>
            {items.map((item) => (
              <Box
                key={item.path}
                onClick={() => onNavigate(item.path)}
                sx={{
                  py: 0.9,
                  px: 1.1,
                  borderRadius: 1,
                  cursor: "pointer",
                  color: isActivePath(pathname, item.path) ? tokens.navActiveText : tokens.textPrimary,
                  backgroundColor: isActivePath(pathname, item.path) ? tokens.navActiveBg : "transparent",
                  "&:hover": {
                    backgroundColor: tokens.bgElevated,
                  },
                }}
              >
                {item.text}
              </Box>
            ))}
          </Box>
        }
      >
        <ListItemButton
          onClick={() => setOpen((value) => !value)}
          sx={{
            mx: navInset,
            my: 0.35,
            minHeight: 38,
            borderRadius: 1.25,
            justifyContent: "center",
            color: hasActive ? tokens.navActiveText : tokens.textMuted,
            backgroundColor: hasActive ? tokens.navActiveBg : "transparent",
            "&:hover": { backgroundColor: tokens.bgElevated, color: tokens.textPrimary },
          }}
        >
          <ListItemIcon sx={{ minWidth: 0, color: "inherit", justifyContent: "center" }}>
            {icon}
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }

  return (
    <Box sx={{ mt: 0.65 }}>
      <ListItemButton
        onClick={() => setOpen((value) => !value)}
        sx={{
          mx: navInset,
          px: navItemPaddingX,
          py: 0.55,
          minHeight: 30,
          borderRadius: 1,
          color: hasActive ? tokens.textPrimary : tokens.textMuted,
          backgroundColor: "transparent",
          "&:hover": { backgroundColor: "transparent", color: tokens.textPrimary },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: navIconWidth,
            color: "inherit",
            justifyContent: "center",
            "& svg": { width: 15, height: 15 },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={category}
          primaryTypographyProps={{
            fontSize: "0.68rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: tokens.textMuted,
          }}
        />
        <ChevronDown
          size={15}
          strokeWidth={1.75}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
          }}
        />
      </ListItemButton>
      <Collapse in={open} timeout={180} unmountOnExit>
        <List dense disablePadding sx={{ pb: 0.5 }}>
          {items.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed={false}
              tokens={tokens}
              showIcon={false}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
};

const SidebarNotifications = ({
  collapsed,
  isMobile,
  isEscolaUser,
  tokens,
}: {
  collapsed: boolean;
  isMobile: boolean;
  isEscolaUser: boolean;
  tokens: LayoutTokens;
}) => {
  const isCollapsed = collapsed && !isMobile;

  return (
    <>
      {isEscolaUser ? (
        <NotificacoesEscolaMenu
          placement="sidebar"
          renderTrigger={({ onClick, naoLidas }) => (
            <NotificationSidebarTrigger
              collapsed={isCollapsed}
              naoLidas={naoLidas}
              onClick={onClick}
              tokens={tokens}
            />
          )}
        />
      ) : (
        <NotificacoesMenu
          placement="sidebar"
          renderTrigger={({ onClick, naoLidas }) => (
            <NotificationSidebarTrigger
              collapsed={isCollapsed}
              naoLidas={naoLidas}
              onClick={onClick}
              tokens={tokens}
            />
          )}
        />
      )}
    </>
  );
};

const NotificationSidebarTrigger = ({
  collapsed,
  naoLidas,
  onClick,
  tokens,
}: {
  collapsed: boolean;
  naoLidas: number;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  tokens: LayoutTokens;
}) => (
  <Button
    onClick={onClick}
    startIcon={
      <Badge badgeContent={naoLidas || undefined} color="error" max={99}>
        <BellRing {...iconProps} />
      </Badge>
    }
    sx={{
      justifyContent: collapsed ? "center" : "flex-start",
      minWidth: 0,
      minHeight: 32,
      width: "auto",
      mx: navInset,
      my: 0.18,
      px: collapsed ? 1 : navItemPaddingX,
      py: 0.72,
      borderRadius: 1.25,
      color: tokens.textSecondary,
      backgroundColor: "transparent",
      textTransform: "none",
      "& .MuiButton-startIcon": {
        minWidth: collapsed ? 0 : navIconWidth,
        mr: collapsed ? 0 : 0,
        ml: 0,
        justifyContent: "center",
        color: tokens.textPrimary,
        "& svg": { width: 15, height: 15 },
      },
      "&:hover": {
        backgroundColor: tokens.bgElevated,
        color: tokens.textPrimary,
      },
    }}
  >
    {!collapsed && (
      <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 650, lineHeight: 1.1, color: tokens.textPrimary }}>
        Notificações
      </Typography>
    )}
  </Button>
);

const AccountSettingsMenu = ({
  collapsed,
  isMobile,
  user,
  tokens,
  settingsItems,
  onNavigate,
  onLogout,
}: {
  collapsed: boolean;
  isMobile: boolean;
  user: { nome?: string; email?: string; tipo?: string; perfil?: string } | null;
  tokens: LayoutTokens;
  settingsItems: MenuItemConfig[];
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) => {
  const { mode, setTheme } = useThemePreference();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const displayName = user?.nome || user?.email || "Usuário";
  const displayEmail = user?.email || user?.perfil || user?.tipo || "Conta do sistema";
  const isCollapsed = collapsed && !isMobile;

  return (
    <>
      <Tooltip title={isCollapsed ? "Configurações" : ""}>
        <Button
          onClick={(event) => setAnchorEl(event.currentTarget)}
          startIcon={<Settings {...iconProps} />}
          sx={{
            justifyContent: isCollapsed ? "center" : "flex-start",
            minWidth: 0,
            minHeight: 32,
            width: "auto",
            mx: navInset,
            my: 0.18,
            px: isCollapsed ? 1 : navItemPaddingX,
            py: 0.72,
            borderRadius: 1.25,
            color: tokens.textSecondary,
            backgroundColor: open ? tokens.bgElevated : "transparent",
            textTransform: "none",
            "& .MuiButton-startIcon": {
              minWidth: isCollapsed ? 0 : navIconWidth,
              mr: isCollapsed ? 0 : 0,
              ml: 0,
              justifyContent: "center",
              color: tokens.textPrimary,
              "& svg": { width: 15, height: 15 },
            },
            "&:hover": {
              backgroundColor: tokens.bgElevated,
              color: tokens.textPrimary,
            },
          }}
        >
          {!isCollapsed && (
            <Box sx={{ minWidth: 0, textAlign: "left" }}>
              <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 650, lineHeight: 1.1, color: tokens.textPrimary }}>
                Configurações
              </Typography>
            </Box>
          )}
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{
          sx: {
            mb: 1,
            width: 282,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: 1.5,
            border: `1px solid ${tokens.borderSubtle}`,
            backgroundColor: tokens.bgSecondary,
            boxShadow: tokens.shadow,
            fontFamily: sidebarFontFamily,
            "& .MuiTypography-root, & .MuiButton-root, & .MuiMenuItem-root": {
              fontFamily: sidebarFontFamily,
            },
            "& svg": {
              flexShrink: 0,
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.25, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1,
              display: "grid",
              placeItems: "center",
              backgroundColor: tokens.bgElevated,
              color: tokens.textPrimary,
              flexShrink: 0,
            }}
          >
            <CircleUserRound size={16} strokeWidth={1.75} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: "0.82rem", fontWeight: 700, color: tokens.textPrimary }}>
              {displayName}
            </Typography>
            <Typography noWrap sx={{ fontSize: "0.74rem", color: tokens.textMuted }}>
              {displayEmail}
            </Typography>
          </Box>
        </Box>
        <Divider />
        {settingsItems.length > 0 && (
          <Box sx={{ py: 0.5 }}>
            <Typography
              sx={{
                px: 1.5,
                py: 0.75,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: tokens.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Configurações
            </Typography>
            {settingsItems.map((item) => (
              <MenuItem
                key={item.path}
                onClick={() => {
                  setAnchorEl(null);
                  onNavigate(item.path);
                }}
                sx={{ minHeight: 36, px: 1.25, py: 0.72, fontSize: "0.82rem", gap: 0 }}
              >
                <Box sx={{ width: 30, display: "grid", placeItems: "center", color: tokens.textSecondary, flexShrink: 0 }}>
                  {item.icon}
                </Box>
                {item.text}
              </MenuItem>
            ))}
          </Box>
        )}
        <Divider />
        <Box sx={{ px: 1.5, py: 1 }}>
          <Box sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 1, color: tokens.textSecondary }}>
            <Palette size={15} strokeWidth={1.75} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: tokens.textPrimary }}>Tema</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
            <Button
              size="small"
              onClick={() => setTheme("light")}
              startIcon={<Sun {...compactIconProps} />}
              sx={{
                minHeight: 32,
                borderRadius: 1,
                border: `1px solid ${mode === "light" ? alpha(tokens.primary, 0.42) : tokens.borderSubtle}`,
                color: mode === "light" ? tokens.textPrimary : tokens.textSecondary,
                backgroundColor: mode === "light" ? tokens.primaryTint : "transparent",
                textTransform: "none",
                fontSize: "0.76rem",
              }}
            >
              Claro
            </Button>
            <Button
              size="small"
              onClick={() => setTheme("dark")}
              startIcon={<Moon {...compactIconProps} />}
              sx={{
                minHeight: 32,
                borderRadius: 1,
                border: `1px solid ${mode === "dark" ? alpha(tokens.primary, 0.42) : tokens.borderSubtle}`,
                color: mode === "dark" ? tokens.textPrimary : tokens.textSecondary,
                backgroundColor: mode === "dark" ? tokens.primaryTint : "transparent",
                textTransform: "none",
                fontSize: "0.76rem",
              }}
            >
              Escuro
            </Button>
          </Box>
        </Box>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography sx={{ mb: 0.75, fontSize: "0.72rem", fontWeight: 700, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Período
          </Typography>
          <ActivePeriodSelector placement="accountMenu" />
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onLogout();
          }}
          sx={{ minHeight: 38, fontSize: "0.82rem", gap: 1.25, color: tokens.danger }}
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sair
        </MenuItem>
      </Menu>
    </>
  );
};

const AppShellLayoutInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const tokens = getLayoutTokens(theme);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const navigate = useNavigate();
  const location = useLocation();
  const desktopShell = window.desktopShell;
  const isDesktopShell = Boolean(desktopShell?.isDesktop);
  const titleBarOffset = isDesktopShell ? desktopTitleBarHeight : 0;
  const mobileTopOffset = `${titleBarOffset}px`;
  const desktopTopOffset = `${titleBarOffset}px`;

  const { configModuloSaldo, loading: loadingConfig, onConfigChanged } = useConfigContext();
  const { hasRecentChange, showChangeIndicator } = useConfigChangeIndicator();
  const { user, isAdmin, isEscolaUser } = useUserRole();
  const { hasLeitura } = useUserPermissions();

  useEffect(() => {
    if (onConfigChanged) onConfigChanged(showChangeIndicator);
  }, [onConfigChanged, showChangeIndicator]);

  const menuConfig = useMemo(() => {
    if (isEscolaUser) return MENU_ESCOLA;

    return getMenuConfig(configModuloSaldo)
      .map((section) => {
        if ("standalone" in section) return section;

        return {
          ...section,
          items: section.items.filter((item: any) => {
            if (item.adminOnly && !isAdmin) return false;
            if (isAdmin) return true;
            const slug = MODULO_SLUGS[item.text];
            return slug ? hasLeitura(slug) : true;
          }),
        };
      })
      .filter((section: any) => section.standalone || section.items.length > 0);
  }, [configModuloSaldo, hasLeitura, isAdmin, isEscolaUser]);

  const settingsMenuItems = useMemo(() => {
    return SETTINGS_MENU_ITEMS.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (isAdmin) return true;
      const slug = MODULO_SLUGS[item.text];
      return slug ? hasLeitura(slug) : true;
    });
  }, [hasLeitura, isAdmin]);

  const handleDrawerToggle = useCallback(() => setMobileOpen((value) => !value), []);
  const handleCollapseToggle = useCallback(() => {
    setCollapsed((value: boolean) => {
      const next = !value;
      localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  }, [isMobile, navigate]);

  const handleLogout = useCallback(() => {
    logout({ redirect: false });
    navigate("/login", { replace: true });
    if (isMobile) setMobileOpen(false);
  }, [isMobile, navigate]);

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: tokens.bgPrimary,
        fontFamily: sidebarFontFamily,
        "& .MuiTypography-root, & .MuiButton-root, & .MuiListItemText-primary": {
          fontFamily: sidebarFontFamily,
        },
        "& svg": {
          flexShrink: 0,
        },
      }}
    >
      <Box
        sx={{
          px: collapsed && !isMobile ? 1 : 1.5,
          pt: 1.5,
          pb: 1,
          display: "grid",
          gap: 1,
        }}
      >
        <Box
          sx={{
            minHeight: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "space-between",
            px: collapsed && !isMobile ? 0 : 0.75,
            gap: 1,
          }}
        >
          {(!collapsed || isMobile) && <NutriLogLogo />}
          {!isMobile && (
            <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
              <IconButton
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                onClick={handleCollapseToggle}
                sx={{
                  width: 20,
                  height: 20,
                  p: 0,
                  border: 0,
                  borderRadius: 0,
                  color: tokens.textSecondary,
                  backgroundColor: "transparent",
                  flexShrink: 0,
                  "&:hover": {
                    backgroundColor: "transparent",
                    color: tokens.textPrimary,
                  },
                }}
              >
                {collapsed ? <PanelLeftOpen {...iconProps} /> : <PanelLeftClose {...iconProps} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {hasRecentChange && !loadingConfig && (!collapsed || isMobile) && (
          <Box
            sx={{
              px: 1.25,
              py: 0.8,
              borderRadius: 1,
              backgroundColor: tokens.successTint,
              color: tokens.success,
              fontSize: "0.74rem",
              fontWeight: 600,
            }}
          >
            Menu atualizado
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          pb: 1.5,
        }}
      >
        {loadingConfig ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List disablePadding>
            {menuConfig.map((config: any) => (
              "standalone" in config ? (
                <NavItem
                  key={config.item.path}
                  item={config.item}
                  pathname={location.pathname}
                  onNavigate={handleNavigation}
                  collapsed={collapsed && !isMobile}
                  tokens={tokens}
                />
              ) : (
                <CategoryGroup
                  key={config.category}
                  category={config.category}
                  items={config.items}
                  pathname={location.pathname}
                  onNavigate={handleNavigation}
                  collapsed={collapsed && !isMobile}
                  tokens={tokens}
                />
              )
            ))}
          </List>
        )}
      </Box>

      <Box
        sx={{
          py: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.06 : 0.08)}`,
          display: "grid",
          gap: 0.35,
        }}
      >
        <SidebarNotifications
          collapsed={collapsed}
          isMobile={isMobile}
          isEscolaUser={isEscolaUser}
          tokens={tokens}
        />
        <AccountSettingsMenu
          collapsed={collapsed}
          isMobile={isMobile}
          user={user}
          tokens={tokens}
          settingsItems={settingsMenuItems}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
      {isDesktopShell && (
        <>
          <Box
            aria-hidden="true"
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: titleBarOffset,
              backgroundColor: tokens.bgPrimary,
              zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
              WebkitAppRegion: "drag",
              userSelect: "none",
            }}
          />
          <DesktopTitlebarMenu
            height={titleBarOffset}
            backgroundColor={tokens.bgPrimary}
            borderColor={tokens.borderSubtle}
            iconColor={tokens.textPrimary}
            showDevTools={Boolean(desktopShell?.isDev || import.meta.env.DEV)}
            onBack={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }
              navigate("/");
            }}
            onReload={() => {
              desktopShell?.reloadApp?.();
            }}
            onOpenLogs={() => {
              desktopShell?.openLogsFolder?.();
            }}
            onShowAbout={() => {
              desktopShell?.showAboutDialog?.();
            }}
            onToggleDevTools={() => {
              desktopShell?.toggleDevTools?.();
            }}
          />
        </>
      )}
      <IconButton
        aria-label="Abrir menu"
        onClick={handleDrawerToggle}
        sx={{
          display: { xs: "inline-flex", md: "none" },
          position: "fixed",
          top: `calc(${titleBarOffset}px + 8px)`,
          left: 8,
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          width: 36,
          height: 36,
          borderRadius: 1,
          color: tokens.textPrimary,
          backgroundColor: alpha(tokens.bgPrimary, theme.palette.mode === "light" ? 0.9 : 0.82),
          border: `1px solid ${tokens.borderSubtle}`,
          "&:hover": { backgroundColor: tokens.bgElevated },
        }}
      >
        <MenuIcon {...iconProps} />
      </IconButton>
      <Box component="nav" sx={{ width: { md: collapsed ? collapsedDrawerWidth : drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              mt: mobileTopOffset,
              height: `calc(100% - ${titleBarOffset}px)`,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: collapsed ? collapsedDrawerWidth : drawerWidth,
              mt: desktopTopOffset,
              height: `calc(100% - ${titleBarOffset}px)`,
              overflowX: "hidden",
              transition: "width 0.22s ease",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          "--app-sidebar-width": {
            xs: "0px",
            md: collapsed ? `${collapsedDrawerWidth}px` : `${drawerWidth}px`,
          },
          "--app-top-offset": {
            xs: mobileTopOffset,
            md: desktopTopOffset,
          },
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          mt: { xs: mobileTopOffset, md: desktopTopOffset },
          width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
          transition: "width 0.22s ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const AppShellLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificacoesProvider>
    <NotificacoesEscolaProvider>
      <AppShellLayoutInner>{children}</AppShellLayoutInner>
    </NotificacoesEscolaProvider>
  </NotificacoesProvider>
);

export default AppShellLayout;
