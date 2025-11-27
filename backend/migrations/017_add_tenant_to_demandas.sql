-- Migration: Add tenant_id to demandas table
-- Created: 2024-11-18

-- Add tenant_id column to demandas
ALTER TABLE demandas 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index for tenant filtering
CREATE INDEX IF NOT EXISTS idx_demandas_tenant_id ON demandas(tenant_id);

-- Update existing records to use a default tenant (if any exists)
-- This should be run carefully in production
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Get the first tenant as default (adjust as needed)
  SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
  
  IF default_tenant_id IS NOT NULL THEN
    UPDATE demandas 
    SET tenant_id = default_tenant_id 
    WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Make tenant_id NOT NULL after data migration
ALTER TABLE demandas 
ALTER COLUMN tenant_id SET NOT NULL;

-- Add RLS policy for demandas
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS demandas_tenant_isolation ON demandas;

-- Create RLS policy
CREATE POLICY demandas_tenant_isolation ON demandas
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Add comment
COMMENT ON COLUMN demandas.tenant_id IS 'Tenant ID for multi-tenant isolation';
