-- Migration: Add configuration versioning and templates
-- Description: Adds tables for configuration versioning, rollback, and templates
-- Date: 2025-01-27

-- Configuration versions table for rollback capability
CREATE TABLE IF NOT EXISTS tenant_configuration_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    configurations JSONB NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT false,
    
    -- Ensure unique version per tenant
    UNIQUE(tenant_id, version)
);

-- Configuration templates table
CREATE TABLE IF NOT EXISTS tenant_configuration_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    configurations JSONB NOT NULL,
    target_tenant_types TEXT[], -- Array of tenant types this template applies to
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique template names
    UNIQUE(name)
);

-- Configuration change requests table for approval workflows
CREATE TABLE IF NOT EXISTS tenant_configuration_change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requested_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
    changes JSONB NOT NULL, -- Array of configuration changes
    description TEXT,
    auto_apply BOOLEAN DEFAULT false,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    applied_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

-- Configuration inheritance rules table
CREATE TABLE IF NOT EXISTS tenant_configuration_inheritance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    inheritance_type VARCHAR(50) NOT NULL CHECK (inheritance_type IN ('override', 'merge', 'append')),
    merge_strategy VARCHAR(50) CHECK (merge_strategy IN ('deep', 'shallow')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for category + key combination
    UNIQUE(category, key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_configuration_versions_tenant_id ON tenant_configuration_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_configuration_versions_version ON tenant_configuration_versions(tenant_id, version);
CREATE INDEX IF NOT EXISTS idx_tenant_configuration_versions_active ON tenant_configuration_versions(tenant_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_configuration_templates_default ON tenant_configuration_templates(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_tenant_configuration_templates_types ON tenant_configuration_templates USING GIN(target_tenant_types);

CREATE INDEX IF NOT EXISTS idx_tenant_configuration_change_requests_tenant_id ON tenant_configuration_change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_configuration_change_requests_status ON tenant_configuration_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_tenant_configuration_change_requests_requested_by ON tenant_configuration_change_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_tenant_configuration_inheritance_rules_category ON tenant_configuration_inheritance_rules(category);

-- Create triggers for updated_at
CREATE TRIGGER update_tenant_configuration_templates_updated_at 
    BEFORE UPDATE ON tenant_configuration_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_configuration_inheritance_rules_updated_at 
    BEFORE UPDATE ON tenant_configuration_inheritance_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a new configuration version
CREATE OR REPLACE FUNCTION create_tenant_configuration_version(
    p_tenant_id UUID,
    p_configurations JSONB,
    p_description TEXT DEFAULT NULL,
    p_created_by INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_next_version INTEGER;
    v_version_id UUID;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version), 0) + 1 
    INTO v_next_version
    FROM tenant_configuration_versions 
    WHERE tenant_id = p_tenant_id;
    
    -- Deactivate current active version
    UPDATE tenant_configuration_versions 
    SET is_active = false 
    WHERE tenant_id = p_tenant_id AND is_active = true;
    
    -- Insert new version
    INSERT INTO tenant_configuration_versions (
        tenant_id, version, configurations, description, created_by, is_active
    ) VALUES (
        p_tenant_id, v_next_version, p_configurations, p_description, p_created_by, true
    ) RETURNING id INTO v_version_id;
    
    -- Update tenant configurations table
    DELETE FROM tenant_configurations WHERE tenant_id = p_tenant_id;
    
    -- Insert new configurations
    INSERT INTO tenant_configurations (tenant_id, category, key, value)
    SELECT 
        p_tenant_id,
        category_key.key AS category,
        config_key.key AS key,
        config_key.value
    FROM jsonb_each(p_configurations) AS category_key(key, value)
    CROSS JOIN LATERAL jsonb_each(category_key.value) AS config_key(key, value)
    WHERE jsonb_typeof(category_key.value) = 'object';
    
    RETURN v_next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to rollback to a specific version
CREATE OR REPLACE FUNCTION rollback_tenant_configuration(
    p_tenant_id UUID,
    p_target_version INTEGER,
    p_description TEXT DEFAULT NULL,
    p_requested_by INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_target_configurations JSONB;
    v_new_version INTEGER;
BEGIN
    -- Get target version configurations
    SELECT configurations 
    INTO v_target_configurations
    FROM tenant_configuration_versions 
    WHERE tenant_id = p_tenant_id AND version = p_target_version;
    
    IF v_target_configurations IS NULL THEN
        RAISE EXCEPTION 'Version % not found for tenant %', p_target_version, p_tenant_id;
    END IF;
    
    -- Create new version with rollback configurations
    SELECT create_tenant_configuration_version(
        p_tenant_id,
        v_target_configurations,
        COALESCE(p_description, 'Rollback to version ' || p_target_version),
        p_requested_by
    ) INTO v_new_version;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Insert default configuration templates
INSERT INTO tenant_configuration_templates (
    id, name, description, configurations, target_tenant_types, is_default
) VALUES 
(
    uuid_generate_v4(),
    'Default System Configuration',
    'Default configuration for all tenants',
    '{
        "features": {
            "inventory": true,
            "contracts": true,
            "deliveries": true,
            "reports": true,
            "mobile": true,
            "analytics": false
        },
        "branding": {
            "primaryColor": "#1976d2",
            "secondaryColor": "#dc004e"
        },
        "notifications": {
            "email": true,
            "sms": false,
            "push": true
        },
        "integrations": {
            "whatsapp": false,
            "email": true,
            "sms": false
        },
        "limits": {
            "maxUsers": 100,
            "maxSchools": 50,
            "maxProducts": 1000,
            "storageLimit": 1024,
            "apiRateLimit": 100,
            "maxContracts": 50,
            "maxOrders": 1000
        }
    }',
    NULL,
    true
),
(
    uuid_generate_v4(),
    'Educational Institution',
    'Configuration template for educational institutions',
    '{
        "features": {
            "inventory": true,
            "contracts": true,
            "deliveries": true,
            "reports": true,
            "mobile": true,
            "analytics": true
        },
        "branding": {
            "primaryColor": "#2e7d32",
            "secondaryColor": "#1565c0"
        },
        "notifications": {
            "email": true,
            "sms": true,
            "push": true
        },
        "integrations": {
            "whatsapp": true,
            "email": true,
            "sms": true
        },
        "limits": {
            "maxUsers": 200,
            "maxSchools": 100,
            "maxProducts": 2000,
            "storageLimit": 2048,
            "apiRateLimit": 200,
            "maxContracts": 100,
            "maxOrders": 2000
        }
    }',
    ARRAY['educational'],
    false
),
(
    uuid_generate_v4(),
    'Municipality',
    'Configuration template for municipalities',
    '{
        "features": {
            "inventory": true,
            "contracts": true,
            "deliveries": true,
            "reports": true,
            "mobile": true,
            "analytics": true
        },
        "branding": {
            "primaryColor": "#1976d2",
            "secondaryColor": "#dc004e"
        },
        "notifications": {
            "email": true,
            "sms": false,
            "push": true
        },
        "integrations": {
            "whatsapp": false,
            "email": true,
            "sms": false
        },
        "limits": {
            "maxUsers": 500,
            "maxSchools": 200,
            "maxProducts": 5000,
            "storageLimit": 5120,
            "apiRateLimit": 500,
            "maxContracts": 200,
            "maxOrders": 5000
        }
    }',
    ARRAY['municipality'],
    false
);

-- Insert default inheritance rules
INSERT INTO tenant_configuration_inheritance_rules (category, key, inheritance_type, merge_strategy) VALUES
    ('features', '*', 'override', NULL),
    ('branding', '*', 'override', NULL),
    ('notifications', '*', 'override', NULL),
    ('integrations', '*', 'override', NULL),
    ('limits', '*', 'override', NULL);

-- Create initial version for existing tenants
INSERT INTO tenant_configuration_versions (tenant_id, version, configurations, description, is_active)
SELECT 
    t.id,
    1,
    jsonb_build_object(
        'features', COALESCE(t.settings->'features', '{}'),
        'branding', COALESCE(t.settings->'branding', '{}'),
        'notifications', COALESCE(t.settings->'notifications', '{}'),
        'integrations', COALESCE(t.settings->'integrations', '{}'),
        'limits', COALESCE(t.limits, '{}')
    ),
    'Initial configuration version',
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_configuration_versions tcv 
    WHERE tcv.tenant_id = t.id
);

