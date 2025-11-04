"use strict";
/**
 * Tipos relacionados ao sistema multi-tenant
 * Compartilhados entre frontend, backend e mobile
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantSubdomainConflictError = exports.TenantSlugConflictError = exports.TenantLimitExceededError = exports.CrossTenantAccessError = exports.TenantInactiveError = exports.TenantNotFoundError = exports.TenantError = exports.TENANT_SUBDOMAIN_REGEX = exports.TENANT_SLUG_REGEX = exports.DEFAULT_TENANT_LIMITS = exports.DEFAULT_TENANT_SETTINGS = void 0;
exports.isValidTenantSlug = isValidTenantSlug;
exports.isValidTenantSubdomain = isValidTenantSubdomain;
// ============================================================================
// CONFIGURAÇÕES PADRÃO
// ============================================================================
exports.DEFAULT_TENANT_SETTINGS = {
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
exports.DEFAULT_TENANT_LIMITS = {
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
exports.TENANT_SLUG_REGEX = /^[a-z0-9-]+$/;
exports.TENANT_SUBDOMAIN_REGEX = /^[a-z0-9-]+$/;
function isValidTenantSlug(slug) {
    return exports.TENANT_SLUG_REGEX.test(slug) && slug.length >= 3 && slug.length <= 50;
}
function isValidTenantSubdomain(subdomain) {
    return exports.TENANT_SUBDOMAIN_REGEX.test(subdomain) && subdomain.length >= 3 && subdomain.length <= 50;
}
// ============================================================================
// ERROS ESPECÍFICOS DE TENANT
// ============================================================================
class TenantError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'TenantError';
    }
}
exports.TenantError = TenantError;
class TenantNotFoundError extends TenantError {
    constructor(identifier) {
        super(`Tenant not found: ${identifier}`, 'TENANT_NOT_FOUND');
    }
}
exports.TenantNotFoundError = TenantNotFoundError;
class TenantInactiveError extends TenantError {
    constructor(tenantId) {
        super(`Tenant is inactive: ${tenantId}`, 'TENANT_INACTIVE');
    }
}
exports.TenantInactiveError = TenantInactiveError;
class CrossTenantAccessError extends TenantError {
    constructor(resource) {
        super(`Cross-tenant access denied for resource: ${resource}`, 'CROSS_TENANT_ACCESS');
    }
}
exports.CrossTenantAccessError = CrossTenantAccessError;
class TenantLimitExceededError extends TenantError {
    constructor(limit, current, max) {
        super(`Tenant limit exceeded for ${limit}: ${current}/${max}`, 'TENANT_LIMIT_EXCEEDED');
    }
}
exports.TenantLimitExceededError = TenantLimitExceededError;
class TenantSlugConflictError extends TenantError {
    constructor(slug) {
        super(`Tenant slug already exists: ${slug}`, 'TENANT_SLUG_CONFLICT');
    }
}
exports.TenantSlugConflictError = TenantSlugConflictError;
class TenantSubdomainConflictError extends TenantError {
    constructor(subdomain) {
        super(`Tenant subdomain already exists: ${subdomain}`, 'TENANT_SUBDOMAIN_CONFLICT');
    }
}
exports.TenantSubdomainConflictError = TenantSubdomainConflictError;
