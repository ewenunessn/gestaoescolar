import React, { useState } from 'react';
import {
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  FolderOpenOutlined,
  InfoOutlined,
  ArrowBackRounded,
  Menu as MenuIcon,
  RefreshRounded,
  TerminalRounded,
} from '@mui/icons-material';

type DesktopTitlebarMenuProps = {
  height: number;
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
  showDevTools?: boolean;
  onBack: () => void;
  onReload: () => void;
  onOpenLogs?: () => void | Promise<void>;
  onShowAbout?: () => void | Promise<void>;
  onToggleDevTools?: () => void | Promise<void>;
};

export function DesktopTitlebarMenu({
  height,
  backgroundColor,
  borderColor,
  iconColor,
  showDevTools = false,
  onBack,
  onReload,
  onOpenLogs,
  onShowAbout,
  onToggleDevTools,
}: DesktopTitlebarMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.25}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          height,
          px: 0.75,
          borderRight: `1px solid ${borderColor}`,
          backgroundColor,
          zIndex: (theme) => theme.zIndex.drawer + 3,
          WebkitAppRegion: 'no-drag',
        }}
      >
        <Tooltip title="Abrir menu do aplicativo">
          <IconButton
            aria-label="Abrir menu do aplicativo"
            size="small"
            onClick={(event) => setAnchorEl(event.currentTarget)}
            sx={{ color: iconColor }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Voltar">
          <IconButton
            aria-label="Voltar"
            size="small"
            onClick={onBack}
            sx={{ color: iconColor }}
          >
            <ArrowBackRounded fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Recarregar aplicativo">
          <IconButton
            aria-label="Recarregar aplicativo"
            size="small"
            onClick={onReload}
            sx={{ color: iconColor }}
          >
            <RefreshRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 220,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            closeMenu();
            onOpenLogs?.();
          }}
        >
          <ListItemIcon>
            <FolderOpenOutlined fontSize="small" />
          </ListItemIcon>
          Abrir pasta de logs
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            onReload();
          }}
        >
          <ListItemIcon>
            <RefreshRounded fontSize="small" />
          </ListItemIcon>
          Recarregar aplicativo
        </MenuItem>
        {showDevTools && (
          <MenuItem
            onClick={() => {
              closeMenu();
              onToggleDevTools?.();
            }}
          >
            <ListItemIcon>
              <TerminalRounded fontSize="small" />
            </ListItemIcon>
            Abrir DevTools
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenu();
            onShowAbout?.();
          }}
        >
          <ListItemIcon>
            <InfoOutlined fontSize="small" />
          </ListItemIcon>
          Sobre o NutriLog
        </MenuItem>
      </Menu>
    </>
  );
}
