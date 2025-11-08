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
      const result: any = await tenantService.resolveTenant();
      console.log('🔍 Resultado da resolução:', result);
      
      // A API retorna { success: true, data: { tenant, method } }
      let resolvedTenant = result?.data?.tenant || result?.tenant;
      
      // Se não conseguiu resolver pela API, tentar usar o tenant salvo no localStorage
      if (!resolvedTenant && availableTenants.length > 0) {
        const savedTenantId = localStorage.getItem('currentTenantId');
        
        if (savedTenantId) {
          // Procurar o tenant salvo na lista de disponíveis
          const savedTenant = availableTenants.find(t => t.id === savedTenantId);
          if (savedTenant) {
            console.log('⚠️ API não resolveu tenant, usando tenant salvo:', savedTenant.name);
            resolvedTenant = savedTenant;
          } else {
            console.log('⚠️ Tenant salvo não encontrado, usando primeiro disponível');
            resolvedTenant = availableTenants[0];
          }
        } else {
          console.log('⚠️ Nenhum tenant salvo, usando primeiro disponível');
          resolvedTenant = availableTenants[0];
        }
      }
      
      if (resolvedTenant) {
        console.log(`✅ Tenant resolvido: ${resolvedTenant.name} (${resolvedTenant.id})`);
        setCurrentTenant(resolvedTenant);
        
        // CRÍTICO: Salvar currentTenantId no localStorage para o axios usar
        localStorage.setItem('currentTenantId', resolvedTenant.id);
        console.log('💾 currentTenantId salvo no localStorage:', resolvedTenant.id);
        
        // Build tenant context
        if (user) {
          const context: ITenantContext = {
            tenantId: resolvedTenant.id,
            tenant: resolvedTenant,
            user: {
              ...user,
              tenantRole: 'user' // This would come from tenant-user association
            },
            permissions: [], // This would be resolved based on user role
            settings: resolvedTenant.settings || {},
            limits: resolvedTenant.limits || {}
          };
          setTenantContext(context);
        }
      } else {
        console.log('⚠️ Nenhum tenant disponível');
        setCurrentTenant(null);
        setTenantContext(null);
        localStorage.removeItem('currentTenantId');
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
      
      // CRÍTICO: Salvar o tenantId no localStorage ANTES de recarregar
      localStorage.setItem('currentTenantId', tenantId);
      console.log('💾 currentTenantId salvo antes do reload:', tenantId);
      
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
      localStorage.removeItem('currentTenantId');
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