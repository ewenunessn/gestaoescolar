# Multi-Tenant Architecture Documentation

## Overview

This document provides comprehensive documentation for the multi-tenant architecture implementation in the school management system. The architecture enables multiple organizations (municipalities, school districts) to use the system independently with complete data isolation and customizable configurations.

## Architecture Components

### 1. Tenant Resolution System

The system supports multiple tenant identification methods:

- **Subdomain-based**: `tenant1.sistema.com.br`
- **Header-based**: `X-Tenant-ID` header
- **Token-based**: Tenant information embedded in JWT
- **Domain-based**: Custom domain mapping

#### Implementation Files
- `src/services/tenantResolver.ts` - Core tenant resolution logic
- `src/middleware/tenantMiddleware.ts` - Request middleware for tenant context
- `src/utils/tenantContext.ts` - Tenant context management utilities

### 2. Database Schema

#### Core Tenant Tables

```sql
-- Central tenant registry
tenants (
    id UUID PRIMARY KEY,
    slug VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Tenant-specific configurations
tenant_configurations (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    category VARCHAR(100),
    key VARCHAR(100),
    value JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Tenant user associations
tenant_users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id INTEGER REFERENCES usuarios(id),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP
)
```

#### Multi-Tenant Tables

All existing tables have been modified to include `tenant_id`:
- `escolas` - Schools
- `produtos` - Products
- `usuarios` - Users
- `contratos` - Contracts
- `estoque_escolas` - School inventory
- `pedidos` - Orders
- `entregas` - Deliveries

### 3. Row Level Security (RLS)

All multi-tenant tables implement RLS policies:

