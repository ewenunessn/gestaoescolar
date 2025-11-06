import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Divider,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useTenant } from '../context/TenantContext';

interface TenantInventoryConfigProps {
  showSettings?: boolean;
  showLimits?: boolean;
  showPermissions?: boolean;
  compact?: boolean;
}

export const TenantInventoryConfig: React.FC<TenantInventoryConfigProps> = ({
  showSettings = true,
  showLimits = true,
  showPermissions = false,
  compact = false,
}) => {
  const { currentTenant, tenantContext, loading, error } = useTenant();

  // Show loading state
  if (loading) {
    return (
      <Card sx={{ borderRadius: '12px' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={100} />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error || !currentTenant) {
    return (
      <Alert severity="error">
        {error || 'Contexto de organização não encontrado'}
      </Alert>
    );
  }

  const settings = tenantContext?.settings;
  const limits = tenantContext?.limits;
  const permissions = tenantContext?.permissions || [];

  return (
    <Card sx={{ borderRadius: '12px' }}>
      <CardContent>
        {/* Tenant Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: '8px', 
            bgcolor: 'primary.50',
            color: 'primary.main'
          }}>
            <BusinessIcon />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {currentTenant.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configurações de Inventário
            </Typography>
          </Box>
          <Chip 
            label={currentTenant.status || 'Ativo'} 
            color="success" 
            size="small" 
            variant="outlined"
          />
        </Box>

        {!compact && (
          <>
            {/* Tenant Info */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  ID da Organização
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {currentTenant.id}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Tipo
                </Typography>
                <Typography variant="body2">
                  Organização
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Inventory Settings */}
        {showSettings && settings?.features && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Funcionalidades do Inventário
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                label="Inventário"
                color={settings.features.inventory ? 'success' : 'default'}
                size="small"
                variant={settings.features.inventory ? 'filled' : 'outlined'}
              />
              <Chip
                label="Contratos"
                color={settings.features.contracts ? 'success' : 'default'}
                size="small"
                variant={settings.features.contracts ? 'filled' : 'outlined'}
              />
              <Chip
                label="Entregas"
                color={settings.features.deliveries ? 'success' : 'default'}
                size="small"
                variant={settings.features.deliveries ? 'filled' : 'outlined'}
              />
              <Chip
                label="Relatórios"
                color={settings.features.reports ? 'success' : 'default'}
                size="small"
                variant={settings.features.reports ? 'filled' : 'outlined'}
              />
            </Box>
          </Box>
        )}

        {/* Inventory Limits */}
        {showLimits && limits && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SpeedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Limites da Organização
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Usuários
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {limits.maxUsers || 'Ilimitado'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Escolas
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {limits.maxSchools || 'Ilimitado'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">
                  Armazenamento
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {limits.storageLimit ? `${limits.storageLimit} GB` : 'Ilimitado'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Inventory Permissions */}
        {showPermissions && permissions.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Permissões de Inventário
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {permissions
                .filter(permission => permission.startsWith('inventory.'))
                .map(permission => (
                  <Chip
                    key={permission}
                    label={permission.replace('inventory.', '').replace('.', ' ')}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
            </Box>
          </Box>
        )}

        {/* Notification Settings */}
        {showSettings && settings?.notifications && !compact && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Configurações de Notificação
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body2">
                    {settings.notifications.email ? 'Habilitado' : 'Desabilitado'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    SMS
                  </Typography>
                  <Typography variant="body2">
                    {settings.notifications.sms ? 'Habilitado' : 'Desabilitado'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Push
                  </Typography>
                  <Typography variant="body2">
                    {settings.notifications.push ? 'Habilitado' : 'Desabilitado'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TenantInventoryConfig;