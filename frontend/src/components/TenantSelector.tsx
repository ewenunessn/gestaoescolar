import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid
} from '@mui/material';
import { Business, Add, AdminPanelSettings } from '@mui/icons-material';
import { useTenant } from '../context/TenantContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { tenantService } from '../services/tenantService';
import { CreateTenantInput, TenantSettings, TenantLimits } from '../../../shared/types/tenant';

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // Default tenant settings
  const defaultSettings: TenantSettings = {
    features: {
      inventory: true,
      contracts: true,
      deliveries: true,
      reports: true,
      mobile: true,
      analytics: false,
    },
    branding: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
    },
    notifications: {
      email: true,
      sms: false,
      push: true,
    },
    integrations: {
      whatsapp: false,
      email: true,
      sms: false,
    },
  };

  const defaultLimits: TenantLimits = {
    maxUsers: 100,
    maxSchools: 50,
    maxProducts: 1000,
    storageLimit: 1024,
    apiRateLimit: 100,
    maxContracts: 50,
    maxOrders: 1000,
  };

  const [newTenant, setNewTenant] = useState<CreateTenantInput>({
    slug: '',
    name: '',
    subdomain: '',
    settings: defaultSettings,
    limits: defaultLimits
  });

  // Debug: mostrar informações do usuário
  console.log('👤 TenantSelector - Usuário atual:', {
    id: user?.id,
    nome: user?.nome,
    tipo: user?.tipo,
    isAdmin: user?.tipo === 'admin'
  });

  // Debug logs
  console.log('👤 TenantSelector - Usuário atual:', {
    id: user?.id,
    nome: user?.nome,
    tipo: user?.tipo,
    isAdmin: user?.tipo === 'admin'
  });
  
  // Show for system administrators and gestors (temporarily)
  if (user?.tipo !== 'admin' && user?.tipo !== 'gestor') {
    console.log('🚫 TenantSelector não exibido - usuário não é admin nem gestor');
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

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.slug) return;

    setCreating(true);
    try {
      await tenantService.createTenant(newTenant);
      setCreateDialogOpen(false);
      setNewTenant({ 
        slug: '', 
        name: '', 
        subdomain: '',
        settings: defaultSettings,
        limits: defaultLimits
      });
      // Refresh available tenants
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      alert(err.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

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
        
        {showCreateButton && (
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            variant="outlined"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Nova Unidade
          </Button>
        )}

        {/* Create Tenant Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Criar Nova Unidade</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome da Unidade"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Identificador"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase() })}
                  helperText="Identificador único (URL)"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Subdomínio"
                  value={newTenant.subdomain}
                  onChange={(e) => setNewTenant({ ...newTenant, subdomain: e.target.value.toLowerCase() })}
                  helperText="Opcional"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateTenant} 
              variant="contained"
              disabled={creating || !newTenant.name || !newTenant.slug}
            >
              {creating ? <CircularProgress size={20} /> : 'Criar'}
            </Button>
          </DialogActions>
        </Dialog>
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

      {showCreateButton && (
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Criar Nova Unidade
        </Button>
      )}
    </Box>
  );
}