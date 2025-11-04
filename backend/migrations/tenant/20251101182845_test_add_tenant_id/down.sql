-- Remove tenant_id column from test_migration_table
ALTER TABLE test_migration_table DROP CONSTRAINT IF EXISTS fk_test_migration_table_tenant_id;
DROP INDEX IF EXISTS idx_test_migration_table_tenant_id;
ALTER TABLE test_migration_table DROP COLUMN IF EXISTS tenant_id;
