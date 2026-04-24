import React, { useState } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItem,
  ListItemText, Tooltip, Divider, Button, CircularProgress,
} from '@mui/material';
import {
  Notifications as BellIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { useNotificacoes } from '../contexts/NotificacoesContext';

export default function NotificacoesMenu() {
  const { notificacoes, naoLidas, loading, marcarTodasLidas, deletar, abrirNotificacao } = useNotificacoes();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const open = Boolean(anchor);

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton onClick={e => setAnchor(e.currentTarget)} size="small" sx={{ color: 'text.secondary' }}>
          <Badge badgeContent={naoLidas || undefined} color="error" max={99}>
            <BellIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' } }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notificações {naoLidas > 0 && <Typography component="span" variant="caption" color="error.main">({naoLidas} não lidas)</Typography>}
          </Typography>
          {naoLidas > 0 && (
            <Tooltip title="Marcar todas como lidas">
              <IconButton size="small" onClick={marcarTodasLidas}><DoneAllIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Lista */}
        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {loading && notificacoes.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : notificacoes.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Nenhuma notificação</Typography>
            </Box>
          ) : (
            <List dense disablePadding>
              {notificacoes.map((n, idx) => (
                <React.Fragment key={n.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      bgcolor: n.lida ? 'transparent' : 'action.hover',
                      cursor: n.link ? 'pointer' : 'default',
                      '&:hover': { bgcolor: 'action.selected' },
                      pr: 1,
                    }}
                    onClick={() => { abrirNotificacao(n); setAnchor(null); }}
                    secondaryAction={
                      <Tooltip title="Remover">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={e => { e.stopPropagation(); deletar(n.id); }}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 3 }}>
                          {!n.lida && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                          <Typography variant="body2" fontWeight={n.lida ? 400 : 600} noWrap>{n.titulo}</Typography>
                          {n.link && <OpenIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{n.mensagem}</Typography>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(n.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
