-- Migration: Create institutions hierarchy
-- Description: Creates institution management for hierarchical multi-tenancy
-- Date: 2025-01-27

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Institutions table (Prefeituras/Organizações)
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255), -- Razão social
    document_number VARCHAR(20) UNIQUE, -- CNPJ
    type VARCHAR(50) DEFAULT 'prefeitura' CHECK (type IN ('prefeitura', 'secretaria', 'organizacao', 'empresa')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    
    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(20),
    website VARCHAR(255),
    
    -- Address
    address_street TEXT,
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zipcode VARCHAR(10),
    address_country VARCHAR(2) DEFAULT 'BR',
    
    -- Settings and limits
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{
        "max_tenants": 5,
        "max_users": 100,
        "max_schools": 50
    }',
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Update tenants table to link to institutions
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE;

-- Update usuarios table to link to institutions
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL;

-- Institution users table (for institution-level access control)
CREATE TABLE IF NOT EXISTS institution_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('institution_admin', 'manager', 'user')),
    permissions JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(institution_id, user_id)
);

-- Institution contracts table (for tracking contracts/agreements)
CREATE TABLE IF NOT EXISTS institution_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'service' CHECK (contract_type IN ('service', 'license', 'trial')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'cancelled')),
    
    -- Contract details
    start_date DATE NOT NULL,
    end_date DATE,
    value NUMERIC(15, 2),
    payment_frequency VARCHAR(20) CHECK (payment_frequency IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    
    -- Features and limits
    features JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON institutions(type);
CREATE INDEX IF NOT EXISTS idx_institutions_document ON institutions(document_number);

CREATE INDEX IF NOT EXISTS idx_tenants_institution_id ON tenants(institution_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_institution_id ON usuarios(institution_id);

CREATE INDEX IF NOT EXISTS idx_institution_users_institution_id ON institution_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_users_user_id ON institution_users(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_users_role ON institution_users(role);

CREATE INDEX IF NOT EXISTS idx_institution_contracts_institution_id ON institution_contracts(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_contracts_status ON institution_contracts(status);

-- Create triggers for updated_at
CREATE TRIGGER update_institutions_updated_at 
    BEFORE UPDATE ON institutions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institution_users_updated_at 
    BEFORE UPDATE ON institution_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institution_contracts_updated_at 
    BEFORE UPDATE ON institution_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit table for institution operations
CREATE TABLE IF NOT EXISTS institution_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    operation VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_institution_audit_log_institution_id ON institution_audit_log(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_audit_log_operation ON institution_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_institution_audit_log_created_at ON institution_audit_log(created_at);

-- Insert default system institution
INSERT INTO institutions (
    id,
    slug,
    name,
    type,
    status,
    settings,
    limits
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'sistema-principal',
    'Sistema Principal',
    'organizacao',
    'active',
    '{
        "features": {
            "multi_tenant": true,
            "advanced_reports": true
        }
    }',
    '{
        "max_tenants": 999,
        "max_users": 9999,
        "max_schools": 9999
    }'
) ON CONFLICT (id) DO NOTHING;

-- Link existing system tenant to system institution
UPDATE tenants 
SET institution_id = '00000000-0000-0000-0000-000000000001'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Comments for documentation
COMMENT ON TABLE institutions IS 'Organizations (prefeituras, secretarias) that own tenants';
COMMENT ON COLUMN institutions.slug IS 'URL-friendly identifier for the institution';
COMMENT ON COLUMN institutions.limits IS 'Resource limits for the institution (max tenants, users, etc.)';

COMMENT ON TABLE institution_users IS 'Users associated with institutions and their roles';
COMMENT ON COLUMN institution_users.role IS 'User role at institution level (institution_admin, manager, user)';

COMMENT ON TABLE institution_contracts IS 'Contracts and agreements with institutions';
