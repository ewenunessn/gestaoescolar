-- Initialize Tenant Migration System
-- This migration sets up the migration tracking tables

-- Create migration definitions table
CREATE TABLE IF NOT EXISTS tenant_migration_definitions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  up_sql TEXT NOT NULL,
  down_sql TEXT NOT NULL,
  tenant_specific BOOLEAN DEFAULT false,
  dependencies JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create migration status table
CREATE TABLE IF NOT EXISTS tenant_migration_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id VARCHAR(255) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  applied_at TIMESTAMP,
  rolled_back_at TIMESTAMP,
  error TEXT,
  execution_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(migration_id, tenant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_status_tenant 
ON tenant_migration_status(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_migration_status_migration 
ON tenant_migration_status(migration_id, status);

-- Create index on migration definitions
CREATE INDEX IF NOT EXISTS idx_migration_definitions_created 
ON tenant_migration_definitions(created_at);

-- Grant permissions
GRANT ALL ON tenant_migration_definitions TO postgres;
GRANT ALL ON tenant_migration_status TO postgres;