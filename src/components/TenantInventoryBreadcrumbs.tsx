import React from 'react';
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface TenantInventoryBreadcrumbsProps {
  items?: BreadcrumbItem[];
  showTenantInfo?: boolean;
  maxWidth?: string | number;
}

export const TenantInventoryBreadcrumbs: React.FC<TenantInventoryBreadcrumbsProps> = ({
  items = [],
  showTenantInfo = true,
  maxWidth = '1280px',
}) => {
  const { currentTenant, error: tenantError } = useTenant();
  const location = useLocation();

  // Auto-generate breadcrumbs based on current path if no items provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Início', path: '/', icon: <HomeIcon fontSize="small" /> }
    ];

    // Map common inventory paths
    if (pathSegments.includes('estoque-escolar')) {
      breadcrumbs.push({
        label: 'Estoque Escolar',
        path: '/estoque-escolar',
        icon: <InventoryIcon fontSize="small" />
      });
    }

    if (pathSegments.includes('movimentacao-estoque')) {
      breadcrumbs.push({
        label: 'Movimentação de Estoque',
        path: '/movimentacao-estoque',
        icon: <AssessmentIcon fontSize="small" />
      });
    }

    if (pathSegments.includes('escolas')) {
      breadcrumbs.push({
        label: 'Escolas',
        path: '/escolas',
        icon: <SchoolIcon fontSize="small" />
      });
    }

    // Mark the last item as current
    if (breadcrumbs.length > 1) {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    }

    return breadcrumbs;
  };

  const breadcrumbItems = items.length > 0 ? items : generateBreadcrumbs();

  // Show tenant error if present
  if (tenantError) {
    return (
      <Box sx={{ maxWidth, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 2 }}>
        <Alert severity="error">
          Erro no contexto da organização: {tenantError}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      bgcolor: 'background.paper', 
      borderBottom: '1px solid', 
      borderColor: 'divider',
      py: 2
    }}>
      <Box sx={{ maxWidth, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ flex: 1 }}
          >
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              const isCurrent = item.current || isLast;

              if (isCurrent || !item.path) {
                return (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5,
                      color: 'text.primary',
                      fontWeight: 600
                    }}
                  >
                    {item.icon}
                    <Typography variant="body2" color="inherit">
                      {item.label}
                    </Typography>
                  </Box>
                );
              }

              return (
                <Link
                  key={index}
                  component={RouterLink}
                  to={item.path}
                  underline="hover"
                  color="inherit"
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    '&:hover': {
                      color: 'primary.main'
                    }
                  }}
                >
                  {item.icon}
                  <Typography variant="body2" color="inherit">
                    {item.label}
                  </Typography>
                </Link>
              );
            })}
          </Breadcrumbs>

          {/* Tenant Info */}
          {showTenantInfo && currentTenant && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              flexShrink: 0
            }}>
              <BusinessIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Organização:
              </Typography>
              <Chip 
                label={currentTenant.name} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
          )}
        </Box>

        {/* Tenant Context Info */}
        {showTenantInfo && currentTenant && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Todos os dados são filtrados automaticamente para sua organização
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TenantInventoryBreadcrumbs;