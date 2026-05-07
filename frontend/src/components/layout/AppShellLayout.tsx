import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  alpha,
  Badge,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  Dialog,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AppWindow,
  BellRing,
  ChevronDown,
  CircleUserRound,
  CornerDownLeft,
  LogOut,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useThemePreference } from "../../contexts/ThemeContext";
import { NotificacoesProvider } from "../../contexts/NotificacoesContext";
import { NotificacoesEscolaProvider } from "../../contexts/NotificacoesEscolaContext";
import { useConfigContext } from "../../contexts/ConfigContext";
import { logout } from "../../services/auth";
import { useConfigChangeIndicator } from "../../hooks/useConfigChangeIndicator";
import { useUserPermissions } from "../../hooks/useUserPermissions";
import { useUserRole } from "../../hooks/useUserRole";
import { usePeriodoAtivo, usePeriodos } from "../../hooks/queries/usePeriodosQueries";
import { ActivePeriodSelector } from "../navigation/ActivePeriodSelector";
import { useGlobalSearch } from "../navigation/GlobalSearch";
import NotificacoesEscolaMenu from "../NotificacoesEscolaMenu";
import NotificacoesMenu from "../NotificacoesMenu";
import { DesktopTitlebarMenu } from "./DesktopTitlebarMenu";
import { NutriLogLogo } from "./NutriLogLogo";
import {
  CATEGORY_ICONS,
  MENU_ESCOLA,
  MODULO_SLUGS,
  SETTINGS_MENU_ITEMS,
  collapsedDrawerWidth,
  compactIconProps,
  desktopTitleBarHeight,
  drawerWidth,
  getLayoutTokens,
  getMenuConfig,
  iconProps,
  navIconWidth,
  navIconWidth as fallbackNavIconWidth,
  navInset,
  navItemPaddingX,
  sidebarFontFamily,
  type LayoutTokens,
  type MenuItemConfig,
} from "./AppShellConfig";

const isActivePath = (pathname: string, path: string) => pathname === path || (path !== "/" && pathname.startsWith(path));

type GlobalSearchState = ReturnType<typeof useGlobalSearch>;

const SidebarSearchItem = ({
  collapsed,
  tokens,
  onOpen,
}: {
  collapsed: boolean;
  tokens: LayoutTokens;
  onOpen: () => void;
}) => {
  const content = (
    <ListItemButton
      onClick={onOpen}
      sx={{
        mx: navInset,
        my: 0.18,
        px: collapsed ? 1 : navItemPaddingX,
        py: 0.72,
        minHeight: 32,
        borderRadius: 1.25,
        justifyContent: collapsed ? "center" : "flex-start",
        color: tokens.textSecondary,
        backgroundColor: "transparent",
        "&:hover": {
          backgroundColor: tokens.bgElevated,
          color: tokens.textPrimary,
        },
        "&:hover .sidebar-search-shortcut": {
          opacity: 1,
        },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: collapsed ? 0 : navIconWidth,
          color: "inherit",
          justifyContent: "center",
          "& svg": { width: 15, height: 15 },
        }}
      >
        <Search {...iconProps} />
      </ListItemIcon>
      {!collapsed && (
        <>
          <ListItemText
            primary="Pesquisar"
            primaryTypographyProps={{
              fontSize: "0.82rem",
              fontWeight: 500,
            }}
          />
          <Typography
            className="sidebar-search-shortcut"
            component="span"
            sx={{
              px: 0.65,
              py: 0.12,
              borderRadius: 0.9,
              backgroundColor: tokens.bgElevated,
              color: tokens.textMuted,
              fontSize: "0.66rem",
              fontWeight: 700,
              lineHeight: 1.35,
              flexShrink: 0,
              opacity: 0,
              transition: "opacity 0.14s ease",
            }}
          >
            Ctrl+G
          </Typography>
        </>
      )}
    </ListItemButton>
  );

  return collapsed ? (
    <Tooltip title="Pesquisar (Ctrl+G)" placement="right">
      {content}
    </Tooltip>
  ) : content;
};

