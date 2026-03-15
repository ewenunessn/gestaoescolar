import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Drawer,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Tooltip,
  useTheme,
  useMediaQuery,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  School,
  Category,
  Inventory,
  Restaurant,
  MenuBook,
  Business,
  Assignment,
  LocalShipping,
  Logout,
  ListAlt,
  RequestPage,
  Print,
  Settings,
  Description,
  Agriculture,
  Calculate,
  ArrowBack as ArrowBackIcon,
  ExpandLess,
  ExpandMore,
  Apps as AppsIcon,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { useConfigContext } from "../context/ConfigContext";
import { useConfigChangeIndicator } from "../hooks/useConfigChangeIndicator";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePageTitle } from "../contexts/PageTitleContext";

const drawerWidth = 220;
const collapsedDrawerWidth = 64;

// Ícone representativo de cada categoria
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Principal":      <Dashboard fontSize="small" />,
  "Cadastros":      <School fontSize="small" />,
  "Cardápios":      <MenuBook fontSize="small" />,
  "Compras":        <Assignment fontSize="small" />,
  "Entregas":       <LocalShipping fontSize="small" />,
  "Estoque":        <Inventory fontSize="small" />,
  "Configurações":  <Settings fontSize="small" />,
};

const getMenuConfig = (_configModuloSaldo: any) => [
  {
    category: "Principal",
    items: [
      { text: "Dashboard", icon: <Dashboard fontSize="small" />, path: "/dashboard" },
    ],
  },
  {
    category: "Cadastros",
    items: [
      { text: "Escolas",        icon: <School fontSize="small" />,     path: "/escolas" },
      { text: "Modalidades",    icon: <Category fontSize="small" />,   path: "/modalidades" },
      { text: "Produtos",       icon: <Inventory fontSize="small" />,  path: "/produtos" },
      { text: "Nutricionistas", icon: <Restaurant fontSize="small" />, path: "/nutricionistas" },
      { text: "Fornecedores",   icon: <Business fontSize="small" />,   path: "/fornecedores" },
      { text: "Contratos",      icon: <Assignment fontSize="small" />, path: "/contratos" },
    ],
  },
  {
    category: "Cardápios",
    items: [
      { text: "Refeições", icon: <Restaurant fontSize="small" />, path: "/refeicoes" },
      { text: "Cardápios", icon: <MenuBook fontSize="small" />,   path: "/cardapios" },
    ],
  },
  {
    category: "Compras",
    items: [
      { text: "Planejamento",     icon: <Calculate fontSize="small" />,     path: "/compras/planejamento" },
      { text: "Guias de Demanda", icon: <ListAlt fontSize="small" />,       path: "/guias-demanda" },
      { text: "Pedidos",          icon: <RequestPage fontSize="small" />,   path: "/compras" },
      { text: "Saldo Contratos",  icon: <Category fontSize="small" />,      path: "/saldos-contratos-modalidades" },
      { text: "Dashboard PNAE",   icon: <Agriculture fontSize="small" />,   path: "/pnae/dashboard" },
    ],
  },
  {
    category: "Entregas",
    items: [
      { text: "Gestão de Rotas", icon: <Business fontSize="small" />,      path: "/gestao-rotas" },
      { text: "Romaneio",        icon: <Print fontSize="small" />,         path: "/romaneio" },
      { text: "Entregas",        icon: <LocalShipping fontSize="small" />, path: "/entregas" },
      { text: "Comprovantes",    icon: <Description fontSize="small" />,   path: "/comprovantes-entrega" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Central", icon: <Inventory fontSize="small" />, path: "/estoque-central" },
      { text: "Estoque Escolar", icon: <School fontSize="small" />,    path: "/estoque-escolar" },
    ],
  },
  {
    category: "Configurações",
    items: [
      { text: "Instituição", icon: <Settings fontSize="small" />, path: "/configuracao-instituicao" },
      { text: "Usuários", icon: <AdminPanelSettings fontSize="small" />, path: "/gerenciamento-usuarios", adminOnly: true },
    ],
  },
];

// ── Subitem (folha do menu) ───────────────────────────────────────────────────
const SubItem: React.FC<{
  item: any;
  isActive: boolean;
  onClick: (path: string) => void;
  collapsed: boolean;
}> = ({ item, isActive, onClick, collapsed }) => {
  const theme = useTheme();

  const btn = (
    <ListItemButton
      onClick={() => onClick(item.path)}
      sx={{
        pl: collapsed ? 0 : 3.5,
        pr: 1,
        py: 0.6,
        mx: collapsed ? 0.5 : 1,
        borderRadius: 1,
        justifyContent: collapsed ? "center" : "flex-start",
        bgcolor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
        color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
        borderLeft: isActive && !collapsed ? `3px solid ${theme.palette.sidebarSelection ?? "#4ade80"}` : "3px solid transparent",
        "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "#fff" },
        transition: "all 0.15s",
        minHeight: 34,
      }}
    >
      <ListItemIcon sx={{ color: "inherit", minWidth: collapsed ? 0 : 26, justifyContent: "center" }}>
        {item.icon}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{ fontSize: "0.78rem", fontWeight: isActive ? 600 : 400 }}
        />
      )}
    </ListItemButton>
  );

  if (collapsed) {
    return (
      <ListItem disablePadding sx={{ mb: 0.25 }}>
        <Tooltip title={item.text} placement="right" arrow>
          {btn}
        </Tooltip>
      </ListItem>
    );
  }

  return <ListItem disablePadding sx={{ mb: 0.1 }}>{btn}</ListItem>;
};

