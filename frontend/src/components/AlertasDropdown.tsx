import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Chip,
  Divider,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Notifications,
  NotificationsNone,
  Warning,
  Error,
  Info,
  CheckCircle,
  MarkEmailRead
} from '@mui/icons-material';
import { alertaService, Alerta } from '../services/alertaService';

const AlertasDropdown: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [quantidadeNaoLidos, setQuantidadeNaoLidos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  const carregarAlertas = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alertasResponse, countResponse] = await Promise.all([
        alertaService.listarAlertas({ limit: 10, lido: false }),
        alertaService.contarNaoLidos()
      ]);

      setAlertas(alertasResponse.alertas || []);
      setQuantidadeNaoLidos(countResponse.quantidade);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
      setError('Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAlertas();
    
    // Atualizar alertas a cada 30 segundos
    const interval = setInterval(carregarAlertas, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (quantidadeNaoLidos > 0) {
      carregarAlertas();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarcarComoLido = async (alertaId: number) => {
    try {
      await alertaService.marcarComoLido(alertaId);
      setAlertas(prev => prev.filter(a => a.id !== alertaId));
      setQuantidadeNaoLidos(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar alerta como lido:', err);
    }
  };

  const handleMarcarTodosComoLidos = async () => {
    try {
      await alertaService.marcarTodosComoLidos();
      setAlertas([]);
      setQuantidadeNaoLidos(0);
    } catch (err) {
      console.error('Erro ao marcar todos os alertas como lidos:', err);
    }
  };

  const getIconeAlerta = (tipo: string, prioridade: string) => {
    const props = { fontSize: 'small' as const };
    
    switch (prioridade) {
      case 'critica':
        return <Error color="error" {...props} />;
      case 'alta':
        return <Warning color="warning" {...props} />;
      case 'media':
        return <Info color="info" {...props} />;
      default:
        return <CheckCircle color="success" {...props} />;
    }
  };

  const formatarTempo = (dataString: string) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMinutos / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 0) {
      return `${diffDias}d atrás`;
    } else if (diffHoras > 0) {
      return `${diffHoras}h atrás`;
    } else if (diffMinutos > 0) {
      return `${diffMinutos}m atrás`;
    } else {
      return 'Agora';
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="alertas"
      >
        <Badge badgeContent={quantidadeNaoLidos} color="error">
          {quantidadeNaoLidos > 0 ? <Notifications /> : <NotificationsNone />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box p={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">
              Alertas {quantidadeNaoLidos > 0 && `(${quantidadeNaoLidos})`}
            </Typography>
            {quantidadeNaoLidos > 0 && (
              <Button
                size="small"
                startIcon={<MarkEmailRead />}
                onClick={handleMarcarTodosComoLidos}
              >
                Marcar todos como lidos
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Box p={2}>
            <Alert severity="error" size="small">
              {error}
            </Alert>
          </Box>
        ) : alertas.length === 0 ? (
          <Box p={3} textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body2" color="textSecondary">
              Nenhum alerta pendente
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {alertas.map((alerta) => (
              <ListItem
                key={alerta.id}
                button
                onClick={() => handleMarcarComoLido(alerta.id)}
                sx={{
                  borderLeft: `4px solid`,
                  borderLeftColor: 
                    alerta.prioridade === 'critica' ? 'error.main' :
                    alerta.prioridade === 'alta' ? 'warning.main' :
                    alerta.prioridade === 'media' ? 'info.main' : 'success.main'
                }}
              >
                <ListItemIcon>
                  {getIconeAlerta(alerta.tipo, alerta.prioridade)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1, mr: 1 }}>
                        {alerta.titulo}
                      </Typography>
                      <Box display="flex" flexDirection="column" alignItems="flex-end">
                        <Chip
                          label={alertaService.formatarTipoAlerta(alerta.tipo)}
                          size="small"
                          color={alertaService.getCorPrioridade(alerta.prioridade)}
                          sx={{ mb: 0.5 }}
                        />
                        <Typography variant="caption" color="textSecondary">
                          {formatarTempo(alerta.data_criacao)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {alerta.mensagem}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}

        {alertas.length > 0 && (
          <>
            <Divider />
            <Box p={1}>
              <Button
                fullWidth
                size="small"
                onClick={() => {
                  handleClose();
                  // Navegar para página de alertas completa
                  window.location.href = '/alertas';
                }}
              >
                Ver todos os alertas
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default AlertasDropdown;