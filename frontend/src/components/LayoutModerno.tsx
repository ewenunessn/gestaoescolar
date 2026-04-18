import React, { useState, useCallback, useEffect } from "react";
import {
  Box, Drawer, List, Typography, IconButton, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Collapse, Tooltip, useTheme, useMediaQuery,
  Button, CircularProgress, AppBar, Toolbar, InputBase,
} from "@mui/material";
import {
  Menu as MenuIcon, Dashboard, School, Category, Inventory, Restaurant,
  MenuBook, Business, Assignment, LocalShipping, Logout, ListAlt, RequestPage,
  Print, Settings, Description, Agriculture, Calculate,
  ExpandLess, ExpandMore, Apps as AppsIcon, AdminPanelSettings, CalendarToday, HomeWork,
  NotificationsActive, Schedule, Search as SearchIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { useConfigContext } from "../context/ConfigContext";
import { useConfigChangeIndicator } from "../hooks/useConfigChangeIndicator";
import { useUserRole } from "../hooks/useUserRole";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { SeletorPeriodo } from './SeletorPeriodo';
import { NotificacoesProvider } from '../contexts/NotificacoesContext';
import { NotificacoesEscolaProvider } from '../contexts/NotificacoesEscolaContext';
import NotificacoesMenu from './NotificacoesMenu';
import NotificacoesEscolaMenu from './NotificacoesEscolaMenu';
import { GlobalSearchDropdown, useGlobalSearch } from './GlobalSearch';

const drawerWidth = 240;
const collapsedDrawerWidth = 72;

// ═══════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Gowen Dark Mode
// Clean, modern sidebar com estilo cyberpunk sutil (cyan neon)
// ═══════════════════════════════════════════════════════════════

const DESIGN_TOKENS = {
  bg: {
    primary: "#0d0d0d",      // Fundo principal — quase preto
    secondary: "#1a1a1a",    // Fundo dos cards/itens
    elevated: "#222222",     // Itens elevados/hover
    accent: "#2a2a2a",       // Hover mais intenso
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    medium: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.15)",
  },
  text: {
    primary: "#f0f0f0",      // Texto principal
    secondary: "#888",       // Texto secundário
    muted: "#666",           // Texto esmaecido
    accent: "#777",
  },
  accent: {
    primary: "#00bfff",      // Ciano neon — cor principal
    secondary: "#33ccff",    // Ciano mais claro
    success: "#22c55e",      // Verde ativo
    warning: "#f59e0b",      // Âmbar/âmbar
    danger: "#ef4444",       // Vermelho
  },
  glow: {
    cyan: "0 0 20px rgba(0,191,255,0.15)",
    subtle: "0 2px 8px rgba(0, 0, 0, 0.3)",
  }
};

const SIDEBAR_BG = DESIGN_TOKENS.bg.primary;
const CANVAS = DESIGN_TOKENS.bg.secondary;
const BORDER = DESIGN_TOKENS.border.subtle;
const BORDER_MD = DESIGN_TOKENS.border.medium;
const TEXT = DESIGN_TOKENS.text.primary;
const MUTED = DESIGN_TOKENS.text.secondary;
const SUB = DESIGN_TOKENS.text.muted;
const CYAN = DESIGN_TOKENS.accent.primary;
const CYAN_DIM = `${DESIGN_TOKENS.accent.primary}20`;
const GREEN = DESIGN_TOKENS.accent.success;
const GREEN_DIM = `${DESIGN_TOKENS.accent.success}20`;
const RED = DESIGN_TOKENS.accent.danger;

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
  // Dashboard como item standalone (sem categoria)
  {
    standalone: true,
    item: { text: "Dashboard", icon: <Dashboard fontSize="small" />, path: "/dashboard" }
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

// ─── SubItem com estilo clean e moderno ───
const SubItem: React.FC<{
  item: any; isActive: boolean; onClick: (path: string) => void; collapsed: boolean;
}> = ({ item, isActive, onClick, collapsed }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const btn = (
    <ListItemButton
      onClick={() => onClick(item.path)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        pl: collapsed ? 0 : 3, 
        pr: 2, 
        py: 1.25, 
        mx: collapsed ? 0.5 : 1.5, 
        my: 0.5,
        borderRadius: "12px",
        minWidth: 40,
        minHeight: 44,
        justifyContent: collapsed ? "center" : "flex-start",
        position: "relative",
        bgcolor: isActive ? `${DESIGN_TOKENS.accent.primary}15` : "transparent",
        color: isActive ? DESIGN_TOKENS.accent.primary : DESIGN_TOKENS.text.secondary,
        transition: "all 0.2s ease",
        "&:hover": { 
          bgcolor: DESIGN_TOKENS.bg.elevated,
          color: DESIGN_TOKENS.text.primary,
          transform: "translateX(2px)",
        },
      }}
    >
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.875rem",
            fontWeight: isActive ? 500 : 400,
            letterSpacing: "0.01em",
          }}
        />
      )}
    </ListItemButton>
  );
  
  return collapsed ? (
    <Tooltip 
      title={item.text} 
      placement="right"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: DESIGN_TOKENS.bg.elevated,
            color: DESIGN_TOKENS.text.primary,
            fontSize: "0.8rem",
            py: 0.75,
            px: 1.5,
            borderRadius: "10px",
            boxShadow: DESIGN_TOKENS.glow.subtle,
          }
        }
      }}
    >
      {btn}
    </Tooltip>
  ) : btn;
};

