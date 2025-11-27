import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, TenantContext as ITenantContext, TenantSettings, TenantLimits } from '../../../shared/types/tenant';
import { tenantService } from '../services/tenantService';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { queryClient } from '../lib/queryClient';

// Valores padrão para settings e limits
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
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(() => {
    // Inicializar currentTenant imediatamente do localStorage
    try {
      const savedTenantId = localStorage.getItem('currentTenantId');
      const savedTenants = localStorage.getItem('availableTenants');
      
      if (savedTenantId && savedTenants) {
        const tenants = JSON.parse(savedTenants);
        const tenant = tenants.find((t: Tenant) => t.id === savedTenantId);
        if (tenant) {
          console.log('🚀 [INIT] Tenant carregado do localStorage:', tenant.name);
          return tenant;
        }
      }
    } catch (err) {
      console.error('❌ [INIT] Erro ao carregar tenant inicial:', err);
    }
    return null;
  });
  const [tenantContext, setTenantContext] = useState<ITenantContext | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>(() => {
    // Inicializar availableTenants imediatamente do localStorage
    try {
      const savedTenants = localStorage.getItem('availableTenants');
      if (savedTenants) {
        const tenants = JSON.parse(savedTenants);
        console.log('🚀 [INIT] Tenants carregados do localStorage:', tenants.length);
        return tenants;
      }
    } catch (err) {
      console.error('❌ [INIT] Erro ao carregar tenants iniciais:', err);
    }
    return [];
  });
  const [loading, setLoading] = useState(false); // Mudar para false já que carregamos do localStorage
  const [error, setError] = useState<string | null>(null);
  const { user } = useCurrentUser();

  // Escutar mudanças no localStorage (quando faz login)
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('📢 [STORAGE] Detectada mudança no localStorage');
      
      // Recarregar tenants
      const savedTenants = localStorage.getItem('availableTenants');
      if (savedTenants) {
        try {
          const tenants = JSON.parse(savedTenants);
          console.log('🔄 [STORAGE] Recarregando tenants:', tenants.length);
          setAvailableTenants(tenants);
        } catch (err) {
          console.error('❌ [STORAGE] Erro ao parsear tenants:', err);
        }
      }
      
      // Recarregar currentTenant
      const savedTenantId = localStorage.getItem('currentTenantId');
      console.log('🔍 [STORAGE] currentTenantId:', savedTenantId);
      
      if (savedTenantId && savedTenants) {
        try {
          const tenants = JSON.parse(savedTenants);
          console.log('🔍 [STORAGE] Procurando tenant com ID:', savedTenantId);
          console.log('🔍 [STORAGE] Tenants disponíveis:', tenants.map((t: Tenant) => `${t.name} (${t.id})`));
          
          const tenant = tenants.find((t: Tenant) => t.id === savedTenantId);
          if (tenant) {
            console.log('✅ [STORAGE] Recarregando currentTenant:', tenant.name);
            setCurrentTenant(tenant);
          } else {
            console.log('❌ [STORAGE] Tenant não encontrado na lista!');
          }
        } catch (err) {
          console.error('❌ [STORAGE] Erro ao carregar tenant:', err);
        }
      } else {
        console.log('⚠️ [STORAGE] Faltando dados:', {
          hasTenantId: !!savedTenantId,
          hasTenants: !!savedTenants
        });
      }
    };

    // Escutar evento de storage (funciona entre abas)
    window.addEventListener('storage', handleStorageChange);
    
    // Escutar evento customizado (funciona na mesma aba)
    window.addEventListener('tenantDataUpdated', handleStorageChange);
    
    // Também verificar imediatamente ao montar
    handleStorageChange();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tenantDataUpdated', handleStorageChange);
    };
  }, []);

  // Resolve tenant from URL, header, or token
  const resolveTenant = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Resolvendo tenant...');
      console.log('🔍 currentTenant atual:', currentTenant?.name);

      // Se já temos um tenant carregado do localStorage, apenas construir o contexto
      if (currentTenant && user) {
        console.log('✅ Tenant já carregado, apenas construindo contexto');
        const context: ITenantContext = {
          tenantId: currentTenant.id,
          tenant: currentTenant,
          user: {
            ...user,
            tenantRole: 'user'
          },
          permissions: [],
          settings: currentTenant.settings || defaultSettings,
          limits: currentTenant.limits || defaultLimits
        };
        setTenantContext(context);
        setLoading(false);
        return;
      }

      // Try to resolve tenant from current context
      const result: any = await tenantService.resolveTenant();
      console.log('🔍 Resultado da resolução:', result);
      
      // A API retorna { success: true, data: { tenant, method } }
      let resolvedTenant = result?.data?.tenant || result?.tenant;
      
      // Se não conseguiu resolver pela API, tentar usar o tenant salvo no localStorage
      if (!resolvedTenant && availableTenants.length > 0) {
        const savedTenantId = localStorage.getItem('currentTenantId');
        console.log('🔍 currentTenantId no localStorage:', savedTenantId);
        console.log('🔍 availableTenants:', availableTenants.map(t => `${t.name} (${t.id})`));
        
        if (savedTenantId) {
          // Procurar o tenant salvo na lista de disponíveis
          const savedTenant = availableTenants.find(t => t.id === savedTenantId);
          if (savedTenant) {
            console.log('✅ Usando tenant salvo do localStorage:', savedTenant.name);
            resolvedTenant = savedTenant;
          } else {
            console.log('❌ Tenant salvo não encontrado na lista, usando primeiro disponível');
            console.log('   Tenant salvo:', savedTenantId);
            console.log('   Primeiro disponível:', availableTenants[0].name);
            resolvedTenant = availableTenants[0];
          }
        } else {
          console.log('⚠️ Nenhum tenant salvo no localStorage, usando primeiro disponível');
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
            settings: resolvedTenant.settings || defaultSettings,
            limits: resolvedTenant.limits || defaultLimits
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
      
      // SOLUÇÃO TEMPORÁRIA: Apenas atualizar localStorage e recarregar
      // O backend tem um bug no endpoint /tenants/switch que retorna 404
      // Por enquanto, vamos apenas trocar o tenant localmente
      const selectedTenant = availableTenants.find(t => t.id === tenantId);
      
      if (!selectedTenant) {
        throw new Error('Tenant não encontrado na lista de disponíveis');
      }
      
      console.log('✅ Tenant selecionado:', selectedTenant.name);
      
      // Salvar o tenantId no localStorage
      localStorage.setItem('currentTenantId', tenantId);
      console.log('💾 currentTenantId salvo:', tenantId);
      
      // Atualizar o estado local
      setCurrentTenant(selectedTenant);
      
      console.log('🔄 Recarregando página para aplicar novo contexto...');
      
      // Recarregar a página para aplicar o novo contexto
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

  // Não precisamos mais deste useEffect, pois os tenants são carregados na inicialização

  // Initialize tenant resolution when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 Usuário carregado, verificando tenant:', user);
      // Se já temos um tenant carregado, apenas construir o contexto
      if (currentTenant) {
        console.log('✅ Tenant já carregado, construindo contexto');
        const context: ITenantContext = {
          tenantId: currentTenant.id,
          tenant: currentTenant,
          user: {
            ...user,
            tenantRole: 'user'
          },
          permissions: [],
          settings: currentTenant.settings || defaultSettings,
          limits: currentTenant.limits || defaultLimits
        };
        setTenantContext(context);
      } else {
        console.log('🔍 Nenhum tenant carregado, iniciando resolução');
        resolveTenant();
      }
    } else {
      // Não limpar currentTenantId aqui, pois o usuário pode ainda estar carregando
      // Apenas limpar o estado do contexto
      console.log('👤 Usuário não encontrado (ainda carregando ou deslogado)');
      if (!localStorage.getItem('token')) {
        // Só limpar se realmente não há token (usuário deslogado)
        setCurrentTenant(null);
        setTenantContext(null);
      }
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