import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useTenant } from '../context/TenantContext';

interface TenantBrandingProps {
  children?: React.ReactNode;
  showLogo?: boolean;
  showName?: boolean;
}

export default function TenantBranding({ 
  children, 
  showLogo = true, 
  showName = true 
}: TenantBrandingProps) {
  const { currentTenant, tenantContext } = useTenant();

  // Apply tenant branding to the document
  useEffect(() => {
    if (tenantContext?.settings.branding) {
      const { branding } = tenantContext.settings;
      
      // Apply custom CSS variables for theming
      const root = document.documentElement;
      
      if (branding.primaryColor) {
        root.style.setProperty('--tenant-primary-color', branding.primaryColor);
      }
      
      if (branding.secondaryColor) {
        root.style.setProperty('--tenant-secondary-color', branding.secondaryColor);
      }

      // Update favicon if provided
      if (branding.favicon) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = branding.favicon;
        }
      }

      // Apply custom CSS if provided
      if (branding.customCss) {
        let customStyleElement = document.getElementById('tenant-custom-css');
        if (!customStyleElement) {
          customStyleElement = document.createElement('style');
          customStyleElement.id = 'tenant-custom-css';
          document.head.appendChild(customStyleElement);
        }
        customStyleElement.textContent = branding.customCss;
      }

      // Update document title to include tenant name
      if (currentTenant?.name) {
        const originalTitle = document.title.split(' - ')[0];
        document.title = `${originalTitle} - ${currentTenant.name}`;
      }
    }

    // Cleanup function to reset branding
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--tenant-primary-color');
      root.style.removeProperty('--tenant-secondary-color');
      
      const customStyleElement = document.getElementById('tenant-custom-css');
      if (customStyleElement) {
        customStyleElement.remove();
      }
    };
  }, [tenantContext, currentTenant]);

  if (!currentTenant) {
    return <>{children}</>;
  }

  const { branding } = tenantContext?.settings || {};

  return (
    <Box>
      {(showLogo || showName) && (
        <Box 
          display="flex" 
          alignItems="center" 
          gap={2} 
          mb={2}
          sx={{
            color: branding?.primaryColor || 'inherit'
          }}
        >
          {showLogo && branding?.logo && (
            <Box
              component="img"
              src={branding.logo}
              alt={`${currentTenant.name} logo`}
              sx={{
                height: 40,
                width: 'auto',
                maxWidth: 200
              }}
            />
          )}
          
          {showName && (
            <Typography 
              variant="h6" 
              component="div"
              sx={{
                color: branding?.primaryColor || 'inherit',
                fontWeight: 'bold'
              }}
            >
              {currentTenant.name}
            </Typography>
          )}
        </Box>
      )}
      
      {children}
    </Box>
  );
}