// ─── StandaloneItem - Item sem categoria (como Dashboard) ───
const StandaloneItem: React.FC<{
  item: any; location: string; onNavigate: (path: string) => void; collapsed: boolean;
}> = ({ item, location, onNavigate, collapsed }) => {
  const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
  
  const btn = (
    <ListItemButton
      onClick={() => onNavigate(item.path)}
      sx={{
        pl: collapsed ? 0 : 2, 
        pr: 2, 
        py: 1.5, 
        mx: collapsed ? 0.5 : 1.5, 
        my: 0.5,
        borderRadius: "12px",
        minWidth: 44,
        minHeight: 48,
        justifyContent: collapsed ? "center" : "flex-start",
        bgcolor: isActive ? `${DESIGN_TOKENS.accent.primary}15` : "transparent",
        color: isActive ? DESIGN_TOKENS.accent.primary : DESIGN_TOKENS.text.secondary,
        transition: "all 0.2s ease",
        "&:hover": { 
          bgcolor: DESIGN_TOKENS.bg.elevated,
          color: DESIGN_TOKENS.text.primary,
        },
      }}
    >
      <ListItemIcon sx={{ 
        color: "inherit", 
        minWidth: collapsed ? 0 : 40,
        justifyContent: "center",
      }}>
        {item.icon}
      </ListItemIcon>
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.9rem",
            fontWeight: isActive ? 500 : 400,
            letterSpacing: "0.01em",
          }}
        />
      )}
    </ListItemButton>
  );
  
  return collapsed ? (
    <Tooltip 
      title={item.text} 
      placement="right"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: DESIGN_TOKENS.bg.elevated,
            color: DESIGN_TOKENS.text.primary,
            fontSize: "0.8rem",
            py: 0.75,
            px: 1.5,
            borderRadius: "10px",
            boxShadow: DESIGN_TOKENS.glow.subtle,
          }
        }
      }}
    >
      {btn}
    </Tooltip>
  ) : btn;
};

