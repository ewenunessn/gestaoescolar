import { useMemo } from 'react';
import { apiWithRetry } from '../services/api';
import { useTenant } from '../context/TenantContext';

/**
 * Hook that provides tenant-aware API calls
 * Automatically includes tenant context in API requests
 */
export function useTenantApi() {
  const { currentTenant, tenantContext } = useTenant();

  const tenantApi = useMemo(() => {
    // Create a wrapper around the API that automatically includes tenant context
    const createTenantAwareMethod = (method: 'get' | 'post' | 'put' | 'delete') => {
      return (url: string, ...args: any[]) => {
        // The tenant context is already handled by the API interceptor
        // This hook mainly provides a convenient way to access tenant-aware API
        return (apiWithRetry as any)[method](url, ...args);
      };
    };

    return {
      get: createTenantAwareMethod('get'),
      post: createTenantAwareMethod('post'),
      put: createTenantAwareMethod('put'),
      delete: createTenantAwareMethod('delete'),
      
      // Utility methods
      getCurrentTenant: () => currentTenant,
      getTenantContext: () => tenantContext,
      isTenantActive: () => currentTenant?.status === 'active',
      
      // Tenant-specific endpoints
      getTenantData: (endpoint: string) => {
        if (!currentTenant) {
          throw new Error('No tenant context available');
        }
        return apiWithRetry.get(`/tenants/${currentTenant.id}${endpoint}`);
      },
      
      postTenantData: (endpoint: string, data: any) => {
        if (!currentTenant) {
          throw new Error('No tenant context available');
        }
        return apiWithRetry.post(`/tenants/${currentTenant.id}${endpoint}`, data);
      },
      
      putTenantData: (endpoint: string, data: any) => {
        if (!currentTenant) {
          throw new Error('No tenant context available');
        }
        return apiWithRetry.put(`/tenants/${currentTenant.id}${endpoint}`, data);
      },
      
      deleteTenantData: (endpoint: string) => {
        if (!currentTenant) {
          throw new Error('No tenant context available');
        }
        return apiWithRetry.delete(`/tenants/${currentTenant.id}${endpoint}`);
      }
    };
  }, [currentTenant, tenantContext]);

  return {
    ...tenantApi,
    currentTenant,
    tenantContext,
    hasTenant: !!currentTenant,
    isSystemAdmin: tenantContext?.user?.tipo === 'admin',
    isTenantAdmin: tenantContext?.user?.tenantRole === 'tenant_admin'
  };
}