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
  QrCode2,
  Settings,
  Description,
  Agriculture,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { getLogo } from "../theme/theme";
import { useConfigContext } from "../context/ConfigContext";
import { useConfigChangeIndicator } from "../hooks/useConfigChangeIndicator";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { usePageTitle } from "../contexts/PageTitleContext";


const drawerWidth = 200;
const collapsedDrawerWidth = 80;

// Função para gerar configuração do menu baseada nas configurações do sistema
const getMenuConfig = (configModuloSaldo: any) => {
  const saldoItems = [];

  // Sempre mostrar apenas Saldo por Modalidades
  saldoItems.push(
    { text: "Saldo de Contratos", icon: <Category />, path: "/saldos-contratos-modalidades", isPrimary: true }
  );

  return [
    {
      category: "Principal",
      items: [
        { text: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
        { text: "Gerenciamento de Demandas", icon: <RequestPage />, path: "/demandas" },
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
      category: "Estoque",
      items: [
        { text: "Estoque Escolar", icon: <Inventory />, path: "/estoque-escolar" },
      ],
    },
    {
      category: "Planejamento",
      items: [
        { text: "Cardápios", icon: <MenuBook />, path: "/cardapios" },
        { text: "Nutricionistas", icon: <Restaurant />, path: "/nutricionistas" },
      ],
    },
    {
      category: "Compras",
      items: [
        { text: "Fornecedores", icon: <Business />, path: "/fornecedores" },
        { text: "Contratos", icon: <Assignment />, path: "/contratos" },
        { text: "Compras", icon: <LocalShipping />, path: "/compras" },
        ...saldoItems,
        { text: "Dashboard PNAE", icon: <Agriculture />, path: "/pnae/dashboard" },
      ],
    },
    {
      category: "Guias",
      items: [
        { text: "Guias de Demanda", icon: <ListAlt />, path: "/guias-demanda" },
        { text: "Romaneio de Entrega", icon: <Print />, path: "/romaneio" },
        { text: "Gestão de Rotas", icon: <Business />, path: "/gestao-rotas" },
        { text: "Entregas", icon: <LocalShipping />, path: "/entregas" },
        { text: "Comprovantes", icon: <Description />, path: "/comprovantes-entrega" },
      ],
    },
    {
      category: "Configurações",
      items: [
        { text: "Instituição", icon: <Settings />, path: "/configuracao-instituicao" },
      ],
    },
  ];
};

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
            color: isActive ? theme.palette.sidebarSelection : 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: isActive ? theme.palette.sidebarSelection : 'rgba(255, 255, 255, 1)',
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
          color: isActive ? theme.palette.sidebarSelection : 'rgba(255, 255, 255, 0.7)',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            color: isActive ? theme.palette.sidebarSelection : 'rgba(255, 255, 255, 1)',
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
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                {item.text}
              </Typography>
              {item.isPrimary && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    flexShrink: 0
                  }}
                />
              )}
            </Box>
          }
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

  // Carregar configurações do módulo de saldo
  const { configModuloSaldo, loading: loadingConfig, onConfigChanged } = useConfigContext();

  // Indicador de mudanças recentes
  const { hasRecentChange, showChangeIndicator } = useConfigChangeIndicator();

  // Dados do usuário atual
  const { user, loading: loadingUser } = useCurrentUser();
  const { pageTitle } = usePageTitle();

  // Configurar callback para mostrar indicador quando config mudar
  useEffect(() => {
    if (onConfigChanged) {
      onConfigChanged(showChangeIndicator);
    }
  }, [onConfigChanged, showChangeIndicator]);

  // Gerar menu baseado nas configurações
  const menuConfig = getMenuConfig(configModuloSaldo);

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
      {/* LOGO - FIXO NO TOPO */}
      <Box sx={{
        p: collapsed ? 1 : 2,
        borderBottom: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.2)',
      }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'white',
            fontSize: collapsed ? '0.9rem' : '1.25rem',
            letterSpacing: '0.5px',
          }}
        >
          NutriLog
        </Typography>
      </Box>

      {/* Indicador de mudanças recentes */}
      {hasRecentChange && !loadingConfig && (
        <Box sx={{
          mx: 1,
          mt: 1,
          p: 1,
          bgcolor: 'success.main',
          color: 'success.contrastText',
          borderRadius: 1,
          fontSize: '0.75rem',
          textAlign: 'center',
          animation: 'fadeInOut 3s ease-in-out',
          '@keyframes fadeInOut': {
            '0%': { opacity: 0, transform: 'translateY(-10px)' },
            '20%': { opacity: 1, transform: 'translateY(0)' },
            '80%': { opacity: 1, transform: 'translateY(0)' },
            '100%': { opacity: 0, transform: 'translateY(-10px)' }
          }
        }}>
          ✅ Menu atualizado!
        </Box>
      )}

      {/* MENU COM SCROLL - MEIO */}
      <Box sx={{
        flexGrow: 1,
        overflow: "auto",
        py: 1,
        minHeight: 0,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(255, 255, 255, 0.3)',
        },
      }}>
        {loadingConfig ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 4,
            transition: 'all 0.3s ease-in-out'
          }}>
            <CircularProgress size={24} sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            {!collapsed && (
              <Typography variant="caption" sx={{ ml: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
                Carregando configurações...
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{
            transition: 'all 0.3s ease-in-out',
            opacity: loadingConfig ? 0 : 1
          }}>
            {menuConfig.map(({ category, items }) => (
              <Box key={category} sx={{ mb: collapsed ? 0 : 1 }}>
                {!collapsed && category !== "Principal" && (
                  <Box sx={{
                    px: 2,
                    py: 0.75,
                    borderBottom: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    mb: 0.5
                  }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: "500",
                        color: 'rgba(255, 255, 255, 0.5)',
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
                  {items
                    .filter((item) => !item.adminOnly || user?.tipo === 'admin')
                    .map((item) => {
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
        )}
      </Box>

      {/* BOTÃO SAIR - FIXO NO FUNDO */}
      <Box sx={{
        p: collapsed ? 1 : 1.5,
        borderTop: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            onClick={handleLogout}
            size="small"
            startIcon={collapsed ? undefined : <Logout fontSize="small" />}
            sx={{
              flex: 1,
              textTransform: 'none',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)',
              justifyContent: collapsed ? 'center' : 'flex-start',
              minHeight: '32px',
              minWidth: collapsed ? '40px' : 'auto',
              px: collapsed ? 1 : 1.5,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            {collapsed ? <Logout fontSize="small" /> : 'Sair'}
          </Button>
          
          {/* Botão de colapsar/expandir - apenas desktop */}
          <IconButton
            onClick={handleCollapseToggle}
            size="small"
            sx={{
              display: { xs: 'none', md: 'flex' },
              color: 'rgba(255, 255, 255, 0.7)',
              minWidth: collapsed ? '40px' : '32px',
              minHeight: '32px',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 1)',
              },
            }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Menu Lateral */}
      <Box component="nav" sx={{
        width: { md: collapsed ? collapsedDrawerWidth : drawerWidth },
        flexShrink: { md: 0 },
        transition: 'width 0.3s ease-in-out'
      }}>
        {/* Drawer Mobile */}
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
            }
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Drawer Desktop */}
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
              overflowX: 'hidden'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Header fixo - começa após o menu lateral */}
      <Box
        component="header"
        sx={{
          position: "fixed",
          top: 0,
          left: { xs: 0, md: collapsed ? collapsedDrawerWidth : drawerWidth },
          right: 0,
          height: 56,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          zIndex: 1200,
          transition: 'left 0.3s ease-in-out',
        }}
      >
        {/* Botão de menu apenas no mobile */}
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            display: { xs: 'block', md: 'none' },
            color: 'text.secondary',
            mr: 1.5,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {pageTitle && (
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {pageTitle}
            </Typography>
          )}
        </Box>

        {/* Informações do usuário */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {loadingUser ? (
            <CircularProgress size={16} />
          ) : user ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Logado como:
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="text.primary">
                {user.nome}
              </Typography>
            </>
          ) : null}
        </Box>
      </Box>

      {/* Conteúdo principal */}
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
