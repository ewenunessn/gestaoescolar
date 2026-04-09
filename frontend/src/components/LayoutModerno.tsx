import React, { useState, useCallback, useEffect } from "react";
import {
  Box, Drawer, List, Typography, IconButton, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Collapse, Tooltip, useTheme, useMediaQuery,
  Button, CircularProgress, AppBar, Toolbar,
} from "@mui/material";
import {
  Menu as MenuIcon, Dashboard, School, Category, Inventory, Restaurant,
  MenuBook, Business, Assignment, LocalShipping, Logout, ListAlt, RequestPage,
  Print, Settings, Description, Agriculture, Calculate,
  ExpandLess, ExpandMore, Apps as AppsIcon, AdminPanelSettings, CalendarToday, HomeWork,
  NotificationsActive, Schedule,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { useConfigContext } from "../context/ConfigContext";
import { useConfigChangeIndicator } from "../hooks/useConfigChangeIndicator";
import { useUserRole } from "../hooks/useUserRole";
import { SeletorPeriodo } from './SeletorPeriodo';
import { NotificacoesProvider } from '../contexts/NotificacoesContext';
import { NotificacoesEscolaProvider } from '../contexts/NotificacoesEscolaContext';
import NotificacoesMenu from './NotificacoesMenu';
import NotificacoesEscolaMenu from './NotificacoesEscolaMenu';

const drawerWidth = 220;
const collapsedDrawerWidth = 64;

// GitHub Dark tokens
const SIDEBAR_BG = "#0d1117";
const CANVAS = "#161b22";
const BORDER = "#21262d";
const BORDER_MD = "#30363d";
const TEXT = "#e6edf3";
const MUTED = "#8b949e";
const SUB = "#6e7681";
const GREEN = "#2ea043";
const GREEN_DIM = "rgba(46,160,67,0.12)";
const RED = "#f85149";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Principal":     <Dashboard fontSize="small" />,
  "Cadastros":     <School fontSize="small" />,
  "Cardápios":     <MenuBook fontSize="small" />,
  "Compras":       <Assignment fontSize="small" />,
  "Entregas":      <LocalShipping fontSize="small" />,
  "Estoque":       <Inventory fontSize="small" />,
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

const getMenuConfig = (_cfg: any) => [
  {
    category: "Principal",
    items: [{ text: "Dashboard", icon: <Dashboard fontSize="small" />, path: "/dashboard" }],
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
      { text: "Preparações", icon: <Restaurant fontSize="small" />, path: "/preparacoes" },
      { text: "Cardápios",   icon: <MenuBook fontSize="small" />,   path: "/cardapios" },
      { text: "Tipos de Refeição", icon: <Schedule fontSize="small" />, path: "/tipos-refeicao" },
    ],
  },
  {
    category: "Compras",
    items: [
      { text: "Planejamento",     icon: <Calculate fontSize="small" />,   path: "/compras/planejamento" },
      { text: "Guias de Demanda", icon: <ListAlt fontSize="small" />,     path: "/guias-demanda" },
      { text: "Pedidos",          icon: <RequestPage fontSize="small" />, path: "/compras" },
      { text: "Saldo Contratos",  icon: <Category fontSize="small" />,    path: "/saldos-contratos-modalidades" },
      { text: "Dashboard PNAE",   icon: <Agriculture fontSize="small" />, path: "/pnae/dashboard" },
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
      { text: "Solicitações Recebidas", icon: <RequestPage fontSize="small" />, path: "/solicitacoes-alimentos" },
    ],
  },
  {
    category: "Configurações",
    items: [
      { text: "Instituição",       icon: <Settings fontSize="small" />,           path: "/configuracao-instituicao" },
      { text: "Calendário Letivo", icon: <CalendarToday fontSize="small" />,      path: "/calendario-letivo" },
      { text: "Períodos",          icon: <CalendarToday fontSize="small" />,      path: "/periodos",                adminOnly: true },
      { text: "Usuários",          icon: <AdminPanelSettings fontSize="small" />, path: "/gerenciamento-usuarios",  adminOnly: true },
      { text: "Disparos",          icon: <NotificationsActive fontSize="small" />, path: "/disparos-notificacao",   adminOnly: true },
    ],
  },
];

