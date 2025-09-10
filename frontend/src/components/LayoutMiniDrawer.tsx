import * as React from 'react';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import {
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
} from '@mui/icons-material';
import {
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Chip,
  useMediaQuery,
  Popover,
} from '@mui/material';
import { useNavigate, useLocation } from "react-router-dom";
import { logout } from "../services/auth";
import { useCarrinho } from "../context/CarrinhoContext";

const drawerWidth = 280;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  variants: [
    {
      props: ({ open }) => open,
      style: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      },
    },
  ],
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    variants: [
      {
        props: ({ open }) => open,
        style: {
          ...openedMixin(theme),
          '& .MuiDrawer-paper': openedMixin(theme),
        },
      },
      {
        props: ({ open }) => !open,
        style: {
          ...closedMixin(theme),
          '& .MuiDrawer-paper': closedMixin(theme),
        },
      },
    ],
  }),
);

interface LayoutMiniDrawerProps {
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
    path: "/recebimentos",
    category: "compras",
  },
  {
    text: "Estoque Central",
    icon: <Storage />,
    path: "/estoque-moderno",
    category: "estoque",
    badge: "Novo!",
    badgeColor: "success",
  },
];

const categories = {
  principal: { label: "Principal", color: "primary.main" },
  cadastros: { label: "Cadastros", color: "secondary.main" },
  planejamento: { label: "Planejamento", color: "info.main" },
  compras: { label: "Compras & Recebimento", color: "success.main" },
  estoque: { label: "Estoque", color: "warning.main" },
};

export default function LayoutMiniDrawer({ children }: LayoutMiniDrawerProps) {
  const theme = useTheme();
  
  // Estado persistente do drawer usando localStorage
  const [open, setOpen] = React.useState(() => {
    const savedState = localStorage.getItem('drawerOpen');
    return savedState !== null ? JSON.parse(savedState) : true; // Padrão: aberto
  });
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  // Estado de alertas removido temporariamente
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { itens } = useCarrinho();
  // Alertas removidos temporariamente
  
  const totalItensCarrinho = itens.length;

  const handleDrawerOpen = () => {
    setOpen(true);
    localStorage.setItem('drawerOpen', 'true');
  };

  const handleDrawerClose = () => {
    setOpen(false);
    localStorage.setItem('drawerOpen', 'false');
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

  // Função de alertas removida temporariamente

  // Funções de alertas removidas temporariamente

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open} sx={{ bgcolor: "white", color: "text.primary" }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[
              {
                marginRight: 5,
              },
              open && { display: 'none' },
            ]}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find((item) => item.path === location.pathname)?.text || "Dashboard"}
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
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          {open && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexGrow: 1, 
              ml: 1, 
              mr: 1,
              minWidth: 0 // Permite que o conteúdo seja comprimido se necessário
            }}>
              <Avatar sx={{ 
                bgcolor: "primary.main", 
                mr: 1.5,
                width: 36,
                height: 36,
                flexShrink: 0 // Impede que o avatar seja comprimido
              }}>
                <Restaurant fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  sx={{ 
                    fontSize: '1rem',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  Alimentação Escolar
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block'
                  }}
                >
                  Sistema de Gestão
                </Typography>
              </Box>
            </Box>
          )}
          <IconButton onClick={handleDrawerClose} sx={{ flexShrink: 0 }}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        <Divider />

        {/* Menu Items */}
        {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
          const categoryItems = menuItems.filter(
            (item) => item.category === categoryKey
          );

          if (categoryItems.length === 0) return null;

          return (
            <Box key={categoryKey}>
              {open && (
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
              )}
              <List dense>
                {categoryItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                      <ListItemButton
                        onClick={() => handleNavigation(item.path)}
                        sx={[
                          {
                            minHeight: 48,
                            px: 2.5,
                            bgcolor: isActive ? "primary.main" : "transparent",
                            color: isActive ? "white" : "text.primary",
                            "&:hover": {
                              bgcolor: isActive ? "primary.dark" : "action.hover",
                            },
                            borderRadius: open ? 2 : 0,
                            mx: open ? 1 : 0,
                            mb: open ? 0.5 : 0,
                          },
                          open
                            ? {
                                justifyContent: 'initial',
                              }
                            : {
                                justifyContent: 'center',
                              },
                        ]}
                      >
                        <ListItemIcon
                          sx={[
                            {
                              minWidth: 0,
                              justifyContent: 'center',
                              color: isActive ? "white" : "text.secondary",
                            },
                            open
                              ? {
                                  mr: 3,
                                }
                              : {
                                  mr: 'auto',
                                },
                          ]}
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
                          sx={[
                            open
                              ? {
                                  opacity: 1,
                                }
                              : {
                                  opacity: 0,
                                },
                          ]}
                          primaryTypographyProps={{
                            fontSize: "0.9rem",
                            fontWeight: isActive ? "bold" : "normal",
                          }}
                        />
                        {item.badge && open && (
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
              <Divider />
            </Box>
          );
        })}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: "#f8fafc", minHeight: "100vh" }}>
        <DrawerHeader />
        {children}
      </Box>

      {/* User Menu */}
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
    </Box>
  );
}