const SearchShortcutHint = ({
  label,
  tokens,
}: {
  label: string;
  tokens: LayoutTokens;
}) => (
  <Typography
    component="span"
    sx={{
      px: 0.6,
      py: 0.15,
      borderRadius: 0.7,
      backgroundColor: tokens.bgElevated,
      color: tokens.textMuted,
      fontSize: "0.66rem",
      fontWeight: 700,
      lineHeight: 1.35,
    }}
  >
    {label}
  </Typography>
);

const GlobalSearchDialog = ({
  search,
  tokens,
}: {
  search: GlobalSearchState;
  tokens: LayoutTokens;
}) => {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setSelected(0);
  }, [search.results]);

  useEffect(() => {
    if (!search.open) return;
    const id = window.setTimeout(() => search.inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [search.open, search.inputRef]);

  const visibleResults = search.results.slice(0, 9);
  const hasResults = visibleResults.length > 0;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => Math.min(value + 1, Math.max(visibleResults.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter" && visibleResults[selected]) {
      event.preventDefault();
      search.handleNavigate(visibleResults[selected].path);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      search.handleClose();
    }
  };

  return (
    <Dialog
      open={search.open}
      onClose={search.handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          mt: "-18vh",
          borderRadius: 2,
          border: `1px solid ${tokens.borderSubtle}`,
          backgroundColor: tokens.bgSecondary,
          boxShadow: tokens.shadow,
          overflow: "hidden",
          fontFamily: sidebarFontFamily,
          "& .MuiTypography-root, & .MuiInputBase-root": {
            fontFamily: sidebarFontFamily,
          },
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.42)",
          backdropFilter: "blur(2px)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.4, py: 1.15, borderBottom: `1px solid ${tokens.borderSubtle}` }}>
        <Search {...iconProps} />
        <InputBase
          inputRef={search.inputRef}
          value={search.query}
          onChange={(event) => {
            search.setQuery(event.target.value);
            search.setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar no sistema"
          fullWidth
          sx={{
            color: tokens.textPrimary,
            fontSize: "0.9rem",
            "& input::placeholder": {
              color: tokens.textMuted,
              opacity: 1,
            },
          }}
        />
        <Typography sx={{ px: 0.75, py: 0.25, borderRadius: 0.75, backgroundColor: tokens.bgElevated, color: tokens.textMuted, fontSize: "0.68rem", fontWeight: 700 }}>
          Esc
        </Typography>
      </Box>

      <Box sx={{ maxHeight: 420, overflowY: "auto", py: 0.7 }}>
        {search.loading ? (
          <Box sx={{ py: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 1.25 }}>
            <CircularProgress size={18} />
            <Typography sx={{ color: tokens.textMuted, fontSize: "0.82rem" }}>Buscando...</Typography>
          </Box>
        ) : !hasResults ? (
          <Box sx={{ px: 1.4, py: 2.5 }}>
            <Typography sx={{ color: tokens.textMuted, fontSize: "0.82rem" }}>
              {search.query.trim() ? "Nenhum resultado encontrado" : "Digite para buscar páginas, escolas, produtos e documentos"}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            <Typography sx={{ px: 1.5, pt: 0.7, pb: 0.45, color: tokens.textMuted, fontSize: "0.7rem", fontWeight: 700 }}>
              Resultados
            </Typography>
            {visibleResults.map((result, index) => {
              const active = index === selected;
              return (
                <ListItemButton
                  key={result.id}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => search.handleNavigate(result.path)}
                  sx={{
                    mx: 0.8,
                    mb: 0.2,
                    px: 1,
                    py: 0.65,
                    minHeight: 34,
                    borderRadius: 1,
                    color: active ? tokens.textPrimary : tokens.textSecondary,
                    backgroundColor: active ? tokens.bgElevated : "transparent",
                    "&:hover": {
                      backgroundColor: tokens.bgElevated,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: "inherit", justifyContent: "center" }}>
                    <AppWindow {...compactIconProps} />
                  </ListItemIcon>
                  <ListItemText
                    primary={result.label}
                    secondary={result.sublabel || result.category}
                    primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: active ? 650 : 500, noWrap: true }}
                    secondaryTypographyProps={{ fontSize: "0.72rem", color: tokens.textMuted, noWrap: true }}
                  />
                  {active && <CornerDownLeft size={14} strokeWidth={1.75} />}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
      <Box
        sx={{
          px: 1.4,
          py: 0.85,
          borderTop: `1px solid ${tokens.borderSubtle}`,
          display: "flex",
          alignItems: "center",
          gap: 1.1,
          color: tokens.textMuted,
        }}
      >
        <SearchShortcutHint label="↑↓" tokens={tokens} />
        <Typography sx={{ fontSize: "0.7rem", color: tokens.textMuted }}>navegar</Typography>
        <SearchShortcutHint label="Enter" tokens={tokens} />
        <Typography sx={{ fontSize: "0.7rem", color: tokens.textMuted }}>abrir</Typography>
        <SearchShortcutHint label="Esc" tokens={tokens} />
        <Typography sx={{ fontSize: "0.7rem", color: tokens.textMuted }}>fechar</Typography>
      </Box>
    </Dialog>
  );
};

const NavItem = ({
  item,
  pathname,
  onNavigate,
  collapsed,
  tokens,
  showIcon = true,
}: {
  item: { text: string; icon: React.ReactNode; path: string };
  pathname: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  tokens: LayoutTokens;
  showIcon?: boolean;
}) => {
  const active = isActivePath(pathname, item.path);
  const content = (
    <ListItemButton
      onClick={() => onNavigate(item.path)}
      sx={{
        mx: navInset,
        my: 0.18,
        px: collapsed ? 1 : navItemPaddingX,
        py: 0.72,
        minHeight: 32,
        borderRadius: 1.25,
        justifyContent: collapsed ? "center" : "flex-start",
        backgroundColor: active ? tokens.navActiveBg : "transparent",
        color: active ? tokens.navActiveText : tokens.textSecondary,
        border: 0,
        "&:hover": {
          backgroundColor: active ? tokens.navActiveBg : tokens.bgElevated,
          color: tokens.textPrimary,
        },
      }}
    >
      {showIcon && (
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : navIconWidth,
            color: "inherit",
            justifyContent: "center",
            "& svg": { width: 15, height: 15 },
          }}
        >
          {item.icon}
        </ListItemIcon>
      )}
      {!showIcon && !collapsed && <Box aria-hidden="true" sx={{ width: fallbackNavIconWidth, flexShrink: 0 }} />}
      {!collapsed && (
        <ListItemText
          primary={item.text}
          primaryTypographyProps={{
            fontSize: "0.82rem",
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

  const icon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.Principal;

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
            mx: navInset,
            my: 0.35,
            minHeight: 38,
            borderRadius: 1.25,
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
    <Box sx={{ mt: 0.65 }}>
      <ListItemButton
        onClick={() => setOpen((value) => !value)}
        sx={{
          mx: navInset,
          px: navItemPaddingX,
          py: 0.55,
          minHeight: 30,
          borderRadius: 1,
          color: hasActive ? tokens.textPrimary : tokens.textMuted,
          backgroundColor: "transparent",
          "&:hover": { backgroundColor: "transparent", color: tokens.textPrimary },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: navIconWidth,
            color: "inherit",
            justifyContent: "center",
            "& svg": { width: 15, height: 15 },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={category}
          primaryTypographyProps={{
            fontSize: "0.68rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: tokens.textMuted,
          }}
        />
        <ChevronDown
          size={15}
          strokeWidth={1.75}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.18s ease",
          }}
        />
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
              showIcon={false}
            />
          ))}
        </List>
      </Collapse>
    </Box>
  );
};

const SidebarNotifications = ({
  collapsed,
  isMobile,
  isEscolaUser,
  tokens,
}: {
  collapsed: boolean;
  isMobile: boolean;
  isEscolaUser: boolean;
  tokens: LayoutTokens;
}) => {
  const isCollapsed = collapsed && !isMobile;

  return (
    <>
      {isEscolaUser ? (
        <NotificacoesEscolaMenu
          placement="sidebar"
          renderTrigger={({ onClick, naoLidas }) => (
            <NotificationSidebarTrigger
              collapsed={isCollapsed}
              naoLidas={naoLidas}
              onClick={onClick}
              tokens={tokens}
            />
          )}
        />
      ) : (
        <NotificacoesMenu
          placement="sidebar"
          renderTrigger={({ onClick, naoLidas }) => (
            <NotificationSidebarTrigger
              collapsed={isCollapsed}
              naoLidas={naoLidas}
              onClick={onClick}
              tokens={tokens}
            />
          )}
        />
      )}
    </>
  );
};

const NotificationSidebarTrigger = ({
  collapsed,
  naoLidas,
  onClick,
  tokens,
}: {
  collapsed: boolean;
  naoLidas: number;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  tokens: LayoutTokens;
}) => (
  <Button
    onClick={onClick}
    startIcon={
      <Badge badgeContent={naoLidas || undefined} color="error" max={99}>
        <BellRing {...iconProps} />
      </Badge>
    }
    sx={{
      justifyContent: collapsed ? "center" : "flex-start",
      minWidth: 0,
      minHeight: 32,
      width: "auto",
      mx: navInset,
      my: 0.18,
      px: collapsed ? 1 : navItemPaddingX,
      py: 0.72,
      borderRadius: 1.25,
      color: tokens.textSecondary,
      backgroundColor: "transparent",
      textTransform: "none",
      "& .MuiButton-startIcon": {
        minWidth: collapsed ? 0 : navIconWidth,
        mr: collapsed ? 0 : 0,
        ml: 0,
        justifyContent: "center",
        color: tokens.textPrimary,
        "& svg": { width: 15, height: 15 },
      },
      "&:hover": {
        backgroundColor: tokens.bgElevated,
        color: tokens.textPrimary,
      },
    }}
  >
    {!collapsed && (
      <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 650, lineHeight: 1.1, color: tokens.textPrimary }}>
        Notificações
      </Typography>
    )}
  </Button>
);

const AccountSettingsMenu = ({
  collapsed,
  isMobile,
  user,
  tokens,
  settingsItems,
  onNavigate,
  onLogout,
}: {
  collapsed: boolean;
  isMobile: boolean;
  user: { nome?: string; email?: string; tipo?: string; perfil?: string } | null;
  tokens: LayoutTokens;
  settingsItems: MenuItemConfig[];
  onNavigate: (path: string) => void;
  onLogout: () => void;
}) => {
  const { mode, setTheme } = useThemePreference();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const open = Boolean(anchorEl);
  usePeriodos();
  usePeriodoAtivo();
  const displayName = user?.nome || user?.email || "Usuário";
  const displayEmail = user?.email || user?.perfil || user?.tipo || "Conta do sistema";
  const isCollapsed = collapsed && !isMobile;

  return (
    <>
      <Tooltip title={isCollapsed ? "Configurações" : ""}>
        <Button
          onClick={(event) => setAnchorEl(event.currentTarget)}
          startIcon={<Settings {...iconProps} />}
          sx={{
            justifyContent: isCollapsed ? "center" : "flex-start",
            minWidth: 0,
            minHeight: 32,
            width: "auto",
            mx: navInset,
            my: 0.18,
            px: isCollapsed ? 1 : navItemPaddingX,
            py: 0.72,
            borderRadius: 1.25,
            color: tokens.textSecondary,
            backgroundColor: open ? tokens.bgElevated : "transparent",
            textTransform: "none",
            "& .MuiButton-startIcon": {
              minWidth: isCollapsed ? 0 : navIconWidth,
              mr: isCollapsed ? 0 : 0,
              ml: 0,
              justifyContent: "center",
              color: tokens.textPrimary,
              "& svg": { width: 15, height: 15 },
            },
            "&:hover": {
              backgroundColor: tokens.bgElevated,
              color: tokens.textPrimary,
            },
          }}
        >
          {!isCollapsed && (
            <Box sx={{ minWidth: 0, textAlign: "left" }}>
              <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 650, lineHeight: 1.1, color: tokens.textPrimary }}>
                Configurações
              </Typography>
            </Box>
          )}
        </Button>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{
          sx: {
            mb: 1,
            width: 282,
            maxWidth: "calc(100vw - 24px)",
            borderRadius: 1.5,
            border: `1px solid ${tokens.borderSubtle}`,
            backgroundColor: tokens.bgSecondary,
            boxShadow: tokens.shadow,
            fontFamily: sidebarFontFamily,
            "& .MuiTypography-root, & .MuiButton-root, & .MuiMenuItem-root": {
              fontFamily: sidebarFontFamily,
            },
            "& svg": {
              flexShrink: 0,
            },
          },
        }}
      >
        <Box sx={{ px: 1.5, pt: 1.25, pb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1,
              display: "grid",
              placeItems: "center",
              backgroundColor: tokens.bgElevated,
              color: tokens.textPrimary,
              flexShrink: 0,
            }}
          >
            <CircleUserRound size={16} strokeWidth={1.75} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: "0.82rem", fontWeight: 700, color: tokens.textPrimary }}>
              {displayName}
            </Typography>
            <Typography noWrap sx={{ fontSize: "0.74rem", color: tokens.textMuted }}>
              {displayEmail}
            </Typography>
          </Box>
        </Box>
        <Divider />
        {settingsItems.length > 0 && (
          <Box sx={{ py: 0.5 }}>
            <ListItemButton
              onClick={() => setSettingsOpen((value) => !value)}
              sx={{
                mx: 0.75,
                px: 0.75,
                py: 0.65,
                minHeight: 34,
                borderRadius: 1,
                color: tokens.textMuted,
                "&:hover": {
                  backgroundColor: tokens.bgElevated,
                  color: tokens.textPrimary,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 30, color: "inherit", justifyContent: "center" }}>
                <Settings {...compactIconProps} />
              </ListItemIcon>
              <ListItemText
                primary="Configurações"
                primaryTypographyProps={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              />
              <ChevronDown
                size={15}
                strokeWidth={1.75}
                style={{
                  transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.18s ease",
                }}
              />
            </ListItemButton>
            <Collapse in={settingsOpen} timeout={180} unmountOnExit>
              <Box sx={{ pt: 0.25, pb: 0.35 }}>
                {settingsItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    onClick={() => {
                      setAnchorEl(null);
                      onNavigate(item.path);
                    }}
                    sx={{ minHeight: 36, px: 1.25, py: 0.72, fontSize: "0.82rem", gap: 0 }}
                  >
                    <Box sx={{ width: 30, display: "grid", placeItems: "center", color: tokens.textSecondary, flexShrink: 0 }}>
                      {item.icon}
                    </Box>
                    {item.text}
                  </MenuItem>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
        <Divider />
        <Box sx={{ px: 1.5, py: 1 }}>
          <Box sx={{ mb: 0.75, display: "flex", alignItems: "center", gap: 1, color: tokens.textSecondary }}>
            <Palette size={15} strokeWidth={1.75} />
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: tokens.textPrimary }}>Tema</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
            <Button
              size="small"
              onClick={() => setTheme("light")}
              startIcon={<Sun {...compactIconProps} />}
              sx={{
                minHeight: 32,
                borderRadius: 1,
                border: `1px solid ${mode === "light" ? alpha(tokens.primary, 0.42) : tokens.borderSubtle}`,
                color: mode === "light" ? tokens.textPrimary : tokens.textSecondary,
                backgroundColor: mode === "light" ? tokens.primaryTint : "transparent",
                textTransform: "none",
                fontSize: "0.76rem",
              }}
            >
              Claro
            </Button>
            <Button
              size="small"
              onClick={() => setTheme("dark")}
              startIcon={<Moon {...compactIconProps} />}
              sx={{
                minHeight: 32,
                borderRadius: 1,
                border: `1px solid ${mode === "dark" ? alpha(tokens.primary, 0.42) : tokens.borderSubtle}`,
                color: mode === "dark" ? tokens.textPrimary : tokens.textSecondary,
                backgroundColor: mode === "dark" ? tokens.primaryTint : "transparent",
                textTransform: "none",
                fontSize: "0.76rem",
              }}
            >
              Escuro
            </Button>
          </Box>
        </Box>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography sx={{ mb: 0.75, fontSize: "0.72rem", fontWeight: 700, color: tokens.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Período
          </Typography>
          <ActivePeriodSelector placement="accountMenu" />
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onLogout();
          }}
          sx={{ minHeight: 38, fontSize: "0.82rem", gap: 1.25, color: tokens.danger }}
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sair
        </MenuItem>
      </Menu>
    </>
  );
};

const AppShellLayoutInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const tokens = getLayoutTokens(theme);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const search = useGlobalSearch();

  const navigate = useNavigate();
  const location = useLocation();
  const desktopShell = window.desktopShell;
  const isDesktopShell = Boolean(desktopShell?.isDesktop);
  const titleBarOffset = isDesktopShell ? desktopTitleBarHeight : 0;
  const mobileTopOffset = `${titleBarOffset}px`;
  const desktopTopOffset = `${titleBarOffset}px`;

  const { configModuloSaldo, loading: loadingConfig, onConfigChanged } = useConfigContext();
  const { hasRecentChange, showChangeIndicator } = useConfigChangeIndicator();
  const { user, isAdmin, isEscolaUser } = useUserRole();
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

  const settingsMenuItems = useMemo(() => {
    return SETTINGS_MENU_ITEMS.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (isAdmin) return true;
      const slug = MODULO_SLUGS[item.text];
      return slug ? hasLeitura(slug) : true;
    });
  }, [hasLeitura, isAdmin]);

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

  const handleLogout = useCallback(() => {
    logout({ redirect: false });
    navigate("/login", { replace: true });
    if (isMobile) setMobileOpen(false);
  }, [isMobile, navigate]);

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: tokens.bgPrimary,
        fontFamily: sidebarFontFamily,
        "& .MuiTypography-root, & .MuiButton-root, & .MuiListItemText-primary": {
          fontFamily: sidebarFontFamily,
        },
        "& svg": {
          flexShrink: 0,
        },
      }}
    >
      <Box
        sx={{
          px: collapsed && !isMobile ? 1 : 1.5,
          pt: 1.5,
          pb: 1,
          display: "grid",
          gap: 1,
        }}
      >
        <Box
          sx={{
            minHeight: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed && !isMobile ? "center" : "space-between",
            px: collapsed && !isMobile ? 0 : 0.75,
            gap: 1,
          }}
        >
          {(!collapsed || isMobile) && <NutriLogLogo />}
          {!isMobile && (
            <Tooltip title={collapsed ? "Expandir menu" : "Recolher menu"} placement="right">
              <IconButton
                aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                onClick={handleCollapseToggle}
                sx={{
                  width: 20,
                  height: 20,
                  p: 0,
                  border: 0,
                  borderRadius: 0,
                  color: tokens.textSecondary,
                  backgroundColor: "transparent",
                  flexShrink: 0,
                  "&:hover": {
                    backgroundColor: "transparent",
                    color: tokens.textPrimary,
                  },
                }}
              >
                {collapsed ? <PanelLeftOpen {...iconProps} /> : <PanelLeftClose {...iconProps} />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {hasRecentChange && !loadingConfig && (!collapsed || isMobile) && (
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
          <>
            <List disablePadding sx={{ pb: 0.35 }}>
              <SidebarSearchItem
                collapsed={collapsed && !isMobile}
                tokens={tokens}
                onOpen={() => search.setOpen(true)}
              />
            </List>
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
          </>
        )}
      </Box>

      <Box
        sx={{
          py: 1.5,
          display: "grid",
          gap: 0.35,
        }}
      >
        <SidebarNotifications
          collapsed={collapsed}
          isMobile={isMobile}
          isEscolaUser={isEscolaUser}
          tokens={tokens}
        />
        <AccountSettingsMenu
          collapsed={collapsed}
          isMobile={isMobile}
          user={user}
          tokens={tokens}
          settingsItems={settingsMenuItems}
          onNavigate={handleNavigation}
          onLogout={handleLogout}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
      {isDesktopShell && (
        <>
          <Box
            aria-hidden="true"
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: titleBarOffset,
              backgroundColor: tokens.bgPrimary,
              zIndex: (muiTheme) => muiTheme.zIndex.drawer + 2,
              WebkitAppRegion: "drag",
              userSelect: "none",
            }}
          />
          <DesktopTitlebarMenu
            height={titleBarOffset}
            backgroundColor={tokens.bgPrimary}
            borderColor={tokens.borderSubtle}
            iconColor={tokens.textPrimary}
            showDevTools={Boolean(desktopShell?.isDev || import.meta.env.DEV)}
            onBack={() => {
              if (window.history.length > 1) {
                navigate(-1);
                return;
              }
              navigate("/");
            }}
            onReload={() => {
              desktopShell?.reloadApp?.();
            }}
            onOpenLogs={() => {
              desktopShell?.openLogsFolder?.();
            }}
            onShowAbout={() => {
              desktopShell?.showAboutDialog?.();
            }}
            onToggleDevTools={() => {
              desktopShell?.toggleDevTools?.();
            }}
          />
        </>
      )}
      <IconButton
        aria-label="Abrir menu"
        onClick={handleDrawerToggle}
        sx={{
          display: { xs: "inline-flex", md: "none" },
          position: "fixed",
          top: `calc(${titleBarOffset}px + 8px)`,
          left: 8,
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          width: 36,
          height: 36,
          borderRadius: 1,
          color: tokens.textPrimary,
          backgroundColor: alpha(tokens.bgPrimary, theme.palette.mode === "light" ? 0.9 : 0.82),
          border: `1px solid ${tokens.borderSubtle}`,
          "&:hover": { backgroundColor: tokens.bgElevated },
        }}
      >
        <MenuIcon {...iconProps} />
      </IconButton>
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
              mt: mobileTopOffset,
              height: `calc(100% - ${titleBarOffset}px)`,
              boxSizing: "border-box",
              borderRight: 0,
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
              mt: desktopTopOffset,
              height: `calc(100% - ${titleBarOffset}px)`,
              overflowX: "hidden",
              transition: "width 0.22s ease",
              borderRight: 0,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <GlobalSearchDialog search={search} tokens={tokens} />

      <Box
        component="main"
        sx={{
          "--app-sidebar-width": {
            xs: "0px",
            md: collapsed ? `${collapsedDrawerWidth}px` : `${drawerWidth}px`,
          },
          "--app-top-offset": {
            xs: mobileTopOffset,
            md: desktopTopOffset,
          },
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          mt: { xs: mobileTopOffset, md: desktopTopOffset },
          width: { md: `calc(100% - ${collapsed ? collapsedDrawerWidth : drawerWidth}px)` },
          transition: "width 0.22s ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const AppShellLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NotificacoesProvider>
    <NotificacoesEscolaProvider>
      <AppShellLayoutInner>{children}</AppShellLayoutInner>
    </NotificacoesEscolaProvider>
  </NotificacoesProvider>
);

export default AppShellLayout;
