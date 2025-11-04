/**
 * Tipos relacionados ao sistema multi-tenant
 * Compartilhados entre frontend, backend e mobile
 */

export type TenantStatus = 'active' | 'inactive' | 'suspended';
export type TenantUserRole = 'tenant_admin' | 'user' | 'viewer';
export type TenantUserStatus = 'active' | 'inactive' | 'suspended';

// ============================================================================
// INTERFACES PRINCIPAIS DE TENANT
// ============================================================================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  domain?: string;
  subdomain?: string;
  status: TenantStatus;
  settings: TenantSettings;
  limits: TenantLimits;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  features: {
    inventory: boolean;
    contracts: boolean;
    deliveries: boolean;
    reports: boolean;
    mobile: boolean;
    analytics: boolean;
  };
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    favicon?: string;
    customCss?: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  integrations: {
    whatsapp?: boolean;
    email?: boolean;
    sms?: boolean;
  };
}

export interface TenantLimits {
  maxUsers: number;
  maxSchools: number;
  maxProducts: number;
  storageLimit: number; // in MB
  apiRateLimit: number; // requests per minute
  maxContracts: number;
  maxOrders: number;
}

export interface TenantConfiguration {
  id: string;
  tenantId: string;
  category: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: number;
  role: TenantUserRole;
  status: TenantUserStatus;
  createdAt: string;
  updatedAt: string;
  
  // Dados relacionados (quando incluídos)
  user?: {
    id: number;
    nome: string;
    email: string;
    tipo: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

// ============================================================================
// INTERFACES DE CRIAÇÃO E ATUALIZAÇÃO
// ============================================================================

export interface CreateTenantInput {
  slug: string;
  name: string;
  domain?: string;
  subdomain?: string;
  settings?: Partial<TenantSettings>;
  limits?: Partial<TenantLimits>;
}

export interface UpdateTenantInput {
  name?: string;
  domain?: string;
  subdomain?: string;
  status?: TenantStatus;
  settings?: Partial<TenantSettings>;
  limits?: Partial<TenantLimits>;
}

export interface CreateTenantUserInput {
  tenantId: string;
  userId: number;
  role: TenantUserRole;
  status?: TenantUserStatus;
}

export interface UpdateTenantUserInput {
  role?: TenantUserRole;
  status?: TenantUserStatus;
}

export interface CreateTenantConfigurationInput {
  tenantId: string;
  category: string;
  key: string;
  value: any;
}

export interface UpdateTenantConfigurationInput {
  value: any;
}

// ============================================================================
// CONTEXTO DE TENANT
// ============================================================================

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  user?: {
    id: number;
    nome: string;
    email: string;
    tipo: string;
    tenantRole?: TenantUserRole;
  };
  permissions: string[];
  settings: TenantSettings;
  limits: TenantLimits;
}

export interface TenantResolutionResult {
  tenant: Tenant | null;
  method: 'subdomain' | 'header' | 'token' | 'domain' | null;
  error?: string;
}

// ============================================================================
// FILTROS E CONSULTAS
// ============================================================================

export interface TenantFilters {
  status?: TenantStatus;
  search?: string;
  hasUsers?: boolean;
  createdAfter?: string;
  createdBefore?: string;
}

export interface TenantUserFilters {
  tenantId?: string;
  role?: TenantUserRole;
  status?: TenantUserStatus;
  search?: string;
}

export interface TenantConfigurationFilters {
  tenantId?: string;
  category?: string;
  key?: string;
}

// ============================================================================
// ESTATÍSTICAS E MÉTRICAS
// ============================================================================

export interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  totalSchools: number;
  totalProducts: number;
  totalContracts: number;
  totalOrders: number;
  storageUsed: number; // in MB
  apiCallsToday: number;
  lastActivity?: string;
}

export interface TenantUsage {
  tenantId: string;
  tenantName: string;
  period: string; // YYYY-MM format
  metrics: {
    apiCalls: number;
    storageUsed: number;
    activeUsers: number;
    dataTransfer: number;
  };
}

// ============================================================================
// AUDITORIA
// ============================================================================

export interface TenantAuditLog {
  id: string;
  tenantId?: string;
  operation: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  
  // Dados relacionados
  user?: {
    id: number;
    nome: string;
    email: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

// ============================================================================
// PROVISIONING E DEPLOYMENT
// ============================================================================

export interface TenantProvisioningRequest {
  tenant: CreateTenantInput;
  adminUser: {
    nome: string;
    email: string;
    senha: string;
  };
  initialData?: {
    schools?: any[];
    products?: any[];
    users?: any[];
  };
}

export interface TenantProvisioningResult {
  success: boolean;
  tenant?: Tenant;
  adminUser?: TenantUser;
  errors?: string[];
  warnings?: string[];
}

// ============================================================================
// CONFIGURAÇÕES PADRÃO
// ============================================================================

export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
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

export const DEFAULT_TENANT_LIMITS: TenantLimits = {
  maxUsers: 100,
  maxSchools: 50,
  maxProducts: 1000,
  storageLimit: 1024, // 1GB
  apiRateLimit: 100, // 100 requests per minute
  maxContracts: 50,
  maxOrders: 1000,
};

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export const TENANT_SLUG_REGEX = /^[a-z0-9-]+$/;
export const TENANT_SUBDOMAIN_REGEX = /^[a-z0-9-]+$/;

export function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_REGEX.test(slug) && slug.length >= 3 && slug.length <= 50;
}

export function isValidTenantSubdomain(subdomain: string): boolean {
  return TENANT_SUBDOMAIN_REGEX.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 50;
}

// ============================================================================
// ERROS ESPECÍFICOS DE TENANT
// ============================================================================

export class TenantError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TenantError';
  }
}

export class TenantNotFoundError extends TenantError {
  constructor(identifier: string) {
    super(`Tenant not found: ${identifier}`, 'TENANT_NOT_FOUND');
  }
}

export class TenantInactiveError extends TenantError {
  constructor(tenantId: string) {
    super(`Tenant is inactive: ${tenantId}`, 'TENANT_INACTIVE');
  }
}

export class CrossTenantAccessError extends TenantError {
  constructor(resource: string) {
    super(`Cross-tenant access denied for resource: ${resource}`, 'CROSS_TENANT_ACCESS');
  }
}

export class TenantLimitExceededError extends TenantError {
  constructor(limit: string, current: number, max: number) {
    super(`Tenant limit exceeded for ${limit}: ${current}/${max}`, 'TENANT_LIMIT_EXCEEDED');
  }
}

export class TenantSlugConflictError extends TenantError {
  constructor(slug: string) {
    super(`Tenant slug already exists: ${slug}`, 'TENANT_SLUG_CONFLICT');
  }
}

export class TenantSubdomainConflictError extends TenantError {
  constructor(subdomain: string) {
    super(`Tenant subdomain already exists: ${subdomain}`, 'TENANT_SUBDOMAIN_CONFLICT');
  }
}