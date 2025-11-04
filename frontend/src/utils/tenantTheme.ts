import { createTheme, Theme } from '@mui/material/styles';
import { lightTheme } from '../theme/theme';
import { TenantSettings } from '../../../shared/types/tenant';

/**
 * Creates a theme with tenant-specific branding applied
 */
export function createTenantTheme(tenantSettings?: TenantSettings): Theme {
  if (!tenantSettings?.branding) {
    return lightTheme;
  }

  const { branding } = tenantSettings;

  return createTheme({
    ...lightTheme,
    palette: {
      ...lightTheme.palette,
      primary: {
        ...lightTheme.palette.primary,
        main: branding.primaryColor || lightTheme.palette.primary.main,
      },
      secondary: {
        ...lightTheme.palette.secondary,
        main: branding.secondaryColor || lightTheme.palette.secondary.main,
      },
      tenant: {
        primary: branding.primaryColor || lightTheme.palette.primary.main,
        secondary: branding.secondaryColor || lightTheme.palette.secondary.main,
      },
    },
  });
}

/**
 * Applies tenant branding to the document
 */
export function applyTenantBranding(tenantSettings?: TenantSettings): void {
  if (!tenantSettings?.branding) {
    return;
  }

  const { branding } = tenantSettings;
  const root = document.documentElement;

  // Apply CSS custom properties
  if (branding.primaryColor) {
    root.style.setProperty('--tenant-primary-color', branding.primaryColor);
  }

  if (branding.secondaryColor) {
    root.style.setProperty('--tenant-secondary-color', branding.secondaryColor);
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

  // Update favicon if provided
  if (branding.favicon) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = branding.favicon;
    } else {
      // Create favicon link if it doesn't exist
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.href = branding.favicon;
      document.head.appendChild(newFavicon);
    }
  }
}

/**
 * Removes tenant branding from the document
 */
export function removeTenantBranding(): void {
  const root = document.documentElement;
  
  // Remove CSS custom properties
  root.style.removeProperty('--tenant-primary-color');
  root.style.removeProperty('--tenant-secondary-color');
  
  // Remove custom CSS
  const customStyleElement = document.getElementById('tenant-custom-css');
  if (customStyleElement) {
    customStyleElement.remove();
  }
  
  // Reset favicon to default
  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  if (favicon) {
    favicon.href = '/favicon.ico'; // Default favicon
  }
}

/**
 * Gets the tenant logo URL or falls back to default
 */
export function getTenantLogo(tenantSettings?: TenantSettings): string {
  return tenantSettings?.branding?.logo || '/logo.png';
}

/**
 * Gets tenant-specific colors
 */
export function getTenantColors(tenantSettings?: TenantSettings) {
  const branding = tenantSettings?.branding;
  
  return {
    primary: branding?.primaryColor || '#2563eb',
    secondary: branding?.secondaryColor || '#64748b',
  };
}