// ─── SubItem (sem ícones visíveis) ───
const SubItem: React.FC<{
  item: any; isActive: boolean; onClick: (path: string) => void; collapsed: boolean;
}> = ({ item, isActive, onClick, collapsed }) => {
  const btn = (
    <ListItemButton
      onClick={() => onClick(item.path)}
      sx={{
        pl: collapsed ? 0 : 1.5, pr: 1, py: 0.5, mx: 0.75, my: 0.2,
        borderRadius: "4px", minWidth: 28, minHeight: 28,
        justifyContent: collapsed ? "center" : "flex-start",
        bgcolor: isActive ? GREEN_DIM : "transparent",
        color: isActive ? GREEN : "rgba(255,255,255,0.55)",
        transition: "all 0.15s ease",
        "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: TEXT },
      }}
    >
      {isActive && !collapsed && (
        <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: GREEN, flexShrink: 0, mr: 1.5, mt: 0.5 }} />
      )}
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.76rem",
            fontWeight: isActive ? 500 : 400,
            color: "inherit",
            lineHeight: 1.2,
          }}
          sx={{ ml: 0 }}
        />
      )}
    </ListItemButton>
  );
  if (collapsed) {
    return (
      <ListItem disablePadding sx={{ mb: 0.2 }}>
        <Tooltip title={item.text} placement="right" arrow>{btn}</Tooltip>
      </ListItem>
    );
  }
  return <ListItem disablePadding sx={{ mb: 0 }}>{btn}</ListItem>;
};

// ─── CategoryGroup ───
const CategoryGroup: React.FC<{
  category: string; items: any[]; location: string;
  onNavigate: (path: string) => void; collapsed: boolean; defaultOpen?: boolean;
  isFirst?: boolean;
}> = ({ category, items, location, onNavigate, collapsed, defaultOpen = false, isFirst }) => {
  const hasActive = items.some(i => location === i.path || (i.path !== "/" && location.startsWith(i.path)));
  const [open, setOpen] = useState(defaultOpen || hasActive);

  useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

  const icon = CATEGORY_ICONS[category] ?? <AppsIcon fontSize="small" />;

  if (collapsed) {
    return (
      <Box sx={{
        borderTop: isFirst ? "none" : `1px solid ${BORDER}`,
        pt: isFirst ? 0 : 0.75,
        mt: isFirst ? 0 : 0,
        mx: 0.25,
      }}>
        <Tooltip
          title={
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 500, display: "block", mb: 0.5, color: SUB, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {category}
              </Typography>
              {items.map(i => {
                const active = location === i.path || (i.path !== "/" && location.startsWith(i.path));
                return (
                  <Box key={i.path} onClick={() => onNavigate(i.path)} sx={{
                    display: "flex", alignItems: "center", gap: 0.75, py: 0.3, px: 0.5,
                    cursor: "pointer", borderRadius: "4px",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                    color: active ? GREEN : "rgba(255,255,255,0.55)",
                  }}>
                    {i.icon}
                    <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>{i.text}</Typography>
                  </Box>
                );
              })}
            </Box>
          }
          placement="right" arrow
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: CANVAS, p: 1, maxWidth: 180,
                border: `1px solid ${BORDER_MD}`, borderRadius: "6px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
              },
            },
            arrow: { sx: { color: CANVAS } },
          }}
        >
          <ListItemButton sx={{
            justifyContent: "center", mx: 0.25, px: 1, py: 1, minWidth: 30, borderRadius: "4px",
            color: hasActive ? TEXT : "rgba(255,255,255,0.35)",
            bgcolor: hasActive ? "rgba(255,255,255,0.06)" : "transparent",
            "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: TEXT },
            transition: "all 0.15s ease",
            position: "relative",
          }}>
            {hasActive && (
              <Box sx={{ position: "absolute", left: 5, top: "50%", transform: "translateY(-50%)", width: 3, height: 3, borderRadius: "50%", bgcolor: GREEN }} />
            )}
            <ListItemIcon sx={{ color: "inherit", minWidth: 0, justifyContent: "center" }}>{icon}</ListItemIcon>
          </ListItemButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{
      borderTop: isFirst ? "none" : `1px solid ${BORDER}`,
      pt: isFirst ? 0 : 0.5,
      mt: isFirst ? 0 : 0,
    }}>
      <ListItemButton onClick={() => setOpen(o => !o)} sx={{
        px: 1.5, py: 0.55, mx: 0.75, borderRadius: "4px",
        color: hasActive ? TEXT : "rgba(255,255,255,0.35)",
        bgcolor: "transparent",
        "&:hover": { bgcolor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" },
        transition: "all 0.15s ease",
        minHeight: 32,
      }}>
        <ListItemIcon sx={{ color: "inherit", minWidth: 28, justifyContent: "center" }}>{icon}</ListItemIcon>
        <ListItemText primary={category} primaryTypographyProps={{
          fontSize: "0.7rem", fontWeight: 500,
          color: "inherit",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
        }} />
        {open ? <ExpandLess sx={{ fontSize: 14, opacity: 0.5 }} /> : <ExpandMore sx={{ fontSize: 14, opacity: 0.5 }} />}
      </ListItemButton>
      <Collapse in={open} timeout={180} unmountOnExit>
        <List dense disablePadding sx={{ pb: 0.25 }}>
          {items.map(item => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return <SubItem key={item.path} item={item} isActive={isActive} onClick={onNavigate} collapsed={false} />;
          })}
        </List>
      </Collapse>
    </Box>
  );
};