```sql
-- Example RLS policy
CREATE POLICY tenant_isolation_escolas ON escolas
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

#### Database Context Management
- `src/utils/tenantContext.ts` - Sets tenant context for database sessions
- Uses PostgreSQL `current_setting()` for tenant isolation
- Automatic tenant context injection in all queries

### 4. API Layer

#### Tenant Management APIs
- `src/controllers/tenantController.ts` - Tenant CRUD operations
- `src/routes/tenantRoutes.ts` - Tenant API endpoints
- `src/services/tenantService.ts` - Business logic for tenant operations

#### Configuration Management
- `src/controllers/tenantConfigurationController.ts` - Configuration management
- `src/services/tenantConfigurationService.ts` - Configuration business logic
- `src/services/tenantConfigurationValidator.ts` - Configuration validation

### 5. Authentication & Authorization

#### Tenant-Aware Authentication
- `src/middlewares/tenantAuthMiddleware.ts` - Tenant authentication middleware
- JWT tokens include tenant information
- User-tenant association validation

#### Role-Based Access Control
- Tenant administrators can manage users within their tenant
- System administrators can manage multiple tenants
- Role hierarchy: system_admin > tenant_admin > user

### 6. Performance Optimizations

#### Caching
- `src/utils/tenantCache.ts` - Redis-based tenant caching
- Tenant configuration caching
- Query result caching with tenant-prefixed keys

#### Database Optimizations
- `src/utils/tenantOptimizedQueries.ts` - Optimized query patterns
- `src/utils/tenantConnectionPool.ts` - Connection pooling
- Composite indexes with tenant_id for performance

### 7. Monitoring & Auditing

#### Audit System
- `src/services/tenantAuditService.ts` - Comprehensive audit logging
- `src/middleware/auditMiddleware.ts` - Request auditing
- Tenant-specific audit trails

#### Monitoring
- `src/services/tenantMonitoringService.ts` - Performance monitoring
- `src/services/tenantRealtimeMonitoringService.ts` - Real-time monitoring
- Tenant usage metrics and alerting

### 8. Migration System

#### Tenant Migrations
- `src/services/tenantMigrationService.ts` - Migration management
- `src/cli/tenantMigrationCli.ts` - CLI tools for migrations
- Tenant-specific schema changes

#### Migration Templates
- `src/services/migrationTemplates.ts` - Reusable migration templates
- Safe migration patterns for multi-tenant environments

### 9. Provisioning & Automation

#### Tenant Provisioning
- `src/services/tenantProvisioningService.ts` - Automated provisioning
- `src/cli/tenantProvisioningCli.ts` - CLI provisioning tools
- Template-based tenant setup

#### Backup & Recovery
- `src/services/tenantBackupService.ts` - Tenant-specific backups
- `src/services/tenantBackupScheduler.ts` - Automated backup scheduling
- Point-in-time recovery per tenant

## Security Considerations

### Data Isolation
1. **Database Level**: Row Level Security (RLS) policies
2. **Application Level**: Tenant context validation
3. **API Level**: Request validation and filtering

### Access Control
1. **Authentication**: Tenant-aware user authentication
2. **Authorization**: Role-based access within tenant boundaries
3. **Validation**: Input validation with tenant scope

### Audit & Compliance
1. **Logging**: All tenant operations are logged
2. **Monitoring**: Security monitoring for cross-tenant access attempts
3. **Compliance**: LGPD/GDPR compliance per tenant

## Configuration Management

### Tenant Settings Structure
```json
{
  "features": {
    "inventory": true,
    "contracts": true,
    "deliveries": true,
    "reports": true
  },
  "branding": {
    "logo": "https://example.com/logo.png",
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d"
  },
  "notifications": {
    "email": true,
    "sms": false,
    "push": true
  }
}
```

### Tenant Limits Structure
```json
{
  "maxUsers": 100,
  "maxSchools": 50,
  "maxProducts": 1000,
  "storageLimit": 5120,
  "apiRateLimit": 1000
}
```

## API Endpoints

### Tenant Management
- `GET /api/tenants` - List tenants (system admin only)
- `POST /api/tenants` - Create tenant (system admin only)
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant (system admin only)

### Tenant Configuration
- `GET /api/tenants/:id/config` - Get tenant configuration
- `PUT /api/tenants/:id/config` - Update tenant configuration
- `GET /api/tenants/:id/config/:category` - Get specific configuration category

### Tenant Users
- `GET /api/tenants/:id/users` - List tenant users
- `POST /api/tenants/:id/users` - Add user to tenant
- `PUT /api/tenants/:id/users/:userId` - Update user role
- `DELETE /api/tenants/:id/users/:userId` - Remove user from tenant

## Frontend Integration

### Tenant Context
- `src/context/TenantContext.tsx` - React context for tenant state
- `src/hooks/useTenantApi.ts` - Custom hooks for tenant operations
- `src/services/tenantService.ts` - Frontend tenant service

### Tenant Branding
- `src/components/TenantBranding.tsx` - Dynamic branding component
- `src/utils/tenantTheme.ts` - Theme utilities for tenant customization
- `src/components/TenantSelector.tsx` - Tenant selection component

## Error Handling

### Common Error Types
- `TenantNotFoundError` - Tenant does not exist
- `TenantInactiveError` - Tenant is inactive or suspended
- `CrossTenantAccessError` - Attempted cross-tenant access
- `TenantLimitExceededError` - Tenant limit violation

### Error Response Format
```json
{
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "Tenant not found: example-tenant",
    "details": {
      "tenantId": "123e4567-e89b-12d3-a456-426614174000"
    }
  }
}
```

## Performance Guidelines

### Query Optimization
1. Always include `tenant_id` in WHERE clauses
2. Use composite indexes with `tenant_id` as the first column
3. Implement query result caching for frequently accessed data
4. Use connection pooling with tenant context awareness

### Caching Strategy
1. Cache tenant configurations with Redis
2. Use tenant-prefixed cache keys
3. Implement cache invalidation on configuration updates
4. Cache frequently accessed tenant data

### Monitoring Metrics
1. API response times per tenant
2. Database query performance per tenant
3. Cache hit rates per tenant
4. Resource usage per tenant

## Testing

### Unit Tests
- Tenant middleware functionality
- Database context management
- Configuration validation
- Service layer operations

### Integration Tests
- End-to-end tenant isolation
- API endpoint functionality
- Database RLS policy enforcement
- Cross-tenant access prevention

### Performance Tests
- Multi-tenant query performance
- System scalability with multiple tenants
- Cache effectiveness
- Connection pool efficiency

## Maintenance

### Regular Tasks
1. Monitor tenant usage and performance
2. Review audit logs for security issues
3. Update tenant configurations as needed
4. Perform regular backups and test recovery procedures

### Scaling Considerations
1. Monitor database performance as tenant count grows
2. Consider read replicas for heavy read workloads
3. Implement horizontal scaling strategies
4. Review and optimize indexing strategies

## Support & Troubleshooting

For troubleshooting common issues, see:
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Tenant Onboarding Guide](./TENANT_ONBOARDING.md)

## Related Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)