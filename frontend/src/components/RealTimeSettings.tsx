import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import {
  Settings,
  Speed,
  Notifications,
  AutoMode,
} from '@mui/icons-material';
import { useRealTimeSettings } from '../hooks/useRealTimeSettings';

interface RealTimeSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export const RealTimeSettingsDialog: React.FC<RealTimeSettingsDialogProps> = ({
  open,
  onClose,
}) => {
  const { settings, updateSettings, resetSettings } = useRealTimeSettings();

  const intervalOptions = [
    { value: 5000, label: '5 segundos', color: '#ef4444' },
    { value: 10000, label: '10 segundos', color: '#f97316' },
    { value: 15000, label: '15 segundos', color: '#eab308' },
    { value: 30000, label: '30 segundos', color: '#22c55e' },
    { value: 60000, label: '1 minuto', color: '#3b82f6' },
    { value: 120000, label: '2 minutos', color: '#8b5cf6' },
    { value: 300000, label: '5 minutos', color: '#6b7280' },
  ];

  const getIntervalLabel = (value: number) => {
    const option = intervalOptions.find(opt => opt.value === value);
    return option ? option.label : `${value / 1000}s`;
  };

  const getIntervalColor = (value: number) => {
    const option = intervalOptions.find(opt => opt.value === value);
    return option ? option.color : '#6b7280';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: 600,
          color: '#1f2937',
        }}
      >
        <Settings />
        Configurações de Tempo Real
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Ativar/Desativar Tempo Real */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  color="primary"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Ativar Tempo Real
                  </Typography>
                </Box>
              }
            />
            <Typography variant="body2" sx={{ color: '#6b7280', ml: 4 }}>
              Atualiza automaticamente os dados em intervalos regulares
            </Typography>
          </Box>

          <Divider />

          {/* Intervalo de Atualização */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Speed />
              Intervalo de Atualização
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Intervalo</InputLabel>
                <Select
                  value={settings.refreshInterval}
                  onChange={(e) => updateSettings({ refreshInterval: e.target.value as number })}
                  label="Intervalo"
                  disabled={!settings.enabled}
                >
                  {intervalOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: option.color,
                          }}
                        />
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Chip
                label={getIntervalLabel(settings.refreshInterval)}
                sx={{
                  bgcolor: getIntervalColor(settings.refreshInterval),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>

            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Intervalos menores consomem mais recursos mas mantêm os dados mais atualizados
            </Typography>
          </Box>

          <Divider />

          {/* Notificações */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showNotifications}
                  onChange={(e) => updateSettings({ showNotifications: e.target.checked })}
                  color="primary"
                  disabled={!settings.enabled}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Notifications />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Mostrar Notificações
                  </Typography>
                </Box>
              }
            />
            <Typography variant="body2" sx={{ color: '#6b7280', ml: 4 }}>
              Exibe notificações quando novos dados estão disponíveis
            </Typography>
          </Box>

          {/* Auto Refresh */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => updateSettings({ autoRefresh: e.target.checked })}
                  color="primary"
                  disabled={!settings.enabled}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoMode />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Atualização Automática
                  </Typography>
                </Box>
              }
            />
            <Typography variant="body2" sx={{ color: '#6b7280', ml: 4 }}>
              Atualiza automaticamente sem mostrar notificações
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={resetSettings}
          sx={{
            color: '#6b7280',
            textTransform: 'none',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          Restaurar Padrões
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#4f46e5',
            textTransform: 'none',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '&:hover': { bgcolor: '#4338ca' },
          }}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RealTimeSettingsDialog;