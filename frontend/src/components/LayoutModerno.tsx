import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Popover,
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
  Receipt,
  Settings,
  AccountCircle,
  Logout,
  ShoppingCart,
  Warning,
  Storage,
  LocationOn,
  Route,
  Calculate,
  Assessment,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { useCarrinho } from "../context/CarrinhoContext";

const drawerWidth = 280;

interface LayoutModernoProps {
  children: React.ReactNode;
}

const menuItems = [
  {
    text: "Dashboard",
    icon: <Dashboard />,
    path: "/dashboard",
    category: "principal",
  },
  {
    text: "Escolas",
    icon: <School />,
    path: "/escolas",
    category: "cadastros",
  },

  {
    text: "Modalidades",
    icon: <Category />,
    path: "/modalidades",
    category: "cadastros",
  },
  {
    text: "Produtos",
    icon: <Inventory />,
    path: "/produtos",
    category: "cadastros",
  },
  {
    text: "Refeições",
    icon: <Restaurant />,
    path: "/refeicoes",
    category: "cadastros",
  },
  {
    text: "Cardápios",
    icon: <MenuBook />,
    path: "/cardapios",
    category: "planejamento",
  },
  {
    text: "Gerar Demanda",
    icon: <Calculate />,
    path: "/gerar-demanda",
    category: "planejamento",
    badge: "Novo!",
    badgeColor: "success",
  },
  {
    text: "Fornecedores",
    icon: <Business />,
    path: "/fornecedores",
    category: "compras",
  },
  {
    text: "Contratos",
    icon: <Assignment />,
    path: "/contratos",
    category: "compras",
  },
  {
    text: "Saldos de Contratos",
    icon: <Assessment />,
    path: "/saldos-contratos",
    category: "compras",
    badge: "Novo!",
    badgeColor: "primary",
  },

  {
    text: "Catálogo",
    icon: <Category />,
    path: "/catalogo",
    category: "compras",
    badge: "Novo!",
    badgeColor: "primary",
  },
  {
    text: "Carrinho",
    icon: <ShoppingCart />,
    path: "/carrinho",
    category: "compras",
    showCartBadge: true,
  },
  {
    text: "Pedidos",
    icon: <Assignment />,
    path: "/pedidos",
    category: "compras",
    badge: "Novo!",
    badgeColor: "success",
  },
  {
    text: "Recebimentos",
    icon: <LocalShipping />,
    path: "/recebimento-simples",
    category: "compras",
  },
  {
    text: "Estoque Moderno",
    icon: <Storage />,
    path: "/estoque-moderno",
    category: "estoque",
    badge: "Novo!",
    badgeColor: "success",
  },
  {
    text: "Estoque Consolidado",
    icon: <Assessment />,
    path: "/estoque-consolidado",
    category: "estoque",
    badge: "Novo!",
    badgeColor: "primary",
  },

];

const categories = {
  principal: { label: "Principal", color: "primary.main" },
  cadastros: { label: "Cadastros", color: "secondary.main" },
  planejamento: { label: "Planejamento", color: "info.main" },
  compras: { label: "Compras & Recebimento", color: "success.main" },
  estoque: { label: "Estoque", color: "warning.main" },
};

const LayoutModerno: React.FC<LayoutModernoProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // Estado de alertas removido temporariamente
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { itens } = useCarrinho();
  // Alertas removidos temporariamente

  // Calcular número de itens únicos no carrinho
  const totalItensCarrinho = itens.length;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  // Funções de alertas removidas temporariamente

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo/Header */}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          textAlign: "center",
        }}
      >
        <Avatar
          sx={{
            width: 60,
            height: 60,
            mx: "auto",
            mb: 2,
            bgcolor: "rgba(255,255,255,0.2)",
          }}
        >
          <Restaurant fontSize="large" />
        </Avatar>
        <Typography variant="h6" fontWeight="bold">
          Alimentação Escolar
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Sistema de Gestão
        </Typography>
      </Box>

      {/* Menu Items */}
      <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
        {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
          const categoryItems = menuItems.filter(
            (item) => item.category === categoryKey
          );

          if (categoryItems.length === 0) return null;

          return (
            <Box key={categoryKey} sx={{ mb: 2 }}>
              <Typography
                variant="overline"
                sx={{
                  px: 2,
                  py: 1,
                  display: "block",
                  fontWeight: "bold",
                  color: categoryInfo.color,
                  fontSize: "0.75rem",
                }}
              >
                {categoryInfo.label}
              </Typography>
              <List dense>
                {categoryItems.map((item) => {
                  // Lógica melhorada para detectar item ativo
                  let isActive = location.pathname === item.path;

                  // Para recebimentos, considerar todas as rotas relacionadas
                  if (item.path === "/recebimento-simples") {
                    isActive = location.pathname.startsWith("/recebimento-simples") ||
                      location.pathname.startsWith("/recebimento-simplificado") ||
                      location.pathname === "/recebimentos";
                  }

                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                      <ListItemButton
                        onClick={() => handleNavigation(item.path)}
                        sx={{
                          borderRadius: 2,
                          mx: 1,
                          bgcolor: isActive ? "primary.main" : "transparent",
                          color: isActive ? "white" : "text.primary",
                          "&:hover": {
                            bgcolor: isActive ? "primary.dark" : "action.hover",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <ListItemIcon
                          sx={{
                            color: isActive ? "white" : "text.secondary",
                            minWidth: 40,
                          }}
                        >
                          {(item as any).showCartBadge ? (
                            <Badge badgeContent={totalItensCarrinho} color="primary">
                              {item.icon}
                            </Badge>
                          ) : (
                            item.icon
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{
                            fontSize: "0.9rem",
                            fontWeight: isActive ? "bold" : "normal",
                          }}
                        />
                        {item.badge && (
                          <Chip
                            label={item.badge}
                            size="small"
                            color={item.badgeColor as any}
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          © 2025 Sistema de Alimentação Escolar
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: "white",
          color: "text.primary",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text ||
              "Dashboard"}
          </Typography>

          {/* Status Indicators */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            <Tooltip title="Itens no Carrinho">
              <IconButton color="primary" onClick={() => handleNavigation("/carrinho")}>
                <Badge badgeContent={totalItensCarrinho} color="primary">
                  <ShoppingCart />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Recebimentos em Andamento removido */}

            {/* Alertas de estoque removidos temporariamente */}

            {/* Alertas removidos temporariamente */}
          </Box>

          {/* User Menu */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuClick}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              Meu Perfil
            </MenuItem>
            <MenuItem onClick={handleMenuClose}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Configurações
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>

          {/* Popover de alertas removido temporariamente */}
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid rgba(0,0,0,0.1)",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "#f8fafc",
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default LayoutModerno;