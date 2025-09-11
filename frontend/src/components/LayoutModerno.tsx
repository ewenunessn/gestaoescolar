import React, { useState, useMemo, useCallback } from "react";
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
  Settings,
  AccountCircle,
  Logout,
  ShoppingCart,
  Storage,
  Calculate,
  Assessment,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { useCarrinho } from "../context/CarrinhoContext";

const drawerWidth = 280;

// Estrutura de Dados Aprimorada
const menuConfig = [
  {
    category: "Principal",
    items: [
      { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
    ],
  },
  {
    category: "Cadastros",
    items: [
      { text: "Escolas", icon: <School />, path: "/escolas" },
      { text: "Modalidades", icon: <Category />, path: "/modalidades" },
      { text: "Produtos", icon: <Inventory />, path: "/produtos" },
      { text: "Refeições", icon: <Restaurant />, path: "/refeicoes" },
    ],
  },
  {
    category: "Planejamento",
    items: [
      { text: "Cardápios", icon: <MenuBook />, path: "/cardapios" },
      { text: "Gerar Demanda", icon: <Calculate />, path: "/gerar-demanda", badge: "Novo!", badgeColor: "success" },
    ],
  },
  {
    category: "Compras & Recebimento",
    items: [
      { text: "Fornecedores", icon: <Business />, path: "/fornecedores" },
      { text: "Contratos", icon: <Assignment />, path: "/contratos" },
      { text: "Saldos de Contratos", icon: <Assessment />, path: "/saldos-contratos", badge: "Novo!", badgeColor: "primary" },
      { text: "Catálogo", icon: <Category />, path: "/catalogo", badge: "Novo!", badgeColor: "primary" },
      { text: "Carrinho", icon: <ShoppingCart />, path: "/carrinho", showCartBadge: true },
      { text: "Pedidos", icon: <Assignment />, path: "/pedidos", badge: "Novo!", badgeColor: "success" },
      { text: "Recebimentos", icon: <LocalShipping />, path: "/recebimento-simples" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Central", icon: <Storage />, path: "/estoque-central", badge: "Novo!", badgeColor: "success" },
      { text: "Estoque Escolar", icon: <Assessment />, path: "/estoque-escolar", badge: "Novo!", badgeColor: "primary" },
    ],
  },
];

interface NavItemProps {
  item: any;
  isActive: boolean;
  totalItensCarrinho: number;
  onClick: (path: string) => void;
}

// Subcomponente para Item do Menu
const NavItem: React.FC<NavItemProps> = ({ item, isActive, totalItensCarrinho, onClick }) => {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        onClick={() => onClick(item.path)}
        sx={{
          borderRadius: 2,
          mx: 1,
          bgcolor: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
          color: isActive ? 'primary.main' : 'text.secondary',
          '&:hover': {
            bgcolor: 'rgba(79, 70, 229, 0.05)',
            color: 'primary.main',
          },
          transition: "all 0.2s ease-in-out",
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
          {item.showCartBadge ? (
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
            fontWeight: isActive ? 600 : 500,
            fontFamily: 'Inter, sans-serif'
          }}
        />
        {item.badge && (
          <Chip
            label={item.badge}
            size="small"
            color={item.badgeColor as any}
            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
          />
        )}
      </ListItemButton>
    </ListItem>
  );
};

const LayoutModerno: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { itens } = useCarrinho();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const totalItensCarrinho = useMemo(() => itens.length, [itens]);

  const handleDrawerToggle = useCallback(() => setMobileOpen(prev => !prev), []);
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    handleMenuClose();
    logout();
  };
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [navigate, isMobile]);

  const currentTitle = useMemo(() => {
    for (const category of menuConfig) {
      for (const item of category.items) {
        if (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) {
          return item.text;
        }
      }
    }
    return "Dashboard";
  }, [location.pathname]);

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: '#f8fafc' }}>
      <Box sx={{ p: 3, textAlign: "center", borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <Avatar sx={{ width: 60, height: 60, mx: "auto", mb: 2, bgcolor: "primary.main" }}>
          <Restaurant fontSize="large" />
        </Avatar>
        <Typography variant="h6" fontWeight="600" color="text.primary">
          Gestão Escolar
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
        {menuConfig.map(({ category, items }) => (
          <Box key={category} sx={{ mb: 2 }}>
            <Typography variant="overline" sx={{ px: 2, py: 1, display: "block", fontWeight: "bold", color: 'text.secondary', fontSize: "0.7rem" }}>
              {category}
            </Typography>
            <List dense>
              {items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavItem
                    key={item.text}
                    item={item}
                    isActive={isActive}
                    totalItensCarrinho={totalItensCarrinho}
                    onClick={handleNavigation}
                  />
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          © {new Date().getFullYear()} Sistema de Gestão
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          color: "text.primary",
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2, display: { md: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {currentTitle}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Carrinho">
              <IconButton color="inherit" onClick={() => handleNavigation("/carrinho")}>
                <Badge badgeContent={totalItensCarrinho} color="primary">
                  <ShoppingCart />
                </Badge>
              </IconButton>
            </Tooltip>
            <IconButton onClick={handleMenuClick} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light" }}><AccountCircle /></Avatar>
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { borderRadius: 2, mt: 1 } }}>
              <MenuItem onClick={handleMenuClose}><ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>Meu Perfil</MenuItem>
              <MenuItem onClick={handleMenuClose}><ListItemIcon><Settings fontSize="small" /></ListItemIcon>Configurações</MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}><ListItemIcon><Logout fontSize="small" /></ListItemIcon>Sair</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: drawerWidth }}}>
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)', // Borda sutil adicionada
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "#f8fafc", // Fundo do conteúdo principal ligeiramente diferente do menu
        }}
      >
        <Toolbar />
        <Box>{children}</Box>
      </Box>
    </Box>
  );
};

export default LayoutModerno;