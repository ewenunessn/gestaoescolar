-- Migration: Create tenant management tables
-- Description: Creates the core tables for multi-tenant architecture
-- Date: 2025-01-27

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Central tenant registry table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL, -- URL-friendly identifier
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE, -- Custom domain if applicable
    subdomain VARCHAR(50) UNIQUE, -- Subdomain identifier
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    settings JSONB DEFAULT '{}', -- Tenant-specific configurations
    limits JSONB DEFAULT '{}', -- Resource limits and quotas
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT subdomain_format CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9-]+$')
);

-- Tenant-specific configurations table
CREATE TABLE IF NOT EXISTS tenant_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'features', 'limits', 'branding', etc.
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for tenant + category + key combination
    UNIQUE(tenant_id, category, key)
);

-- Tenant user associations table
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('tenant_admin', 'user', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for tenant + user combination
    UNIQUE(tenant_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

CREATE INDEX IF NOT EXISTS idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_configurations_category ON tenant_configurations(category);
CREATE INDEX IF NOT EXISTS idx_tenant_configurations_tenant_category ON tenant_configurations(tenant_id, category);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON tenant_users(role);
CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_configurations_updated_at 
    BEFORE UPDATE ON tenant_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at 
    BEFORE UPDATE ON tenant_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system tenant for existing data
INSERT INTO tenants (
    id,
    slug, 
    name, 
    subdomain, 
    status, 
    settings, 
    limits
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'sistema-principal',
    'Sistema Principal',
    'sistema',
    'active',
    '{
        "features": {
            "inventory": true,
            "contracts": true,
            "deliveries": true,
            "reports": true
        },
        "branding": {
            "primaryColor": "#1976d2",
            "secondaryColor": "#dc004e"
        },
        "notifications": {
            "email": true,
            "sms": false,
            "push": true
        }
    }',
    '{
        "maxUsers": 1000,
        "maxSchools": 500,
        "maxProducts": 10000,
        "storageLimit": 10240,
        "apiRateLimit": 1000
    }'
) ON CONFLICT (id) DO NOTHING;

-- Insert default configurations for system tenant
INSERT INTO tenant_configurations (tenant_id, category, key, value) VALUES
    ('00000000-0000-0000-0000-000000000000', 'features', 'inventory', 'true'),
    ('00000000-0000-0000-0000-000000000000', 'features', 'contracts', 'true'),
    ('00000000-0000-0000-0000-000000000000', 'features', 'deliveries', 'true'),
    ('00000000-0000-0000-0000-000000000000', 'features', 'reports', 'true'),
    ('00000000-0000-0000-0000-000000000000', 'limits', 'maxUsers', '1000'),
    ('00000000-0000-0000-0000-000000000000', 'limits', 'maxSchools', '500'),
    ('00000000-0000-0000-0000-000000000000', 'limits', 'maxProducts', '10000'),
    ('00000000-0000-0000-0000-000000000000', 'branding', 'primaryColor', '"#1976d2"'),
    ('00000000-0000-0000-0000-000000000000', 'branding', 'secondaryColor', '"#dc004e"')
ON CONFLICT (tenant_id, category, key) DO NOTHING;

-- Create audit table for tenant operations
CREATE TABLE IF NOT EXISTS tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    operation VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, etc.
    entity_type VARCHAR(100), -- tenants, tenant_users, tenant_configurations
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_tenant_id ON tenant_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_operation ON tenant_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_created_at ON tenant_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_user_id ON tenant_audit_log(user_id);

-- Comments for documentation
COMMENT ON TABLE tenants IS 'Central registry of all tenants in the system';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier used in subdomains and routing';
COMMENT ON COLUMN tenants.settings IS 'JSON object containing tenant-specific feature flags and configurations';
COMMENT ON COLUMN tenants.limits IS 'JSON object containing resource limits and quotas for the tenant';

COMMENT ON TABLE tenant_configurations IS 'Flexible key-value configuration storage per tenant';
COMMENT ON COLUMN tenant_configurations.category IS 'Configuration category (features, limits, branding, etc.)';

COMMENT ON TABLE tenant_users IS 'Association table linking users to tenants with roles';
COMMENT ON COLUMN tenant_users.role IS 'User role within the tenant (tenant_admin, user, viewer)';

COMMENT ON TABLE tenant_audit_log IS 'Audit trail for all tenant-related operations';