import React, { useState, useCallback } from "react";
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

  useTheme,
  useMediaQuery,
  Button,
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
  Calculate,
  Assessment,
  ListAlt,
  RequestPage,

  Settings,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { getLogo } from "../theme/theme";


const drawerWidth = 200;
const collapsedDrawerWidth = 80;

// Estrutura de Dados Aprimorada
const menuConfig = [
  {
    category: "Principal",
    items: [
      { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
      { text: "Demandas SEMED", icon: <RequestPage />, path: "/demandas" },
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
      { text: "Gerar Demanda", icon: <Calculate />, path: "/gerar-demanda" },
    ],
  },
  {
    category: "Compras",
    items: [
      { text: "Fornecedores", icon: <Business />, path: "/fornecedores" },
      { text: "Contratos", icon: <Assignment />, path: "/contratos" },
      { text: "Pedidos", icon: <LocalShipping />, path: "/pedidos" },
      { text: "Saldo por Modalidade", icon: <Category />, path: "/saldos-contratos-modalidades" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Escolar", icon: <Assessment />, path: "/estoque-escolar" },
    ],
  },
  {
    category: "Guias",
    items: [
      { text: "Guias de Demanda", icon: <ListAlt />, path: "/guias-demanda" },
      { text: "Gestão de Rotas", icon: <Business />, path: "/gestao-rotas" },
      { text: "Configuração de Entrega", icon: <Settings />, path: "/configuracao-entrega" },
      { text: "Entregas", icon: <LocalShipping />, path: "/entregas" },
    ],
  },
];

interface NavItemProps {
  item: any;
  isActive: boolean;
  onClick: (path: string) => void;
  collapsed: boolean;
}

// Subcomponente para Item do Menu
const NavItem: React.FC<NavItemProps> = ({ item, isActive, onClick, collapsed }) => {
  const theme = useTheme();

  if (collapsed) {
    // Modo colapsado - ícone + texto embaixo com barra lateral
    return (
      <ListItem disablePadding sx={{ mb: 0.5, position: 'relative' }}>
        {/* Barra lateral para item ativo */}
        {isActive && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              bgcolor: theme.palette.sidebarSelection,
              zIndex: 1,
            }}
          />
        )}
        <ListItemButton
          onClick={() => onClick(item.path)}
          sx={{
            mx: 0.5,
            bgcolor: 'transparent',
            color: isActive ? theme.palette.sidebarSelection : 'text.secondary',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              color: isActive ? theme.palette.sidebarSelection : 'text.primary',
            },
            transition: "all 0.2s ease-in-out",
            justifyContent: 'center',
            px: 0.5,
            py: 1.5,
            minHeight: 56,
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
            {item.icon}
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.7rem",
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'Inter, sans-serif',
              textAlign: 'center',
              lineHeight: 1.1,
              maxWidth: '100%',
              wordBreak: 'break-word',
              hyphens: 'auto',
            }}
          >
            {item.text}
          </Typography>
        </ListItemButton>
      </ListItem>
    );
  }

  // Modo expandido - ícone + texto na horizontal
  return (
    <ListItem disablePadding sx={{ mb: 0, position: 'relative' }}>
      {/* Barra lateral para item ativo */}
      {isActive && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: theme.palette.sidebarSelection,
            zIndex: 1,
          }}
        />
      )}
      <ListItemButton
        onClick={() => onClick(item.path)}
        sx={{
          mx: 1,
          bgcolor: 'transparent',
          color: isActive ? theme.palette.sidebarSelection : 'text.secondary',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.04)',
            color: isActive ? theme.palette.sidebarSelection : 'text.primary',
          },
          transition: "all 0.2s ease-in-out",
          justifyContent: 'flex-start',
          px: 2,
          py: 0.75,
          minHeight: 36,
        }}
      >
        <ListItemIcon sx={{
          color: 'inherit',
          minWidth: 28,
          justifyContent: 'center'
        }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.8rem",
            fontWeight: isActive ? 600 : 400,
            fontFamily: 'Inter, sans-serif'
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

const LayoutModerno: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleDrawerToggle = useCallback(() => setMobileOpen(prev => !prev), []);
  const handleCollapseToggle = useCallback(() => {
    setCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebar-collapsed', JSON.stringify(newValue));
      return newValue;
    });
  }, []);
  const handleLogout = () => {
    logout();
  };
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
    // O estado collapsed deve permanecer inalterado
  }, [navigate, isMobile]);



  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: 'background.sidebar' }}>
      {/* Espaço para o header fixo */}
      <Box sx={{ height: 56 }} />

      <Box sx={{
        flexGrow: 1,
        overflow: "auto",
        py: 1,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'action.disabled',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'action.hover',
        },
      }}>
        {menuConfig.map(({ category, items }) => (
          <Box key={category} sx={{ mb: collapsed ? 0 : 1 }}>
            {!collapsed && category !== "Principal" && (
              <Box sx={{
                px: 2,
                py: 0.75,
                borderBottom: 1,
                borderColor: 'divider',
                mb: 0.5
              }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: "500",
                    color: 'text.disabled',
                    fontSize: "0.7rem",
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px'
                  }}
                >
                  {category}
                </Typography>
              </Box>
            )}
            <List dense sx={{ py: 0 }}>
              {items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavItem
                    key={item.text}
                    item={item}
                    isActive={isActive}
                    onClick={handleNavigation}
                    collapsed={collapsed}
                  />
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{
        p: collapsed ? 1 : 1.5,
        borderTop: 1,
        borderColor: 'divider',
        position: 'relative'
      }}>
        <Box sx={{ display: 'flex', gap: 1, flexDirection: collapsed ? 'column' : 'row', alignItems: 'center' }}>
          <Button
            onClick={handleLogout}
            size="small"
            startIcon={collapsed ? undefined : <Logout fontSize="small" />}
            sx={{
              flex: collapsed ? 'none' : 1,
              textTransform: 'none',
              fontSize: '0.8rem',
              color: 'text.secondary',
              justifyContent: collapsed ? 'center' : 'flex-start',
              minHeight: '32px',
              minWidth: collapsed ? '40px' : 'auto',
              px: collapsed ? 1 : 1.5,
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            {collapsed ? <Logout fontSize="small" /> : 'Sair'}
          </Button>


        </Box>


      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Header fixo no topo */}
      <Box
        component="header"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          zIndex: 1300,
        }}
      >
        <IconButton
          onClick={isMobile ? handleDrawerToggle : handleCollapseToggle}
          sx={{
            color: 'text.secondary',
            mr: 1.5,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={getLogo()}
            alt="Logo"
            style={{
              height: '40px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
        </Box>
      </Box>

      <Box component="nav" sx={{
        width: { md: collapsed ? collapsedDrawerWidth : drawerWidth },
        flexShrink: { md: 0 },
        transition: 'width 0.3s ease-in-out'
      }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              bgcolor: 'background.sidebar',
              pt: '56px', // Espaço para o header fixo
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: collapsed ? collapsedDrawerWidth : drawerWidth,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.sidebar',
              transition: 'width 0.3s ease-in-out',
              overflow: 'visible',
              pt: '56px', // Espaço para o header fixo
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
          width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
          minHeight: "100vh",
          bgcolor: "background.default",
          position: "relative",
          transition: 'width 0.3s ease-in-out',
          pt: '56px', // Espaço para o header fixo
        }}
      >
        <Box>{children}</Box>
      </Box>
    </Box>
  );
};

export default LayoutModerno;