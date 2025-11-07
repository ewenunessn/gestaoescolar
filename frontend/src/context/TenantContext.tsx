import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, TenantContext as ITenantContext, TenantSettings } from '../../../shared/types/tenant';
import { tenantService } from '../services/tenantService';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { queryClient } from '../lib/queryClient';

interface TenantContextState {
  currentTenant: Tenant | null;
  tenantContext: ITenantContext | null;
  availableTenants: Tenant[];
  loading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  resolveTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextState | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantContext, setTenantContext] = useState<ITenantContext | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useCurrentUser();

  // Resolve tenant from URL, header, or token
  const resolveTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Resolvendo tenant...');

      // Try to resolve tenant from current context
      const result = await tenantService.resolveTenant();
      console.log('🔍 Resultado da resolução:', result);
      
      if (result && result.data && result.data.tenant) {
        console.log(`✅ Tenant resolvido: ${result.data.tenant.name} (${result.data.tenant.id})`);
        setCurrentTenant(result.data.tenant);
        
        // Build tenant context
        if (user) {
          const context: ITenantContext = {
            tenantId: result.data.tenant.id,
            tenant: result.data.tenant,
            user: {
              ...user,
              tenantRole: 'user' // This would come from tenant-user association
            },
            permissions: [], // This would be resolved based on user role
            settings: result.data.tenant.settings,
            limits: result.data.tenant.limits
          };
          setTenantContext(context);
        }
      } else {
        console.log('⚠️ Nenhum tenant resolvido, limpando currentTenant');
        console.log('🔍 Estrutura da resposta:', result);
        setCurrentTenant(null);
        setTenantContext(null);
      }


    } catch (err: any) {
      console.error('❌ Erro ao resolver tenant:', err);
      setError(err.message || 'Failed to resolve tenant');
    } finally {
      setLoading(false);
    }
  };

  // Switch to a different tenant (for system admins)
  const switchTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Switching to tenant: ${tenantId}`);
      const response = await tenantService.switchTenant(tenantId);
      
      // Force a small delay to ensure token is updated
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log(`✅ Tenant switch completed successfully`);
      console.log('🔄 Recarregando página para aplicar novo contexto...');
      
      // Recarregar a página para aplicar o novo token e contexto
      window.location.reload();
    } catch (err: any) {
      console.error('❌ Error switching tenant:', err);
      setError(err.message || 'Failed to switch tenant');
      setLoading(false);
    }
  };

  // Refresh current tenant data
  const refreshTenant = async () => {
    if (currentTenant) {
      try {
        const updatedTenant = await tenantService.getTenant(currentTenant.id);
        if (updatedTenant) {
          setCurrentTenant(updatedTenant);
          
          if (tenantContext) {
            setTenantContext({
              ...tenantContext,
              tenant: updatedTenant,
              settings: updatedTenant.settings,
              limits: updatedTenant.limits
            });
          }
        }
      } catch (err: any) {
        console.error('Error refreshing tenant:', err);
        setError(err.message || 'Failed to refresh tenant');
      }
    }
  };

  // Load available tenants from localStorage on mount
  useEffect(() => {
    const loadAvailableTenants = () => {
      try {
        const savedTenants = localStorage.getItem('availableTenants');
        if (savedTenants) {
          const tenants = JSON.parse(savedTenants);
          console.log(`📋 Carregando tenants do localStorage: ${tenants.length}`, tenants);
          setAvailableTenants(tenants);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar tenants do localStorage:', err);
      }
    };
    
    loadAvailableTenants();
  }, []);

  // Initialize tenant resolution when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 Usuário carregado, iniciando resolução de tenant:', user);
      resolveTenant();
    } else {
      console.log('👤 Usuário não encontrado, limpando contexto de tenant');
      setCurrentTenant(null);
      setTenantContext(null);
      setLoading(false);
    }
  }, [user]);

  const value: TenantContextState = {
    currentTenant,
    tenantContext,
    availableTenants,
    loading,
    error,
    switchTenant,
    refreshTenant,
    resolveTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}