-- Comments for documentation
COMMENT ON TABLE tenant_configuration_versions IS 'Stores versioned configurations for rollback capability';
COMMENT ON COLUMN tenant_configuration_versions.version IS 'Sequential version number per tenant';
COMMENT ON COLUMN tenant_configuration_versions.configurations IS 'Complete configuration snapshot for this version';
COMMENT ON COLUMN tenant_configuration_versions.is_active IS 'Indicates if this is the currently active version';

COMMENT ON TABLE tenant_configuration_templates IS 'Predefined configuration templates for different tenant types';
COMMENT ON COLUMN tenant_configuration_templates.target_tenant_types IS 'Array of tenant types this template applies to';
COMMENT ON COLUMN tenant_configuration_templates.is_default IS 'Indicates if this is the default template';

COMMENT ON TABLE tenant_configuration_change_requests IS 'Tracks configuration change requests for approval workflows';
COMMENT ON COLUMN tenant_configuration_change_requests.changes IS 'Array of configuration changes to be applied';
COMMENT ON COLUMN tenant_configuration_change_requests.auto_apply IS 'Whether changes should be applied automatically upon approval';

COMMENT ON TABLE tenant_configuration_inheritance_rules IS 'Defines how configuration inheritance works between parent and child configurations';
COMMENT ON COLUMN tenant_configuration_inheritance_rules.inheritance_type IS 'How values are inherited: override, merge, or append';
COMMENT ON COLUMN tenant_configuration_inheritance_rules.merge_strategy IS 'For merge type: deep or shallow merge strategy';