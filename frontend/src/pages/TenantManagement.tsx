import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Business,
  Add,
  Edit,
  Delete,
  Settings,
  People,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import { useTenant } from '../context/TenantContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { tenantService } from '../services/tenantService';
import { 
  Tenant, 
  CreateTenantInput, 
  UpdateTenantInput, 
  TenantStatus,
  TenantSettings,
  TenantLimits
} from '../../../shared/types/tenant';
import TenantSelector from '../components/TenantSelector';

// Default tenant settings and limits
const DEFAULT_TENANT_SETTINGS: TenantSettings = {
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

const DEFAULT_TENANT_LIMITS: TenantLimits = {
  maxUsers: 100,
  maxSchools: 50,
  maxProducts: 1000,
  storageLimit: 1024, // 1GB
  apiRateLimit: 100, // 100 requests per minute
  maxContracts: 50,
  maxOrders: 1000,
};

export default function TenantManagement() {
  const { user } = useCurrentUser();
  const { availableTenants, refreshTenant } = useTenant();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Form states
  const [newTenant, setNewTenant] = useState<CreateTenantInput>({
    slug: '',
    name: '',
    subdomain: '',
    settings: DEFAULT_TENANT_SETTINGS,
    limits: DEFAULT_TENANT_LIMITS
  });
  
  const [editTenant, setEditTenant] = useState<UpdateTenantInput>({});

  // Only allow system administrators
  if (user?.tipo !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          Access denied. Only system administrators can manage tenants.
        </Alert>
      </Box>
    );
  }

  // Load tenants
  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantService.listTenants();
      setTenants(data);
    } catch (err: any) {
      console.error('Error loading tenants:', err);
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
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
        settings: DEFAULT_TENANT_SETTINGS,
        limits: DEFAULT_TENANT_LIMITS
      });
      await loadTenants();
    } catch (err: any) {
      console.error('Failed to create tenant:', err);
      setError(err.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleEditTenant = async () => {
    if (!selectedTenant) return;

    setUpdating(true);
    try {
      await tenantService.updateTenant(selectedTenant.id, editTenant);
      setEditDialogOpen(false);
      setSelectedTenant(null);
      setEditTenant({});
      await loadTenants();
    } catch (err: any) {
      console.error('Failed to update tenant:', err);
      setError(err.message || 'Failed to update tenant');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to delete tenant "${tenant.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await tenantService.deleteTenant(tenant.id);
      await loadTenants();
    } catch (err: any) {
      console.error('Failed to delete tenant:', err);
      setError(err.message || 'Failed to delete tenant');
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditTenant({
      name: tenant.name,
      domain: tenant.domain,
      subdomain: tenant.subdomain,
      status: tenant.status,
      settings: tenant.settings,
      limits: tenant.limits
    });
    setEditDialogOpen(true);
  };

  const getStatusColor = (status: TenantStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Tenant Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Tenant
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tenant Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TenantSelector variant="full" showCreateButton={false} />
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      <Grid container spacing={3}>
        {tenants.map((tenant) => (
          <Grid item xs={12} md={6} lg={4} key={tenant.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Business color="primary" />
                    <Typography variant="h6" component="h2">
                      {tenant.name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={tenant.status} 
                    color={getStatusColor(tenant.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Slug: {tenant.slug}
                </Typography>
                
                {tenant.subdomain && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Subdomain: {tenant.subdomain}
                  </Typography>
                )}
                
                {tenant.domain && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Domain: {tenant.domain}
                  </Typography>
                )}

                <Box mt={2}>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(tenant.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                  <Tooltip title="Edit Tenant">
                    <IconButton size="small" onClick={() => openEditDialog(tenant)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Tenant">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleDeleteTenant(tenant)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {tenants.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No tenants found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Create your first tenant to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Tenant
          </Button>
        </Box>
      )}

      {/* Create Tenant Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom Domain"
                value={newTenant.domain || ''}
                onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                helperText="Optional custom domain"
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

      {/* Edit Tenant Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Tenant</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tenant Name"
                value={editTenant.name || ''}
                onChange={(e) => setEditTenant({ ...editTenant, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Subdomain"
                value={editTenant.subdomain || ''}
                onChange={(e) => setEditTenant({ ...editTenant, subdomain: e.target.value.toLowerCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Custom Domain"
                value={editTenant.domain || ''}
                onChange={(e) => setEditTenant({ ...editTenant, domain: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editTenant.status || 'active'}
                  label="Status"
                  onChange={(e) => setEditTenant({ ...editTenant, status: e.target.value as TenantStatus })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditTenant} 
            variant="contained"
            disabled={updating}
          >
            {updating ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}