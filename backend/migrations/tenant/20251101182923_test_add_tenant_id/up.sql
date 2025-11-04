-- Add tenant_id column to test_migration_table
ALTER TABLE test_migration_table ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL;

-- Add foreign key constraint
ALTER TABLE test_migration_table ADD CONSTRAINT fk_test_migration_table_tenant_id 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_test_migration_table_tenant_id ON test_migration_table(tenant_id);

