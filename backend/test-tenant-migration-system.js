/**
 * Test script for Tenant Migration System
 * Validates migration creation, execution, rollback, and recovery
 */

const { tenantMigrationService } = require('./dist/services/tenantMigrationService');
const { generateMigrationFromTemplate } = require('./dist/services/migrationTemplates');
const db = require('./dist/database');

async function testMigrationSystem() {
  console.log('🧪 Testing Tenant Migration System...\n');

  try {
    // Test 1: Initialize migration system
    console.log('1️⃣ Testing migration system initialization...');
    await testInitialization();
    console.log('✅ Migration system initialized successfully\n');

    // Test 2: Create migration from template
    console.log('2️⃣ Testing migration creation from template...');
    const migration = await testMigrationCreation();
    console.log('✅ Migration created successfully\n');

    // Test 3: Run migration
    console.log('3️⃣ Testing migration execution...');
    await testMigrationExecution(migration.id);
    console.log('✅ Migration executed successfully\n');

    // Test 4: Check migration status
    console.log('4️⃣ Testing migration status tracking...');
    await testMigrationStatus(migration.id);
    console.log('✅ Migration status tracked correctly\n');

    // Test 5: Rollback migration
    console.log('5️⃣ Testing migration rollback...');
    await testMigrationRollback(migration.id);
    console.log('✅ Migration rolled back successfully\n');

    // Test 6: Recovery mechanism
    console.log('6️⃣ Testing migration recovery...');
    await testMigrationRecovery(migration.id);
    console.log('✅ Migration recovery works correctly\n');

    // Test 7: Tenant-specific migrations
    console.log('7️⃣ Testing tenant-specific migrations...');
    await testTenantSpecificMigrations();
    console.log('✅ Tenant-specific migrations work correctly\n');

    // Test 8: Bulk operations
    console.log('8️⃣ Testing bulk migration operations...');
    await testBulkOperations();
    console.log('✅ Bulk operations work correctly\n');

    // Test 9: Validation and integrity
    console.log('9️⃣ Testing migration integrity validation...');
    await testIntegrityValidation();
    console.log('✅ Integrity validation works correctly\n');

    console.log('🎉 All migration system tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanup();
    if (db.pool) {
      await db.pool.end();
    }
  }
}

async function testInitialization() {
  // Check if migration tables exist
  const tablesResult = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('tenant_migration_definitions', 'tenant_migration_status')
    ORDER BY table_name
  `);

  if (tablesResult.rows.length !== 2) {
    throw new Error('Migration tables not properly initialized');
  }

  console.log('  ✓ Migration tracking tables exist');
}

async function testMigrationCreation() {
  // Generate migration from template
  const { upSql, downSql } = generateMigrationFromTemplate('addTenantId', {
    tableName: 'test_migration_table',
    defaultTenantId: '00000000-0000-0000-0000-000000000000',
    nullable: false,
    addIndex: true,
    addForeignKey: true
  });

  // Create test table first
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_migration_table (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create migration
  const migration = await tenantMigrationService.createMigration({
    name: 'test_add_tenant_id',
    description: 'Test migration for adding tenant_id column',
    upSql,
    downSql,
    tenantSpecific: false,
    dependencies: []
  });

  console.log(`  ✓ Migration created: ${migration.id}`);
  return migration;
}

async function testMigrationExecution(migrationId) {
  const result = await tenantMigrationService.runMigration(migrationId);
  
  if (!result.success) {
    throw new Error(`Migration execution failed: ${result.error}`);
  }

  // Verify the migration was applied
  const columnResult = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'test_migration_table' 
      AND column_name = 'tenant_id'
  `);

  if (columnResult.rows.length === 0) {
    throw new Error('tenant_id column was not added');
  }

  console.log(`  ✓ Migration executed in ${result.executionTime}ms`);
  console.log('  ✓ tenant_id column added successfully');
}

async function testMigrationStatus(migrationId) {
  const statuses = await tenantMigrationService.getMigrationStatus();
  const migrationStatus = statuses.find(s => s.migrationId === migrationId);

  if (!migrationStatus) {
    throw new Error('Migration status not found');
  }

  if (migrationStatus.status !== 'completed') {
    throw new Error(`Expected status 'completed', got '${migrationStatus.status}'`);
  }

  console.log(`  ✓ Migration status: ${migrationStatus.status}`);
  console.log(`  ✓ Applied at: ${migrationStatus.appliedAt}`);
}

