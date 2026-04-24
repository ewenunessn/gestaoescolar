import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AdminPanelSettings,
  Apps as AppsIcon,
  Assignment,
  Agriculture,
  Business,
  Calculate,
  CalendarToday,
  Category,
  Dashboard,
  DarkModeOutlined,
  Description,
  ExpandMore,
  HomeWork,
  Inventory,
  LightModeOutlined,
  ListAlt,
  LocalShipping,
  Logout,
  Menu as MenuIcon,
  MenuBook,
  NotificationsActive,
  Print,
  RequestPage,
  Restaurant,
  Schedule,
  School,
  Search as SearchIcon,
  Settings,
} from "@mui/icons-material";
import type { Theme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";

import { useThemePreference } from "../contexts/ThemeContext";
import { NotificacoesProvider } from "../contexts/NotificacoesContext";
import { NotificacoesEscolaProvider } from "../contexts/NotificacoesEscolaContext";
import { useConfigContext } from "../contexts/ConfigContext";
import { logout } from "../services/auth";
import { useConfigChangeIndicator } from "../hooks/useConfigChangeIndicator";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { useUserRole } from "../hooks/useUserRole";
import { SeletorPeriodo } from "./SeletorPeriodo";
import { GlobalSearchDropdown, useGlobalSearch } from "./GlobalSearch";
import NotificacoesEscolaMenu from "./NotificacoesEscolaMenu";
import NotificacoesMenu from "./NotificacoesMenu";
import { NutriLogLogo } from "./NutriLogLogo";

const drawerWidth = 248;
const collapsedDrawerWidth = 78;

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
  bgElevated: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.05 : 0.05),
  bgAccent: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.035 : 0.04),
  navActiveBg: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.08 : 0.1),
  navActiveBorder: alpha(theme.palette.text.primary, theme.palette.mode === "light" ? 0.12 : 0.16),
  navActiveText: theme.palette.text.primary,
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
  shadow: theme.palette.mode === "light" ? "0 10px 24px rgba(31,36,48,0.05)" : "0 10px 24px rgba(0,0,0,0.16)",
});

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Principal: <Dashboard fontSize="small" />,
  Cadastros: <School fontSize="small" />,
  "Cardápios": <MenuBook fontSize="small" />,
  Compras: <Assignment fontSize="small" />,
  Entregas: <LocalShipping fontSize="small" />,
  Estoque: <Inventory fontSize="small" />,
  "Configurações": <Settings fontSize="small" />,
  "Portal Escola": <HomeWork fontSize="small" />,
};

const MENU_ESCOLA = [
  {
    category: "Portal Escola",
    items: [
      { text: "Minha Escola", icon: <HomeWork fontSize="small" />, path: "/portal-escola" },
      { text: "Solicitações", icon: <RequestPage fontSize="small" />, path: "/portal-escola/solicitacoes" },
    ],
  },
];