// ─── Layout Principal ───
const LayoutModernoInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(useTheme().breakpoints.down("md"));

  const { configModuloSaldo, loading: loadingConfig, onConfigChanged } = useConfigContext();
  const { hasRecentChange, showChangeIndicator } = useConfigChangeIndicator();
  const { user, loading: loadingUser, isAdmin, isEscolaUser } = useUserRole();

  useEffect(() => { if (onConfigChanged) onConfigChanged(showChangeIndicator); }, [onConfigChanged, showChangeIndicator]);

  const menuConfig = isEscolaUser ? MENU_ESCOLA : getMenuConfig(configModuloSaldo);

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

  // Determine first group name for separator logic
  const firstCategory = menuConfig.length > 0 ? menuConfig[0].category : "";

  // Drawer para mobile (sempre expandido, com botão sair visível)
  const mobileDrawer = (
    <Box sx={{
      height: "100%", display: "flex", flexDirection: "column",
      bgcolor: SIDEBAR_BG,
    }}>
      {/* ── Brand Header ── */}
      <Box sx={{
        px: 2, py: 2.5,
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
        display: "flex", alignItems: "center",
        justifyContent: "flex-start",
        bgcolor: SIDEBAR_BG,
        minHeight: 60,
      }}>
        <Box sx={{
          width: 8, height: 8, borderRadius: "50%", bgcolor: GREEN,
          flexShrink: 0,
          mr: 1.5,
          boxShadow: `0 0 8px ${GREEN}`,
        }} />
        <Typography variant="h6" sx={{
          fontWeight: 700,
          color: TEXT,
          fontSize: "0.95rem",
          letterSpacing: "0.5px",
        }}>
          NutriLog
        </Typography>
      </Box>

      {/* ── Config update indicator ── */}
      {hasRecentChange && !loadingConfig && (
        <Box sx={{
          mx: 1, mt: 1.5, py: 0.5, px: 1,
          borderRadius: "4px", fontSize: "0.7rem", textAlign: "center",
          bgcolor: GREEN_DIM, color: GREEN,
          fontWeight: 500,
        }}>
          ✓ Menu atualizado!
        </Box>
      )}

      {/* ── Menu Items ── */}
      <Box sx={{
        flexGrow: 1, overflow: "auto", py: 0.5, minHeight: 0,
        "&::-webkit-scrollbar": { width: "5px" },
        "&::-webkit-scrollbar-thumb": { background: BORDER_MD, borderRadius: "3px" },
        "&::-webkit-scrollbar-track": { background: SIDEBAR_BG },
      }}>
        {loadingConfig ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: MUTED }} />
          </Box>
        ) : (
          <List dense disablePadding>
            {menuConfig.map(({ category, items }) => (
              <CategoryGroup
                key={category}
                category={category}
                items={items.filter((i: any) => !i.adminOnly || isAdmin)}
                location={location.pathname}
                onNavigate={(path) => {
                  handleNavigation(path);
                  handleDrawerToggle(); // Fecha o drawer após navegar
                }}
                collapsed={false} // Sempre expandido no mobile
                defaultOpen={category === "Principal" || category === "Portal Escola"}
                isFirst={category === firstCategory}
              />
            ))}
          </List>
        )}
      </Box>

      {/* ── Footer com botão Sair ── */}
      <Box sx={{
        flexShrink: 0,
        borderTop: `1px solid ${BORDER}`,
        bgcolor: "rgba(0,0,0,0.12)",
        py: 0.75, px: 1,
      }}>
        <Button onClick={handleLogout} size="small" startIcon={
          <Logout sx={{ fontSize: 16, color: RED }} />
        } sx={{
          width: "100%", textTransform: "none",
          fontSize: "0.72rem", minHeight: 30, px: 1,
          borderRadius: "4px", justifyContent: "flex-start",
          color: "rgba(255,255,255,0.45)", letterSpacing: "0.3px",
          "&:hover": { bgcolor: "rgba(248,81,73,0.08)", color: RED },
          transition: "all 0.15s ease",
        }}>
          Sair
        </Button>
      </Box>
    </Box>
  );

  const drawer = (
    <Box sx={{
      height: "100%", display: "flex", flexDirection: "column",
      bgcolor: SIDEBAR_BG,
    }}>
      {/* ── Brand Header ── */}
      <Box sx={{
        px: collapsed ? 1.5 : 2, py: collapsed ? 2 : 2.5,
        borderBottom: `1px solid ${BORDER}`,
        flexShrink: 0,
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        bgcolor: SIDEBAR_BG,
        minHeight: 60,
      }}>
        <Box sx={{
          width: 8, height: 8, borderRadius: "50%", bgcolor: GREEN,
          flexShrink: 0,
          mr: collapsed ? 0 : 1.5,
          display: collapsed ? "none" : "flex",
          boxShadow: `0 0 8px ${GREEN}`,
        }} />
        <Typography variant="h6" sx={{
          fontWeight: 700,
          color: TEXT,
          fontSize: collapsed ? "0.85rem" : "0.95rem",
          letterSpacing: collapsed ? "2px" : "0.5px",
          textAlign: "center",
        }}>
          {collapsed ? "NL" : "NutriLog"}
        </Typography>
      </Box>

      {/* ── Config update indicator ── */}
      {hasRecentChange && !loadingConfig && (
        <Box sx={{
          mx: 1, mt: 1.5, py: 0.5, px: 1,
          borderRadius: "4px", fontSize: "0.7rem", textAlign: "center",
          bgcolor: GREEN_DIM, color: GREEN,
          fontWeight: 500,
        }}>
          ✓ Menu atualizado!
        </Box>
      )}

      {/* ── Menu Items ── */}
      <Box sx={{
        flexGrow: 1, overflow: "auto", py: 0.5, minHeight: 0,
        "&::-webkit-scrollbar": { width: "5px" },
        "&::-webkit-scrollbar-thumb": { background: BORDER_MD, borderRadius: "3px" },
        "&::-webkit-scrollbar-track": { background: SIDEBAR_BG },
      }}>
        {loadingConfig ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: MUTED }} />
          </Box>
        ) : (
          <List dense disablePadding>
            {menuConfig.map(({ category, items }) => (
              <CategoryGroup
                key={category}
                category={category}
                items={items.filter((i: any) => !i.adminOnly || isAdmin)}
                location={location.pathname}
                onNavigate={handleNavigation}
                collapsed={collapsed}
                defaultOpen={category === "Principal" || category === "Portal Escola"}
                isFirst={category === firstCategory}
              />
            ))}
          </List>
        )}
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        flexShrink: 0,
        borderTop: `1px solid ${BORDER}`,
        bgcolor: "rgba(0,0,0,0.12)",
        py: 0.75, px: 1,
      }}>
        <IconButton onClick={handleCollapseToggle} size="small" sx={{
          display: { xs: "none", md: "flex" }, width: "100%",
          borderRadius: "4px", py: 0.75, minHeight: 32,
          color: "rgba(255,255,255,0.45)",
          justifyContent: "flex-start", px: 1,
          "&:hover": { bgcolor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)" },
          transition: "all 0.15s ease",
        }}>
          <MenuIcon sx={{ fontSize: 16, mr: 1 }} />
          {!collapsed && (
            <Typography sx={{ fontSize: "0.72rem", letterSpacing: "0.3px" }}>
              Recolher menu
            </Typography>
          )}
        </IconButton>
        {!collapsed && (
          <Button onClick={handleLogout} size="small" startIcon={
            <Logout sx={{ fontSize: 16, color: RED }} />
          } sx={{
            mt: 0.25, width: "100%", textTransform: "none",
            fontSize: "0.72rem", minHeight: 30, px: 1,
            borderRadius: "4px", justifyContent: "flex-start",
            color: "rgba(255,255,255,0.45)", letterSpacing: "0.3px",
            "&:hover": { bgcolor: "rgba(248,81,73,0.08)", color: RED },
            transition: "all 0.15s ease",
          }}>
            Sair
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar com botão hambúrguer para mobile */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: "block", md: "none" },
          bgcolor: SIDEBAR_BG,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: "none",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: TEXT }}>
            NutriEscola
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: collapsed ? collapsedDrawerWidth : drawerWidth }, flexShrink: { md: 0 }, transition: "width 0.25s ease" }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: drawerWidth, bgcolor: SIDEBAR_BG } }}>
          {mobileDrawer}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": {
            width: collapsed ? collapsedDrawerWidth : drawerWidth,
            borderRight: `1px solid ${BORDER}`, bgcolor: SIDEBAR_BG,
            transition: "width 0.25s ease", overflowX: "hidden",
          } }}>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{
        flexGrow: 1,
        width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
        minHeight: "100vh", bgcolor: "background.default",
        transition: "width 0.25s ease",
        mt: { xs: "56px", md: 0 }, // Margem top no mobile para não ficar atrás do AppBar
      }}>
        {children}
      </Box>
    </Box>
  );
};

// Ambos os providers sempre montados — evita erro de hook fora de provider
// durante o render inicial (antes de useUserRole resolver o tipo do usuário).
const LayoutModerno: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificacoesProvider>
    <NotificacoesEscolaProvider>
      <LayoutModernoInner>{children}</LayoutModernoInner>
    </NotificacoesEscolaProvider>
  </NotificacoesProvider>
);

export default LayoutModerno;
