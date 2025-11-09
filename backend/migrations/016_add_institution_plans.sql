-- Migration: Add institution plans and limits
-- Description: Creates plans table and updates institutions with plan_id
-- Date: 2025-01-27

-- Plans table
CREATE TABLE IF NOT EXISTS institution_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(10, 2) DEFAULT 0,
    billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'one_time')),
    
    -- Limits
    max_users INTEGER DEFAULT 10,
    max_schools INTEGER DEFAULT 5,
    max_tenants INTEGER DEFAULT 1,
    max_storage_mb INTEGER DEFAULT 1024,
    
    -- Features
    features JSONB DEFAULT '{
        "multi_tenant": false,
        "advanced_reports": false,
        "api_access": false,
        "custom_branding": false,
        "priority_support": false
    }',
    
    -- Status
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add plan_id to institutions
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES institution_plans(id);

-- Create trigger for updated_at
CREATE TRIGGER update_institution_plans_updated_at 
    BEFORE UPDATE ON institution_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default plans
INSERT INTO institution_plans (name, slug, description, price, billing_period, max_users, max_schools, max_tenants, max_storage_mb, features, display_order) VALUES
    (
        'Gratuito',
        'free',
        'Plano básico para começar',
        0,
        'monthly',
        5,
        3,
        1,
        512,
        '{
            "multi_tenant": false,
            "advanced_reports": false,
            "api_access": false,
            "custom_branding": false,
            "priority_support": false
        }',
        1
    ),
    (
        'Básico',
        'basic',
        'Ideal para pequenas instituições',
        99.90,
        'monthly',
        20,
        10,
        2,
        2048,
        '{
            "multi_tenant": true,
            "advanced_reports": false,
            "api_access": false,
            "custom_branding": false,
            "priority_support": false
        }',
        2
    ),
    (
        'Profissional',
        'professional',
        'Para instituições em crescimento',
        299.90,
        'monthly',
        50,
        30,
        5,
        5120,
        '{
            "multi_tenant": true,
            "advanced_reports": true,
            "api_access": true,
            "custom_branding": false,
            "priority_support": true
        }',
        3
    ),
    (
        'Empresarial',
        'enterprise',
        'Solução completa para grandes instituições',
        999.90,
        'monthly',
        200,
        100,
        20,
        20480,
        '{
            "multi_tenant": true,
            "advanced_reports": true,
            "api_access": true,
            "custom_branding": true,
            "priority_support": true
        }',
        4
    ),
    (
        'Ilimitado',
        'unlimited',
        'Sem limites para o sistema principal',
        0,
        'one_time',
        9999,
        9999,
        999,
        999999,
        '{
            "multi_tenant": true,
            "advanced_reports": true,
            "api_access": true,
            "custom_branding": true,
            "priority_support": true
        }',
        5
    )
ON CONFLICT (slug) DO NOTHING;

-- Update existing institutions to use plans
UPDATE institutions 
SET plan_id = (SELECT id FROM institution_plans WHERE slug = 'free')
WHERE plan_id IS NULL AND slug != 'sistema-principal';

UPDATE institutions 
SET plan_id = (SELECT id FROM institution_plans WHERE slug = 'unlimited')
WHERE plan_id IS NULL AND slug = 'sistema-principal';

-- Update institutions limits based on plan
UPDATE institutions i
SET limits = jsonb_build_object(
    'max_users', p.max_users,
    'max_schools', p.max_schools,
    'max_tenants', p.max_tenants,
    'max_storage_mb', p.max_storage_mb
)
FROM institution_plans p
WHERE i.plan_id = p.id;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_institution_plans_slug ON institution_plans(slug);
CREATE INDEX IF NOT EXISTS idx_institution_plans_active ON institution_plans(active);
CREATE INDEX IF NOT EXISTS idx_institutions_plan_id ON institutions(plan_id);

-- Comments
COMMENT ON TABLE institution_plans IS 'Available plans for institutions with limits and features';
COMMENT ON COLUMN institution_plans.max_users IS 'Maximum number of users allowed';
COMMENT ON COLUMN institution_plans.max_schools IS 'Maximum number of schools allowed';
COMMENT ON COLUMN institution_plans.max_tenants IS 'Maximum number of tenants allowed';
COMMENT ON COLUMN institution_plans.features IS 'JSON object with enabled features';