const getMenuConfig = (_cfg: unknown) => [
  {
    standalone: true,
    item: { text: "Dashboard", icon: <Dashboard fontSize="small" />, path: "/dashboard" },
  },
  {
    category: "Cadastros",
    items: [
      { text: "Escolas", icon: <School fontSize="small" />, path: "/escolas" },
      { text: "Modalidades", icon: <Category fontSize="small" />, path: "/modalidades" },
      { text: "Produtos", icon: <Inventory fontSize="small" />, path: "/produtos" },
      { text: "Nutricionistas", icon: <Restaurant fontSize="small" />, path: "/nutricionistas" },
      { text: "Fornecedores", icon: <Business fontSize="small" />, path: "/fornecedores" },
      { text: "Contratos", icon: <Assignment fontSize="small" />, path: "/contratos" },
    ],
  },
  {
    category: "Cardápios",
    items: [
      { text: "Preparações", icon: <Restaurant fontSize="small" />, path: "/preparacoes" },
      { text: "Cardápios", icon: <MenuBook fontSize="small" />, path: "/cardapios" },
      { text: "Tipos de Refeição", icon: <Schedule fontSize="small" />, path: "/tipos-refeicao" },
    ],
  },
  {
    category: "Compras",
    items: [
      { text: "Planejamento", icon: <Calculate fontSize="small" />, path: "/compras/planejamento" },
      { text: "Guias de Demanda", icon: <ListAlt fontSize="small" />, path: "/guias-demanda" },
      { text: "Pedidos", icon: <RequestPage fontSize="small" />, path: "/compras" },
      { text: "Saldo Contratos", icon: <Category fontSize="small" />, path: "/saldos-contratos-modalidades" },
      { text: "Dashboard PNAE", icon: <Agriculture fontSize="small" />, path: "/pnae/dashboard" },
    ],
  },
  {
    category: "Entregas",
    items: [
      { text: "Gestão de Rotas", icon: <Business fontSize="small" />, path: "/gestao-rotas" },
      { text: "Romaneio", icon: <Print fontSize="small" />, path: "/romaneio" },
      { text: "Entregas", icon: <LocalShipping fontSize="small" />, path: "/entregas" },
      { text: "Comprovantes", icon: <Description fontSize="small" />, path: "/comprovantes-entrega" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Central", icon: <Inventory fontSize="small" />, path: "/estoque-central" },
      { text: "Estoque Escolar", icon: <School fontSize="small" />, path: "/estoque-escolar" },
      { text: "Solicitações Recebidas", icon: <RequestPage fontSize="small" />, path: "/solicitacoes-alimentos" },
    ],
  },
  {
    category: "Configurações",
    items: [
      { text: "Instituição", icon: <Settings fontSize="small" />, path: "/configuracao-instituicao" },
      { text: "Calendário Letivo", icon: <CalendarToday fontSize="small" />, path: "/calendario-letivo" },
      { text: "Períodos", icon: <CalendarToday fontSize="small" />, path: "/periodos", adminOnly: true },
      { text: "Usuários", icon: <AdminPanelSettings fontSize="small" />, path: "/gerenciamento-usuarios", adminOnly: true },
      { text: "Disparos", icon: <NotificationsActive fontSize="small" />, path: "/disparos-notificacao", adminOnly: true },
    ],
  },
];

const MODULO_SLUGS: Record<string, string> = {
  Dashboard: "dashboard",
  Escolas: "escolas",
  Modalidades: "modalidades",
  Produtos: "produtos",
  Nutricionistas: "nutricionistas",
  Fornecedores: "fornecedores",
  Contratos: "contratos",
  Preparações: "preparacoes",
  "Cardápios": "cardapios",
  "Tipos de Refeição": "tipos_refeicao",
  Planejamento: "planejamento_compras",
  "Guias de Demanda": "demandas",
  Pedidos: "pedidos",
  "Saldo Contratos": "saldo_contratos",
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
}: {
  item: { text: string; icon: React.ReactNode; path: string };
  pathname: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  tokens: LayoutTokens;
}) => {
  const active = isActivePath(pathname, item.path);
  const content = (
    <ListItemButton
      onClick={() => onNavigate(item.path)}
      sx={{
        mx: collapsed ? 0.75 : 1.25,
        my: 0.5,
        px: collapsed ? 1 : 1.5,
        py: 1.1,
        minHeight: 44,
        borderRadius: 1.5,
        justifyContent: collapsed ? "center" : "flex-start",
        backgroundColor: active ? tokens.navActiveBg : "transparent",
        color: active ? tokens.navActiveText : tokens.textSecondary,
        border: `1px solid ${active ? tokens.navActiveBorder : "transparent"}`,
        "&:hover": {
          backgroundColor: active ? tokens.navActiveBg : tokens.bgElevated,
          color: tokens.textPrimary,
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 0 : 36,
          color: "inherit",
          justifyContent: "center",
        }}
      >
        {item.icon}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.84rem",
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

  const icon = CATEGORY_ICONS[category] ?? <AppsIcon fontSize="small" />;

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
            mx: 0.75,
            my: 0.5,
            minHeight: 44,
            borderRadius: 1.5,
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
    <Box sx={{ mt: 0.75 }}>
      <ListItemButton
        onClick={() => setOpen((value) => !value)}
        sx={{
          mx: 1.25,
          px: 1.25,
          py: 0.9,
          minHeight: 40,
          borderRadius: 1.5,
          color: hasActive ? tokens.textPrimary : tokens.textMuted,
          "&:hover": { backgroundColor: tokens.bgAccent, color: tokens.textPrimary },
        }}
      >
        <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{icon}</ListItemIcon>
        <ListItemText
          primary={category}
          primaryTypographyProps={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        />
        <ExpandMore sx={{ fontSize: 18, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }} />
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
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
};

const ThemeSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { mode, setTheme } = useThemePreference();
  const theme = useTheme();
  const tokens = getLayoutTokens(theme);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const icon = mode === "dark" ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />;

  return (
    <>
      <Tooltip title="Tema">
        <IconButton
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{
            color: tokens.textSecondary,
            border: `1px solid ${tokens.borderSubtle}`,
            backgroundColor: compact ? "transparent" : tokens.bgSecondary,
            "&:hover": { backgroundColor: tokens.bgElevated, color: tokens.textPrimary },
          }}
        >
          {icon}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            borderRadius: 1.5,
            border: `1px solid ${tokens.borderSubtle}`,
            boxShadow: tokens.shadow,
          },
        }}
      >
        <MenuItem selected={mode === "light"} onClick={() => { setTheme("light"); setAnchorEl(null); }}>
          <LightModeOutlined sx={{ mr: 1.25, fontSize: 18 }} />
          Claro
        </MenuItem>
        <MenuItem selected={mode === "dark"} onClick={() => { setTheme("dark"); setAnchorEl(null); }}>
          <DarkModeOutlined sx={{ mr: 1.25, fontSize: 18 }} />
          Escuro
        </MenuItem>
      </Menu>
    </>
  );
};

const LayoutModernoInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const search = useGlobalSearch();

  const { configModuloSaldo, loading: loadingConfig, onConfigChanged } = useConfigContext();
  const { hasRecentChange, showChangeIndicator } = useConfigChangeIndicator();
  const { isAdmin, isEscolaUser } = useUserRole();
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

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: tokens.bgPrimary }}>
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        {hasRecentChange && !loadingConfig && (
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
          p: 1.5,
          borderTop: `1px solid ${tokens.borderSubtle}`,
          display: "grid",
          gap: 1,
        }}
      >
        {!isMobile && (
          <Button
            onClick={handleCollapseToggle}
            startIcon={<MenuIcon />}
            sx={{
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 1.5,
              color: tokens.textSecondary,
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: tokens.bgElevated, color: tokens.textPrimary },
            }}
          >
            {!collapsed && "Recolher menu"}
          </Button>
        )}
        {isMobile && <ThemeSwitcher compact />}
        <Button
          onClick={() => logout()}
          startIcon={<Logout sx={{ color: tokens.danger }} />}
          sx={{
            justifyContent: collapsed && !isMobile ? "center" : "flex-start",
            borderRadius: 1.5,
            color: tokens.textSecondary,
            "&:hover": {
              backgroundColor: tokens.dangerTint,
              color: tokens.danger,
            },
          }}
        >
          {(!collapsed || isMobile) && "Sair"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
      <AppBar
        position="fixed"
        color="transparent"
        sx={{
          backdropFilter: "blur(18px)",
          backgroundColor: alpha(tokens.bgPrimary, theme.palette.mode === "light" ? 0.9 : 0.82),
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 60, md: 64 },
            gap: { xs: 1, md: 1.25 },
            px: { xs: 1.25, md: 0 },
          }}
        >
          <Box
            sx={{
              width: { xs: "auto", md: collapsed ? collapsedDrawerWidth : drawerWidth },
              px: { xs: 0.75, md: 2.25 },
              pl: { xs: 1.25, md: 2.5 },
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <NutriLogLogo compact={collapsed && !isMobile} />
          </Box>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { xs: "inline-flex", md: "none" }, color: tokens.textPrimary }}
          >
            <MenuIcon />
          </IconButton>

          <Box
            sx={{
              flex: { xs: 1, md: "0 1 440px" },
              maxWidth: { xs: "none", md: 440, xl: 500 },
              minWidth: { xs: 0, md: 320 },
              position: "relative",
              ml: { xs: 0, md: 2 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                minHeight: 38,
                borderRadius: 1.25,
                backgroundColor: alpha(tokens.bgSecondary, theme.palette.mode === "light" ? 0.82 : 0.72),
                border: `1px solid ${search.open ? alpha(tokens.primary, 0.35) : tokens.borderSubtle}`,
                boxShadow: search.open ? `0 0 0 3px ${alpha(tokens.primary, 0.12)}` : "none",
              }}
            >
              <Box sx={{ pl: 1.75, pr: 1, display: "flex", alignItems: "center", color: tokens.textMuted }}>
                <SearchIcon sx={{ fontSize: 18 }} />
              </Box>
              <InputBase
                inputRef={search.inputRef}
                value={search.query}
                onChange={(event) => {
                  search.setQuery(event.target.value);
                  search.setOpen(true);
                }}
                onFocus={() => search.setOpen(true)}
                onBlur={() => setTimeout(() => search.setOpen(false), 150)}
                placeholder="Buscar páginas..."
                sx={{
                  flex: 1,
                  py: 1,
                  color: tokens.textPrimary,
                  fontSize: "0.88rem",
                  "& input::placeholder": {
                    color: tokens.textMuted,
                    opacity: 1,
                  },
                }}
              />
              <Box
                sx={{
                  display: { xs: "none", lg: "flex" },
                  alignItems: "center",
                  gap: 0.5,
                  mr: 1.25,
                  px: 1,
                  py: 0.3,
                  borderRadius: 1,
                  backgroundColor: tokens.bgAccent,
                  border: `1px solid ${tokens.borderSubtle}`,
                  color: tokens.textMuted,
                  fontFamily: "monospace",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                }}
              >
                <span>Ctrl</span>
                <span>K</span>
              </Box>
            </Box>

            {search.open && (
              <GlobalSearchDropdown
                query={search.query}
                loading={search.loading}
                results={search.results}
                onNavigate={search.handleNavigate}
                onClose={search.handleClose}
              />
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              ml: "auto",
              pr: { xs: 0, md: 1.25 },
              "& .MuiIconButton-root": {
                width: 36,
                height: 36,
              },
            }}
          >
            <ThemeSwitcher />
            <SeletorPeriodo />
            {isEscolaUser ? <NotificacoesEscolaMenu /> : <NotificacoesMenu />}
          </Box>
        </Toolbar>
      </AppBar>

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
              mt: "60px",
              height: "calc(100% - 60px)",
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
              mt: "68px",
              height: "calc(100% - 68px)",
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
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          mt: { xs: "60px", md: "68px" },
          width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
          transition: "width 0.22s ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const LayoutModerno: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificacoesProvider>
    <NotificacoesEscolaProvider>
      <LayoutModernoInner>{children}</LayoutModernoInner>
    </NotificacoesEscolaProvider>
  </NotificacoesProvider>
);

export default LayoutModerno;