// ── Grupo accordion ───────────────────────────────────────────────────────────
const CategoryGroup: React.FC<{
  category: string;
  items: any[];
  location: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  defaultOpen?: boolean;
}> = ({ category, items, location, onNavigate, collapsed, defaultOpen = false }) => {
  const theme = useTheme();
  const hasActive = items.some(i => location === i.path || (i.path !== "/" && location.startsWith(i.path)));
  const [open, setOpen] = useState(defaultOpen || hasActive);

  // Abrir automaticamente se uma rota filha ficar ativa
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);

  const icon = CATEGORY_ICONS[category] ?? <AppsIcon fontSize="small" />;

  // Modo colapsado: tooltip com lista de subitens ao hover no ícone da categoria
  if (collapsed) {
    return (
      <Box sx={{ mb: 0.5 }}>
        <Tooltip
          title={
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 0.5, opacity: 0.7 }}>
                {category}
              </Typography>
              {items.map(i => (
                <Box
                  key={i.path}
                  onClick={() => onNavigate(i.path)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1, py: 0.4, px: 0.5,
                    cursor: "pointer", borderRadius: 0.5,
                    "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
                    color: location === i.path || (i.path !== "/" && location.startsWith(i.path)) ? "#4ade80" : "inherit",
                  }}
                >
                  {i.icon}
                  <Typography variant="caption">{i.text}</Typography>
                </Box>
              ))}
            </Box>
          }
          placement="right"
          arrow
          componentsProps={{ tooltip: { sx: { bgcolor: "#1e293b", p: 1.5, maxWidth: 200 } } }}
        >
          <ListItemButton
            sx={{
              justifyContent: "center",
              mx: 0.5,
              py: 1,
              borderRadius: 1,
              color: hasActive ? "#fff" : "rgba(255,255,255,0.55)",
              bgcolor: hasActive ? "rgba(255,255,255,0.12)" : "transparent",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "#fff" },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 0, justifyContent: "center" }}>
              {icon}
            </ListItemIcon>
          </ListItemButton>
        </Tooltip>
      </Box>
    );
  }

  // Modo expandido: accordion normal
  return (
    <Box sx={{ mb: 0.25 }}>
      {/* Cabeçalho da categoria */}
      <ListItemButton
        onClick={() => setOpen(o => !o)}
        sx={{
          px: 2,
          py: 0.75,
          mx: 0.5,
          borderRadius: 1,
          color: hasActive ? "#fff" : "rgba(255,255,255,0.55)",
          bgcolor: hasActive && !open ? "rgba(255,255,255,0.08)" : "transparent",
          "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: "#fff" },
          transition: "all 0.15s",
        }}
      >
        <ListItemIcon sx={{ color: "inherit", minWidth: 28, justifyContent: "center" }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={category}
          primaryTypographyProps={{
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "inherit",
          }}
        />
        {open ? <ExpandLess sx={{ fontSize: 16, opacity: 0.7 }} /> : <ExpandMore sx={{ fontSize: 16, opacity: 0.7 }} />}
      </ListItemButton>

      {/* Subitens */}
      <Collapse in={open} timeout={180} unmountOnExit>
        <List dense disablePadding sx={{ pb: 0.5 }}>
          {items.map(item => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <SubItem
                key={item.path}
                item={item}
                isActive={isActive}
                onClick={onNavigate}
                collapsed={false}
              />
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
};

// ── Layout principal ──────────────────────────────────────────────────────────
const LayoutModerno: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { configModuloSaldo, loading: loadingConfig, onConfigChanged } = useConfigContext();
  const { hasRecentChange, showChangeIndicator } = useConfigChangeIndicator();
  const { user, loading: loadingUser } = useCurrentUser();
  const { pageTitle, backPath } = usePageTitle();

  useEffect(() => {
    if (onConfigChanged) onConfigChanged(showChangeIndicator);
  }, [onConfigChanged, showChangeIndicator]);

  const menuConfig = getMenuConfig(configModuloSaldo);

  const handleDrawerToggle = useCallback(() => setMobileOpen(p => !p), []);
  const handleCollapseToggle = useCallback(() => {
    setCollapsed((p: boolean) => {
      const v = !p;
      localStorage.setItem("sidebar-collapsed", JSON.stringify(v));
      return v;
    });
  }, []);
  const handleLogout = () => logout();
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  }, [navigate, isMobile]);

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.sidebar" }}>
      {/* Logo */}
      <Box sx={{
        p: collapsed ? 1 : 2,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgba(0,0,0,0.2)",
        minHeight: 56,
      }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "white", fontSize: collapsed ? "0.85rem" : "1.1rem" }}>
          {collapsed ? "NL" : "NutriLog"}
        </Typography>
      </Box>

      {hasRecentChange && !loadingConfig && (
        <Box sx={{ mx: 1, mt: 1, p: 1, bgcolor: "success.main", color: "success.contrastText", borderRadius: 1, fontSize: "0.75rem", textAlign: "center" }}>
          ✅ Menu atualizado!
        </Box>
      )}

      {/* Menu com scroll */}
      <Box sx={{
        flexGrow: 1, overflow: "auto", py: 1, minHeight: 0,
        "&::-webkit-scrollbar": { width: "4px" },
        "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: "2px" },
      }}>
        {loadingConfig ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: "rgba(255,255,255,0.7)" }} />
          </Box>
        ) : (
          <List dense disablePadding>
            {menuConfig.map(({ category, items }) => (
              <CategoryGroup
                key={category}
                category={category}
                items={items.filter((i: any) => !i.adminOnly || user?.tipo === "admin")}
                location={location.pathname}
                onNavigate={handleNavigation}
                collapsed={collapsed}
                defaultOpen={category === "Principal"}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Rodapé */}
      <Box sx={{ p: 1, borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
        {/* Botão expandir/colapsar — sempre visível no desktop */}
        <IconButton
          onClick={handleCollapseToggle}
          size="small"
          sx={{
            display: { xs: "none", md: "flex" },
            width: "100%",
            borderRadius: 1,
            color: "rgba(255,255,255,0.7)",
            justifyContent: "center",
            py: 0.75,
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "#fff" },
          }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        {/* Botão Sair — só no modo expandido */}
        {!collapsed && (
          <Button
            onClick={handleLogout}
            size="small"
            startIcon={<Logout fontSize="small" />}
            sx={{
              mt: 0.5, width: "100%", textTransform: "none", fontSize: "0.8rem",
              color: "rgba(255,255,255,0.7)", justifyContent: "flex-start",
              minHeight: 32, px: 1.5,
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "#fff" },
            }}
          >
            Sair
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box component="nav" sx={{ width: { md: collapsed ? collapsedDrawerWidth : drawerWidth }, flexShrink: { md: 0 }, transition: "width 0.25s ease" }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: drawerWidth, bgcolor: "background.sidebar" } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: collapsed ? collapsedDrawerWidth : drawerWidth,
              borderRight: "1px solid", borderColor: "divider",
              bgcolor: "background.sidebar",
              transition: "width 0.25s ease",
              overflowX: "hidden",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Header */}
      <Box
        component="header"
        sx={{
          position: "fixed", top: 0,
          left: { xs: 0, md: collapsed ? collapsedDrawerWidth : drawerWidth },
          right: 0, height: 56,
          bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider",
          display: "flex", alignItems: "center", px: 2, zIndex: 1200,
          transition: "left 0.25s ease",
        }}
      >
        <IconButton onClick={handleDrawerToggle} sx={{ display: { xs: "block", md: "none" }, color: "text.secondary", mr: 1.5 }}>
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: "flex", alignItems: "center", flex: 1, gap: 1 }}>
          {backPath && (
            <IconButton size="small" onClick={() => backPath === "__back__" ? navigate(-1) : navigate(backPath)} sx={{ color: "text.secondary" }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          {pageTitle && (
            <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary" }}>{pageTitle}</Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {loadingUser ? <CircularProgress size={16} /> : user ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>Logado como:</Typography>
              <Typography variant="body2" fontWeight="medium" color="text.primary">{user.nome}</Typography>
            </>
          ) : null}
        </Box>
      </Box>

      {/* Conteúdo */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
          minHeight: "100vh", bgcolor: "background.default",
          transition: "width 0.25s ease",
          pt: "56px",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default LayoutModerno;