// ─── CategoryGroup com estilo clean e moderno ───
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
        borderTop: isFirst ? "none" : `1px solid ${DESIGN_TOKENS.border.subtle}`,
        pt: isFirst ? 0 : 2,
        mt: isFirst ? 0 : 1,
        mx: 0.5,
      }}>
        <Tooltip
          title={
            <Box>
              <Typography variant="caption" sx={{ 
                fontWeight: 600, 
                display: "block", 
                mb: 1.5, 
                color: DESIGN_TOKENS.text.primary, 
                fontSize: "0.75rem", 
                textTransform: "uppercase", 
                letterSpacing: "0.5px",
                pb: 0.75,
                borderBottom: `1px solid ${DESIGN_TOKENS.border.subtle}`,
              }}>
                {category}
              </Typography>
              {items.map(i => {
                const active = location === i.path || (i.path !== "/" && location.startsWith(i.path));
                return (
                  <Box key={i.path} onClick={() => onNavigate(i.path)} sx={{
                    display: "flex", 
                    alignItems: "center", 
                    gap: 1.5, 
                    py: 1, 
                    px: 1.5,
                    cursor: "pointer", 
                    borderRadius: "10px",
                    bgcolor: active ? DESIGN_TOKENS.bg.secondary : "transparent",
                    "&:hover": { 
                      bgcolor: DESIGN_TOKENS.bg.elevated,
                    },
                    color: active ? DESIGN_TOKENS.text.primary : DESIGN_TOKENS.text.secondary,
                    transition: "all 0.2s ease",
                  }}>
                    {i.icon}
                    <Typography variant="caption" sx={{ fontSize: "0.8rem", fontWeight: active ? 500 : 400 }}>
                      {i.text}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          }
          placement="right"
          componentsProps={{
            tooltip: {
              sx: {
                bgcolor: DESIGN_TOKENS.bg.elevated, 
                p: 1.5, 
                maxWidth: 240,
                borderRadius: "12px",
                boxShadow: DESIGN_TOKENS.glow.subtle,
              },
            },
          }}
        >
          <ListItemButton sx={{
            justifyContent: "center", 
            mx: 0.5, 
            px: 1.5, 
            py: 1.5, 
            minWidth: 44, 
            borderRadius: "12px",
            color: hasActive ? DESIGN_TOKENS.text.primary : DESIGN_TOKENS.text.muted,
            bgcolor: hasActive ? DESIGN_TOKENS.bg.secondary : "transparent",
            "&:hover": { 
              bgcolor: DESIGN_TOKENS.bg.elevated,
              color: DESIGN_TOKENS.text.primary,
            },
            transition: "all 0.2s ease",
          }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 0, justifyContent: "center" }}>
              {icon}
            </ListItemIcon>
          </ListItemButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{
      borderTop: isFirst ? "none" : `1px solid ${DESIGN_TOKENS.border.subtle}`,
      pt: isFirst ? 0 : 2,
      mt: isFirst ? 0 : 1,
    }}>
      <ListItemButton 
        onClick={() => setOpen(o => !o)} 
        sx={{
          px: 2, 
          py: 1, 
          mx: 1.5, 
          mb: 0.5,
          borderRadius: "12px",
          color: DESIGN_TOKENS.text.muted,
          bgcolor: "transparent",
          "&:hover": { 
            bgcolor: DESIGN_TOKENS.bg.secondary,
            color: DESIGN_TOKENS.text.secondary,
          },
          transition: "all 0.2s ease",
          minHeight: 40,
        }}
      >
        <ListItemIcon sx={{ 
          color: "inherit", 
          minWidth: 36, 
          justifyContent: "center",
        }}>
          {icon}
        </ListItemIcon>
        <ListItemText 
          primary={category} 
          primaryTypographyProps={{
            fontSize: "0.75rem", 
            fontWeight: 600,
            color: "inherit",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }} 
        />
        <Box sx={{
          transition: "transform 0.2s ease",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          display: "flex",
          alignItems: "center",
        }}>
          <ExpandMore sx={{ 
            fontSize: 20, 
            opacity: 0.5,
          }} />
        </Box>
      </ListItemButton>
      <Collapse in={open} timeout={200} unmountOnExit>
        <List dense disablePadding sx={{ pb: 0.5 }}>
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
  const { hasLeitura, loading: loadingPerms } = useUserPermissions();

  useEffect(() => { if (onConfigChanged) onConfigChanged(showChangeIndicator); }, [onConfigChanged, showChangeIndicator]);

  // Mapa de módulo → slug de permissão
  const MODULO_SLUGS: Record<string, string> = {
    'Dashboard': 'dashboard',
    'Escolas': 'escolas',
    'Modalidades': 'modalidades',
    'Produtos': 'produtos',
    'Nutricionistas': 'nutricionistas',
    'Fornecedores': 'fornecedores',
    'Contratos': 'contratos',
    'Preparações': 'preparacoes',
    'Cardápios': 'cardapios',
    'Tipos de Refeição': 'tipos_refeicao',
    'Planejamento': 'planejamento_compras',
    'Guias de Demanda': 'demandas',
    'Pedidos': 'pedidos',
    'Saldo Contratos': 'saldo_contratos',
    'Dashboard PNAE': 'pnae',
    'Gestão de Rotas': 'rotas',
    'Romaneio': 'romaneio',
    'Entregas': 'entregas',
    'Comprovantes': 'comprovantes',
    'Estoque Central': 'estoque',
    'Estoque Escolar': 'estoque',
    'Solicitações Recebidas': 'solicitacoes',
    'Instituição': 'configuracoes',
    'Calendário Letivo': 'calendario',
    'Períodos': 'periodos',
    'Usuários': 'usuarios',
    'Disparos': 'notificacoes',
  };

  // Filtrar menu por permissões
  const menuConfig = isEscolaUser ? MENU_ESCOLA : (() => {
    const base = getMenuConfig(configModuloSaldo);
    return base.map(cat => {
      // Se for standalone, não precisa filtrar items
      if (cat.standalone) {
        return cat;
      }
      // Se for categoria, filtrar items
      return {
        ...cat,
        items: cat.items?.filter((item: any) => {
          // adminOnly: manter filtro existente
          if (item.adminOnly && !isAdmin) return false;
          // Se não tem slug mapeado, mostrar (fallback)
          const slug = MODULO_SLUGS[item.text];
          if (!slug) return true;
          // Admin sempre vê tudo
          if (isAdmin) return true;
          // Verificar permissão de leitura
          return hasLeitura(slug);
        }) || [],
      };
    }).filter(cat => cat.standalone || (cat.items && cat.items.length > 0)); // remover categorias vazias
  })();

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

  const search = useGlobalSearch();

  // Drawer para mobile (sempre expandido, com botão sair visível)
  const mobileDrawer = (
    <Box sx={{
      height: "100%", display: "flex", flexDirection: "column",
      bgcolor: SIDEBAR_BG,
    }}>
      {/* ── Brand Header removed — logo moved to AppBar ── */}

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
        flexGrow: 1, 
        overflow: "auto", 
        py: 1, 
        minHeight: 0,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, ${DESIGN_TOKENS.accent.primary}05 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${DESIGN_TOKENS.accent.primary}03 0%, transparent 50%)
          `,
          pointerEvents: "none",
          zIndex: 0,
        },
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-thumb": { 
          background: DESIGN_TOKENS.border.medium,
          borderRadius: "3px",
          "&:hover": {
            background: DESIGN_TOKENS.border.strong,
          }
        },
        "&::-webkit-scrollbar-track": { 
          background: DESIGN_TOKENS.bg.primary,
        },
      }}>
        {loadingConfig ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: MUTED }} />
          </Box>
        ) : (
          <List dense disablePadding>
            {menuConfig.map((config: any, index: number) => {
              if (config.standalone) {
                // Renderizar item standalone (Dashboard)
                return (
                  <StandaloneItem
                    key={config.item.path}
                    item={config.item}
                    location={location.pathname}
                    onNavigate={(path) => {
                      handleNavigation(path);
                      handleDrawerToggle();
                    }}
                    collapsed={false}
                  />
                );
              } else {
                // Renderizar categoria normal
                return (
                  <CategoryGroup
                    key={config.category}
                    category={config.category}
                    items={config.items.filter((i: any) => !i.adminOnly || isAdmin)}
                    location={location.pathname}
                    onNavigate={(path) => {
                      handleNavigation(path);
                      handleDrawerToggle();
                    }}
                    collapsed={false}
                    defaultOpen={config.category === "Portal Escola"}
                    isFirst={index === 1} // Primeira categoria após Dashboard
                  />
                );
              }
            })}
          </List>
        )}
      </Box>

      {/* ── Footer com botão Sair ── */}
      <Box sx={{
        flexShrink: 0,
        borderTop: `1px solid ${DESIGN_TOKENS.border.subtle}`,
        bgcolor: DESIGN_TOKENS.bg.primary,
        py: 1.5, 
        px: 1.5,
      }}>
        <Button onClick={handleLogout} size="small" startIcon={
          <Logout sx={{ fontSize: 20, color: DESIGN_TOKENS.accent.danger }} />
        } sx={{
          width: "100%", 
          textTransform: "none",
          fontSize: "0.875rem", 
          minHeight: 44, 
          px: 2,
          borderRadius: "12px", 
          justifyContent: "flex-start",
          color: DESIGN_TOKENS.text.muted, 
          letterSpacing: "0.3px",
          fontWeight: 400,
          "&:hover": { 
            bgcolor: `${DESIGN_TOKENS.accent.danger}20`,
            color: DESIGN_TOKENS.accent.danger,
          },
          transition: "all 0.2s ease",
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
      {/* ── Brand Header removed — logo moved to AppBar ── */}

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
        flexGrow: 1, 
        overflow: "auto", 
        py: 1, 
        minHeight: 0,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, ${DESIGN_TOKENS.accent.primary}05 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${DESIGN_TOKENS.accent.primary}03 0%, transparent 50%)
          `,
          pointerEvents: "none",
          zIndex: 0,
        },
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-thumb": { 
          background: DESIGN_TOKENS.border.medium,
          borderRadius: "3px",
          "&:hover": {
            background: DESIGN_TOKENS.border.strong,
          }
        },
        "&::-webkit-scrollbar-track": { 
          background: DESIGN_TOKENS.bg.primary,
        },
      }}>
        {loadingConfig ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} sx={{ color: MUTED }} />
          </Box>
        ) : (
          <List dense disablePadding>
            {menuConfig.map((config: any, index: number) => {
              if (config.standalone) {
                // Renderizar item standalone (Dashboard)
                return (
                  <StandaloneItem
                    key={config.item.path}
                    item={config.item}
                    location={location.pathname}
                    onNavigate={handleNavigation}
                    collapsed={collapsed}
                  />
                );
              } else {
                // Renderizar categoria normal
                return (
                  <CategoryGroup
                    key={config.category}
                    category={config.category}
                    items={config.items.filter((i: any) => !i.adminOnly || isAdmin)}
                    location={location.pathname}
                    onNavigate={handleNavigation}
                    collapsed={collapsed}
                    defaultOpen={config.category === "Portal Escola"}
                    isFirst={index === 1} // Primeira categoria após Dashboard
                  />
                );
              }
            })}
          </List>
        )}
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        flexShrink: 0,
        borderTop: `1px solid ${DESIGN_TOKENS.border.subtle}`,
        bgcolor: DESIGN_TOKENS.bg.primary,
        py: 1.5, 
        px: 1.5,
      }}>
        <IconButton onClick={handleCollapseToggle} size="small" sx={{
          display: { xs: "none", md: "flex" }, 
          width: "100%",
          borderRadius: "12px", 
          py: 1.25, 
          minHeight: 44,
          color: DESIGN_TOKENS.text.muted,
          justifyContent: "flex-start", 
          px: 2,
          "&:hover": { 
            bgcolor: DESIGN_TOKENS.bg.secondary,
            color: DESIGN_TOKENS.text.secondary,
          },
          transition: "all 0.2s ease",
        }}>
          <MenuIcon sx={{ fontSize: 20, mr: collapsed ? 0 : 1.5 }} />
          {!collapsed && (
            <Typography sx={{ 
              fontSize: "0.875rem", 
              letterSpacing: "0.3px",
              fontWeight: 400,
            }}>
              Recolher menu
            </Typography>
          )}
        </IconButton>
        {!collapsed && (
          <Button onClick={handleLogout} size="small" startIcon={
            <Logout sx={{ fontSize: 20, color: DESIGN_TOKENS.accent.danger }} />
          } sx={{
            mt: 0.75, 
            width: "100%", 
            textTransform: "none",
            fontSize: "0.875rem", 
            minHeight: 44, 
            px: 2,
            borderRadius: "12px", 
            justifyContent: "flex-start",
            color: DESIGN_TOKENS.text.muted, 
            letterSpacing: "0.3px",
            fontWeight: 400,
            "&:hover": { 
              bgcolor: `${DESIGN_TOKENS.accent.danger}20`,
              color: DESIGN_TOKENS.accent.danger,
            },
            transition: "all 0.2s ease",
          }}>
            Sair
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar - Header bar no topo */}
      <AppBar
        position="fixed"
        sx={{
          width: "100%",
          bgcolor: DESIGN_TOKENS.bg.primary,
          borderBottom: `1px solid ${DESIGN_TOKENS.border.subtle}`,
          boxShadow: "none",
          transition: "width 0.25s ease, margin 0.25s ease",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, md: 64 }, gap: 2 }}>
          {/* Logo no header */}
          <Box
            component="img"
            src="/nutrilog_logo_v2.svg"
            alt="NutriLog"
            sx={{
              height: 36,
              width: "auto",
              objectFit: "contain",
              mr: 2,
            }}
          />
          <IconButton
            color="inherit"
            aria-label="abrir menu"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { xs: "block", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Barra de busca global */}
          <Box sx={{ 
            flexGrow: 1, 
            maxWidth: { xs: "100%", md: 480 },
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}>
            <Box sx={{
              borderRadius: "12px",
              bgcolor: DESIGN_TOKENS.bg.secondary,
              border: `1px solid ${search.open ? DESIGN_TOKENS.accent.primary : DESIGN_TOKENS.border.subtle}`,
              boxShadow: search.open ? `0 0 0 3px ${DESIGN_TOKENS.accent.primary}20` : "none",
              "&:hover": {
                bgcolor: DESIGN_TOKENS.bg.elevated,
                border: `1px solid ${DESIGN_TOKENS.border.medium}`,
              },
              transition: "all 0.2s ease",
              width: "100%",
              display: "flex",
              alignItems: "center",
            }}>
              <Box sx={{ pl: 2, pr: 1, display: "flex", alignItems: "center", color: DESIGN_TOKENS.text.muted }}>
                <SearchIcon sx={{ fontSize: 20 }} />
              </Box>
              <InputBase
                inputRef={search.inputRef}
                value={search.query}
                onChange={e => { search.setQuery(e.target.value); search.setOpen(true); }}
                onFocus={() => search.setOpen(true)}
                onBlur={() => setTimeout(() => search.setOpen(false), 150)}
                placeholder="Buscar páginas..."
                sx={{
                  flex: 1, py: 1, pr: 2,
                  color: DESIGN_TOKENS.text.primary,
                  fontSize: "0.875rem",
                  "& input::placeholder": { color: DESIGN_TOKENS.text.muted, opacity: 1 },
                }}
              />
              <Box sx={{ 
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                mr: 1.5,
                opacity: search.open ? 0 : 0.45,
                transition: "opacity 0.2s ease",
                bgcolor: DESIGN_TOKENS.bg.accent,
                border: `1px solid ${DESIGN_TOKENS.border.medium}`,
                borderRadius: "6px",
                px: 1,
                py: 0.4,
                gap: 0.5,
              }}>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: DESIGN_TOKENS.text.muted, fontFamily: "monospace", lineHeight: 1 }}>Ctrl</Typography>
                <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: DESIGN_TOKENS.text.muted, fontFamily: "monospace", lineHeight: 1 }}>K</Typography>
              </Box>
            </Box>

            {/* Dropdown de resultados */}
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

          {/* Seletor de Período e Notificações */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
            <SeletorPeriodo />
            {isEscolaUser ? <NotificacoesEscolaMenu /> : <NotificacoesMenu />}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: collapsed ? collapsedDrawerWidth : drawerWidth }, flexShrink: { md: 0 }, transition: "width 0.25s ease" }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: drawerWidth, bgcolor: SIDEBAR_BG, mt: { xs: '56px' } } }}>
          {mobileDrawer}
        </Drawer>
        <Drawer variant="permanent" open
          sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": {
            width: collapsed ? collapsedDrawerWidth : drawerWidth,
            borderRight: `1px solid ${BORDER}`, bgcolor: SIDEBAR_BG,
            transition: "width 0.25s ease", overflowX: "hidden",
            mt: '64px', height: 'calc(100% - 64px)',
          } }}>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{
        flexGrow: 1,
        width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
        minHeight: "100vh", bgcolor: "background.default",
        transition: "width 0.25s ease",
        mt: { xs: "56px", md: "64px" }, // Margem top para não ficar atrás do AppBar
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
