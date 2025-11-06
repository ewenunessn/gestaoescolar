import { apiWithRetry } from './api';
import { 
  Tenant, 
  TenantFilters, 
  CreateTenantInput, 
  UpdateTenantInput,
  TenantResolutionResult,
  TenantUser,
  TenantUserFilters
} from '../../../shared/types/tenant';

class TenantService {
  // Resolve tenant from current context (subdomain, header, token)
  async resolveTenant(): Promise<TenantResolutionResult> {
    try {
      console.log('🔄 Chamando API /tenants/resolve...');
      const response = await apiWithRetry.get('/tenants/resolve');
      console.log('✅ Resposta da API /tenants/resolve:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error resolving tenant:', error);
      return {
        tenant: null,
        method: null,
        error: error.message || 'Failed to resolve tenant'
      };
    }
  }

  // Get tenant by ID
  async getTenant(id: string): Promise<Tenant | null> {
    try {
      const response = await apiWithRetry.get(`/tenants/${id}`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error getting tenant:', error);
      return null;
    }
  }

  // List tenants (for system admins)
  async listTenants(filters?: TenantFilters): Promise<Tenant[]> {
    try {
      console.log('🔄 Chamando API /tenants...');
      const response = await apiWithRetry.get('/tenants', { params: filters });
      console.log('✅ Resposta da API /tenants:', response.data);
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error('❌ Error listing tenants:', error);
      return [];
    }
  }

  // Create new tenant (for system admins)
  async createTenant(data: CreateTenantInput): Promise<Tenant> {
    const response = await apiWithRetry.post('/tenants', data);
    return response.data.data || response.data;
  }

  // Update tenant (for system/tenant admins)
  async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
    const response = await apiWithRetry.put(`/tenants/${id}`, data);
    return response.data.data || response.data;
  }

  // Delete tenant (for system admins)
  async deleteTenant(id: string): Promise<void> {
    await apiWithRetry.delete(`/tenants/${id}`);
  }

  // Switch tenant context (for system admins)
  async switchTenant(tenantId: string): Promise<any> {
    const response = await apiWithRetry.post('/tenants/switch', { tenantId });
    
    console.log('🔄 Switch tenant response:', response.data);
    
    // Update token if returned by backend
    if (response.data.data?.token) {
      localStorage.setItem('token', response.data.data.token);
      console.log('🔑 Token atualizado no localStorage');
    }
    
    // Update current tenant ID
    if (response.data.data?.tenant?.id) {
      localStorage.setItem('currentTenantId', response.data.data.tenant.id);
      console.log('🏢 Tenant ID atualizado no localStorage:', response.data.data.tenant.id);
    }
    
    return response.data;
  }

  // Get tenant users
  async getTenantUsers(tenantId: string, filters?: TenantUserFilters): Promise<TenantUser[]> {
    try {
      const response = await apiWithRetry.get(`/tenants/${tenantId}/users`, { params: filters });
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error('Error getting tenant users:', error);
      return [];
    }
  }

  // Get current user's tenants
  async getUserTenants(): Promise<Tenant[]> {
    try {
      const response = await apiWithRetry.get('/tenants/user/tenants');
      return response.data.data || response.data || [];
    } catch (error: any) {
      console.error('Error getting user tenants:', error);
      return [];
    }
  }

  // Get tenant configuration
  async getTenantConfig(tenantId: string, category?: string): Promise<any> {
    try {
      const params = category ? { category } : {};
      const response = await apiWithRetry.get(`/tenants/${tenantId}/config`, { params });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('Error getting tenant config:', error);
      return {};
    }
  }

  // Update tenant configuration
  async updateTenantConfig(tenantId: string, category: string, config: any): Promise<void> {
    await apiWithRetry.put(`/tenants/${tenantId}/config/${category}`, config);
  }
}

export const tenantService = new TenantService();