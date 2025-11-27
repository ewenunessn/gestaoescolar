-- Migration: Add default_tenant_id to institutions table
-- This allows institutions to specify which tenant should be used by default for their users

-- Add default_tenant_id column
ALTER TABLE institutions 
ADD COLUMN IF NOT EXISTS default_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_institutions_default_tenant 
ON institutions(default_tenant_id);

-- Add comment
COMMENT ON COLUMN institutions.default_tenant_id IS 'Default tenant for users of this institution';
