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
        <Typography variant="body2">Loading tenants...</Typography>
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
    // Debug logs
    console.log('🔍 TenantSelector Debug:', {
      currentTenant: currentTenant?.name,
      currentTenantId: currentTenant?.id,
      availableTenantsCount: availableTenants.length,
      availableTenants: availableTenants.map(t => ({ id: t.id, name: t.name })),
      loading,
      switching,
      selectValue: currentTenant?.id || ""
    });

    return (
      <Box display="flex" alignItems="center" gap={2}>
        {/* Show current tenant info */}
        {currentTenant && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">
              Tenant atual:
            </Typography>
            <Chip
              icon={<Business />}
              label={currentTenant.name}
              color="primary"
              size="small"
            />
          </Box>
        )}
        
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="tenant-select-label">
            Selecionar Tenant
          </InputLabel>
          <Select
            labelId="tenant-select-label"
            value={currentTenant?.id || ""}
            label="Selecionar Tenant"
            disabled={switching || loading}
            onChange={(e) => handleTenantSwitch(e.target.value)}
            displayEmpty
            renderValue={(selected) => {
              if (!selected || selected === "") {
                return <Typography color="text.secondary">Selecionar Tenant</Typography>;
              }
              const selectedTenant = availableTenants.find(t => t.id === selected);
              if (selectedTenant) {
                return (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Business fontSize="small" />
                    <Typography>{selectedTenant.name}</Typography>
                  </Box>
                );
              }
              return <Typography color="error">Tenant não encontrado</Typography>;
            }}
          >
            {!currentTenant && (
              <MenuItem value="" disabled>
                <Typography color="text.secondary">Nenhum tenant selecionado</Typography>
              </MenuItem>
            )}
            {availableTenants.map((tenant) => (
              <MenuItem key={tenant.id} value={tenant.id}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Business fontSize="small" />
                  {tenant.name}
                  <Chip 
                    label={tenant.status} 
                    size="small" 
                    color={tenant.status === 'active' ? 'success' : 'default'}
                  />
                  {currentTenant?.id === tenant.id && (
                    <Chip 
                      label="Atual" 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {switching && <CircularProgress size={16} />}
        
        {showCreateButton && (
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
            variant="outlined"
          >
            New Tenant
          </Button>
        )}

        {/* Create Tenant Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tenant Name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Slug"
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase() })}
                  helperText="URL-friendly identifier"
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Subdomain"
                  value={newTenant.subdomain}
                  onChange={(e) => setNewTenant({ ...newTenant, subdomain: e.target.value.toLowerCase() })}
                  helperText="Optional subdomain"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateTenant} 
              variant="contained"
              disabled={creating || !newTenant.name || !newTenant.slug}
            >
              {creating ? <CircularProgress size={20} /> : 'Create'}
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
        Tenant Management
      </Typography>
      
      {currentTenant && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Currently managing: <strong>{currentTenant.name}</strong>
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Select Tenant to Manage</InputLabel>
        <Select
          value={currentTenant?.id || ''}
          label="Select Tenant to Manage"
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
                  label={tenant.status} 
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
          Create New Tenant
        </Button>
      )}
    </Box>
  );
}