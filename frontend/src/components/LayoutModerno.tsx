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
  Chip,
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
  ChevronLeft,
  ChevronRight,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { getLogo } from "../theme/theme";
import ThemeToggle from "./ThemeToggle";

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

// Estrutura de Dados Aprimorada
const menuConfig = [
  {
    category: "Principal",
    items: [
      { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
      { text: "Demandas SEMED", icon: <RequestPage />, path: "/demandas", badge: "Novo!", badgeColor: "success" },
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
    category: "Compras",
    items: [
      { text: "Fornecedores", icon: <Business />, path: "/fornecedores" },
      { text: "Contratos", icon: <Assignment />, path: "/contratos" },
      { text: "Pedidos", icon: <LocalShipping />, path: "/pedidos", badge: "Novo!", badgeColor: "success" },
      { text: "Saldo por Modalidade", icon: <Category />, path: "/saldos-contratos-modalidades", badge: "Novo!", badgeColor: "success" },
    ],
  },
  {
    category: "Estoque",
    items: [
      { text: "Estoque Escolar", icon: <Assessment />, path: "/estoque-escolar", badge: "Novo!", badgeColor: "primary" },
    ],
  },
  {
    category: "Guias",
    items: [
      { text: "Guias de Demanda", icon: <ListAlt />, path: "/guias-demanda" },
      { text: "Entregas", icon: <LocalShipping />, path: "/entregas", badge: "Novo!", badgeColor: "success" },
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
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 2,
        }}
      >
        <ListItemIcon sx={{ 
          color: 'inherit', 
          minWidth: collapsed ? 'auto' : 40,
          justifyContent: 'center'
        }}>
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <>
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
          </>
        )}
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
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: 'background.paper' }}>
      <Box sx={{ 
        p: collapsed ? 1 : 3, 
        textAlign: "center", 
        borderBottom: 1, 
        borderColor: 'divider',
        transition: 'all 0.3s ease-in-out'
      }}>
        <Box sx={{ 
          width: collapsed ? 40 : 80, 
          height: collapsed ? 40 : 80, 
          mx: "auto", 
          mb: collapsed ? 0 : 1,
          transition: 'all 0.3s ease-in-out'
        }}>
          <img
            src={getLogo(theme.palette.mode === 'dark')}
            alt="Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </Box>
        {!collapsed && (
          <>
            <Typography
              variant="h5"
              fontWeight="700"
              sx={{
                mb: 0,
                color: 'text.primary',
                fontSize: '1.3rem',
                letterSpacing: '0.5px'
              }}
            >
              NutriEscola
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.8rem',
                lineHeight: 1.2,
                color: 'text.secondary',
                fontWeight: 400,
                letterSpacing: '0.3px'
              }}
            >
              Gestão Alimentar Escolar
            </Typography>
          </>
        )}

      </Box>

      <Box sx={{ 
        flexGrow: 1, 
        overflow: "auto", 
        p: 1,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(0,0,0,0.3)',
        },
      }}>
        {menuConfig.map(({ category, items }) => (
          <Box key={category} sx={{ mb: collapsed ? 1 : 2 }}>
            {!collapsed && (
              <Typography variant="overline" sx={{ px: 2, py: 1, display: "block", fontWeight: "bold", color: 'text.secondary', fontSize: "0.7rem" }}>
                {category}
              </Typography>
            )}
            <List dense>
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

      <Box sx={{ p: collapsed ? 1 : 2, borderTop: 1, borderColor: 'divider', position: 'relative' }}>
        {!collapsed && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, textAlign: 'center' }}>
            © {new Date().getFullYear()} Sistema de Gestão
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', gap: 1, flexDirection: collapsed ? 'column' : 'row' }}>
          <Button
            onClick={handleLogout}
            size="small"
            startIcon={collapsed ? undefined : <Logout fontSize="small" />}
            color="inherit"
            sx={{ 
              flex: collapsed ? 'none' : 1,
              textTransform: 'none', 
              fontSize: '0.75rem', 
              color: 'text.secondary', 
              justifyContent: collapsed ? 'center' : 'flex-start',
              minHeight: '32px',
              minWidth: collapsed ? '40px' : 'auto',
              px: collapsed ? 1 : 2,
            }}
          >
            {collapsed ? <Logout fontSize="small" /> : 'Sair'}
          </Button>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
            <ThemeToggle />
          </Box>
        </Box>

        {/* Botão de colapsar - apenas no desktop */}
        {!isMobile && (
          <IconButton
            onClick={handleCollapseToggle}
            sx={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              width: 40,
              height: 40,
              '&:hover': {
                bgcolor: 'action.hover',
              },
              zIndex: 1301,
            }}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>


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
              bgcolor: 'background.paper',
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
              bgcolor: 'background.paper',
              transition: 'width 0.3s ease-in-out',
              overflow: 'visible',
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
        }}
      >
        {/* Botão de menu flutuante para mobile */}
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 1300,
            display: { xs: "flex", md: "none" },
            bgcolor: "background.paper",
            boxShadow: 2,
            "&:hover": {
              bgcolor: "action.hover",
            },
          }}
        >
          <MenuIcon />
        </IconButton>
        
        <Box>{children}</Box>
      </Box>
    </Box>
  );
};

export default LayoutModerno;