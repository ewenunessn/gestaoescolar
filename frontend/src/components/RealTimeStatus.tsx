import React, { useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Refresh,
  PlayArrow,
  Pause,
  Wifi,
  WifiOff,
  FiberManualRecord,
  Update,
  Settings,
} from '@mui/icons-material';
import { RealTimeSettingsDialog } from './RealTimeSettings';

interface RealTimeStatusProps {
  isActive: boolean;
  lastUpdated: Date | null;
  hasNewData: boolean;
  loading?: boolean;
  error?: string | null;
  onToggle: () => void;
  onRefresh: () => void;
  onClearNewData?: () => void;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({
  isActive,
  lastUpdated,
  hasNewData,
  loading = false,
  error = null,
  onToggle,
  onRefresh,
  onClearNewData,
}) => {
  const theme = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s atrás`;
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return date.toLocaleString('pt-BR');
  };

  const getStatusColor = () => {
    if (error) return theme.palette.error.main;
    if (isActive) return theme.palette.success.main;
    return theme.palette.grey[500];
  };

  const getStatusIcon = () => {
    if (loading) return <Refresh sx={{ animation: 'spin 1s linear infinite' }} />;
    if (error) return <WifiOff />;
    if (isActive) return <Wifi />;
    return <WifiOff />;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderRadius: 2,
        bgcolor: alpha(getStatusColor(), 0.1),
        border: `1px solid ${alpha(getStatusColor(), 0.3)}`,
      }}
    >
      {/* Indicador de status */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: getStatusColor(),
            animation: isActive && !error ? 'pulse 2s infinite' : 'none',
          }}
        />
        
        <Typography
          variant="caption"
          sx={{
            color: getStatusColor(),
            fontWeight: 600,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {error ? 'Erro' : isActive ? 'Tempo Real' : 'Manual'}
        </Typography>
      </Box>

      {/* Última atualização */}
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.text.secondary,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {formatLastUpdated(lastUpdated)}
      </Typography>

      {/* Indicador de novos dados */}
      {hasNewData && (
        <Tooltip title="Há dados novos disponíveis">
          <Chip
            icon={<Update sx={{ fontSize: '14px !important' }} />}
            label="Novo"
            size="small"
            onClick={onClearNewData}
            sx={{
              height: 20,
              bgcolor: theme.palette.info.main,
              color: 'white',
              fontSize: '0.7rem',
              cursor: 'pointer',
              '& .MuiChip-icon': {
                color: 'white',
              },
              animation: 'pulse 2s infinite',
            }}
          />
        </Tooltip>
      )}

      {/* Botões de controle */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={isActive ? 'Pausar tempo real' : 'Ativar tempo real'}>
          <IconButton
            size="small"
            onClick={onToggle}
            sx={{
              width: 24,
              height: 24,
              bgcolor: alpha(getStatusColor(), 0.1),
              '&:hover': {
                bgcolor: alpha(getStatusColor(), 0.2),
              },
            }}
          >
            {isActive ? (
              <Pause sx={{ fontSize: 14, color: getStatusColor() }} />
            ) : (
              <PlayArrow sx={{ fontSize: 14, color: getStatusColor() }} />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Atualizar agora">
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={loading}
            sx={{
              width: 24,
              height: 24,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <Refresh
              sx={{
                fontSize: 14,
                color: theme.palette.primary.main,
                animation: loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
          </IconButton>
        </Tooltip>

        <Tooltip title="Configurações">
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            sx={{
              width: 24,
              height: 24,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              '&:hover': {
                bgcolor: alpha(theme.palette.grey[500], 0.2),
              },
            }}
          >
            <Settings
              sx={{
                fontSize: 14,
                color: theme.palette.grey[600],
              }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Dialog de Configurações */}
      <RealTimeSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Estilos CSS para animações */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default RealTimeStatus;