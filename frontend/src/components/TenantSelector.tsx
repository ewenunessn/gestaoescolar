import { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Business, AdminPanelSettings } from '@mui/icons-material';
import { useTenant } from '../context/TenantContext';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface TenantSelectorProps {
  variant?: 'compact' | 'full';
  showCreateButton?: boolean;
}

export default function TenantSelector({ 
  variant = 'compact', 
  showCreateButton = true 
}: TenantSelectorProps) {
  const { user } = useCurrentUser();
  const { 
    currentTenant, 
    availableTenants, 
    loading, 
    error, 
    switchTenant 
  } = useTenant();
  
  const [switching, setSwitching] = useState(false);

  // Debug: mostrar informações completas
  console.log('👤 TenantSelector - Estado completo:', {
    user: user,
    currentTenant: currentTenant?.name,
    availableTenants: availableTenants.length,
    loading: loading
  });
  
  // IMPORTANTE: Verificar usuário ANTES de verificar loading
  // Show for system administrators and gestors (temporarily)
  if (user?.tipo !== 'admin' && user?.tipo !== 'gestor') {
    console.log('🚫 TenantSelector não exibido - usuário não é admin nem gestor', {
      tipo: user?.tipo,
      user: user
    });
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) return;
    
    setSwitching(true);
    try {
      await switchTenant(tenantId);
    } catch (err) {
      console.error('Failed to switch tenant:', err);
    } finally {
      setSwitching(false);
    }
  };

  // Só mostrar loading se o usuário for admin/gestor
  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <CircularProgress size={20} />
        <Typography variant="body2">Carregando unidades...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (variant === 'compact') {
    // Debug do valor do Select
    console.log('🎯 TenantSelector - Renderizando Select:', {
      currentTenantId: currentTenant?.id,
      currentTenantName: currentTenant?.name,
      value: currentTenant?.id || "",
      availableCount: availableTenants.length
    });
    
    return (
      <Box display="flex" alignItems="center" gap={1.5}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel id="tenant-select-label">Unidade</InputLabel>
          <Select
            labelId="tenant-select-label"
            value={currentTenant?.id || ""}
            label="Unidade"
            disabled={switching || loading}
            onChange={(e) => handleTenantSwitch(e.target.value)}
            displayEmpty
            sx={{ 
              '& .MuiSelect-select': { 
                py: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }
            }}
          >
            {availableTenants.map((tenant) => (
              <MenuItem key={tenant.id} value={tenant.id}>
                <Box display="flex" alignItems="center" gap={1} width="100%">
                  <Business fontSize="small" color="action" />
                  <Typography sx={{ flex: 1 }}>{tenant.name}</Typography>
                  {currentTenant?.id === tenant.id && (
                    <Chip 
                      label="Atual" 
                      size="small" 
                      color="primary"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {switching && <CircularProgress size={18} />}
      </Box>
    );
  }

  // Full variant for dedicated tenant management page
  return (
    <Box>
      <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
        <AdminPanelSettings />
        Gerenciamento de Unidades
      </Typography>
      
      {currentTenant && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Gerenciando: <strong>{currentTenant.name}</strong>
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Selecionar Unidade</InputLabel>
        <Select
          value={currentTenant?.id || ''}
          label="Selecionar Unidade"
          disabled={switching}
          onChange={(e) => handleTenantSwitch(e.target.value)}
        >
          {availableTenants.map((tenant) => (
            <MenuItem key={tenant.id} value={tenant.id}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Business />
                  <Box>
                    <Typography variant="body1">{tenant.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {tenant.slug} • {tenant.subdomain && `${tenant.subdomain}.`}domain.com
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={tenant.status === 'active' ? 'Ativo' : 'Inativo'} 
                  size="small" 
                  color={tenant.status === 'active' ? 'success' : 'default'}
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

    </Box>
  );
}