async function testMigrationRollback(migrationId) {
  const result = await tenantMigrationService.rollbackMigration(migrationId);
  
  if (!result.success) {
    throw new Error(`Migration rollback failed: ${result.error}`);
  }

  // Verify the migration was rolled back
  const columnResult = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'test_migration_table' 
      AND column_name = 'tenant_id'
  `);

  if (columnResult.rows.length > 0) {
    throw new Error('tenant_id column was not removed during rollback');
  }

  console.log(`  ✓ Migration rolled back in ${result.executionTime}ms`);
  console.log('  ✓ tenant_id column removed successfully');
}

async function testMigrationRecovery(migrationId) {
  // First, simulate a failed migration by updating status
  await db.query(`
    UPDATE tenant_migration_status 
    SET status = 'failed', error = 'Simulated failure for testing'
    WHERE migration_id = $1
  `, [migrationId]);

  // Now recover the migration
  const result = await tenantMigrationService.recoverFailedMigration(migrationId);
  
  if (!result.success) {
    throw new Error(`Migration recovery failed: ${result.error}`);
  }

  console.log(`  ✓ Migration recovered successfully`);
  console.log(`  ✓ Recovery took ${result.executionTime}ms`);
}

async function testTenantSpecificMigrations() {
  // Create a test tenant
  const tenantResult = await db.query(`
    INSERT INTO tenants (id, slug, name, status, settings, limits)
    VALUES (
      'test-tenant-123e4567-e89b-12d3-a456-426614174000',
      'test-tenant',
      'Test Tenant',
      'active',
      '{}',
      '{}'
    )
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);

  const tenantId = tenantResult.rows[0].id;

  // Create tenant-specific migration
  const migration = await tenantMigrationService.createMigration({
    name: 'test_tenant_specific',
    description: 'Test tenant-specific migration',
    upSql: `
      -- Test tenant-specific operation
      INSERT INTO tenant_configurations (tenant_id, category, key, value)
      VALUES (current_setting('app.current_tenant_id')::UUID, 'test', 'migration_test', '"true"')
      ON CONFLICT (tenant_id, category, key) DO NOTHING;
    `,
    downSql: `
      -- Rollback tenant-specific operation
      DELETE FROM tenant_configurations 
      WHERE tenant_id = current_setting('app.current_tenant_id')::UUID 
        AND category = 'test' 
        AND key = 'migration_test';
    `,
    tenantSpecific: true,
    dependencies: []
  });

  // Run tenant-specific migration
  const results = await tenantMigrationService.runTenantMigrations(tenantId);
  
  if (results.length === 0 || !results[0].success) {
    throw new Error('Tenant-specific migration failed');
  }

  console.log(`  ✓ Tenant-specific migration executed for tenant: ${tenantId}`);
  console.log(`  ✓ ${results.length} migration(s) processed`);
}

async function testBulkOperations() {
  // Create test tables
  const testTables = ['bulk_test_1', 'bulk_test_2'];
  
  for (const tableName of testTables) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // Test bulk tenant_id addition
  const { generateBulkTenantIdMigration } = require('./dist/services/migrationTemplates');
  const { upSql, downSql } = generateBulkTenantIdMigration(
    testTables, 
    '00000000-0000-0000-0000-000000000000'
  );

  const migration = await tenantMigrationService.createMigration({
    name: 'test_bulk_tenant_id',
    description: 'Test bulk tenant_id addition',
    upSql,
    downSql,
    tenantSpecific: false,
    dependencies: []
  });

  const result = await tenantMigrationService.runMigration(migration.id);
  
  if (!result.success) {
    throw new Error(`Bulk migration failed: ${result.error}`);
  }

  // Verify columns were added to all tables
  for (const tableName of testTables) {
    const columnResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = 'tenant_id'
    `, [tableName]);

    if (columnResult.rows.length === 0) {
      throw new Error(`tenant_id column not added to ${tableName}`);
    }
  }

  console.log(`  ✓ Bulk migration added tenant_id to ${testTables.length} tables`);
}

async function testIntegrityValidation() {
  // Test validation without tenant
  const isValidGlobal = await tenantMigrationService.validateMigrationIntegrity();
  
  if (!isValidGlobal) {
    throw new Error('Global migration integrity validation failed');
  }

  // Test validation with tenant
  const tenantId = 'test-tenant-123e4567-e89b-12d3-a456-426614174000';
  const isValidTenant = await tenantMigrationService.validateMigrationIntegrity(tenantId);
  
  if (!isValidTenant) {
    throw new Error('Tenant migration integrity validation failed');
  }

  console.log('  ✓ Global migration integrity validated');
  console.log('  ✓ Tenant migration integrity validated');
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Clean up test tables
    const testTables = [
      'test_migration_table',
      'bulk_test_1', 
      'bulk_test_2'
    ];

    for (const tableName of testTables) {
      await db.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    }

    // Clean up test tenant
    await db.query(`
      DELETE FROM tenants 
      WHERE id = 'test-tenant-123e4567-e89b-12d3-a456-426614174000'
    `);

    // Clean up test migrations
    await db.query(`
      DELETE FROM tenant_migration_status 
      WHERE migration_id LIKE 'test_%' OR migration_id LIKE '%test_%'
    `);

    await db.query(`
      DELETE FROM tenant_migration_definitions 
      WHERE id LIKE 'test_%' OR id LIKE '%test_%'
    `);

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('⚠️  Cleanup error:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  testMigrationSystem();
}

module.exports = { testMigrationSystem };