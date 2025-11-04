/**
 * Initialize Tenant Migration System
 * Sets up the migration tracking tables and creates initial migrations
 */

const fs = require('fs');
const path = require('path');
const db = require('./dist/database');

async function initializeMigrationSystem() {
  console.log('🚀 Initializing Tenant Migration System...\n');

  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected successfully\n');

    // Create migration tracking tables
    console.log('2️⃣ Creating migration tracking tables...');
    await createMigrationTables();
    console.log('✅ Migration tracking tables created\n');

    // Create migrations directory
    console.log('3️⃣ Setting up migrations directory...');
    await setupMigrationsDirectory();
    console.log('✅ Migrations directory set up\n');

    // Initialize migration system migration
    console.log('4️⃣ Creating initial system migration...');
    await createInitialMigration();
    console.log('✅ Initial migration created\n');

    // Verify setup
    console.log('5️⃣ Verifying setup...');
    await verifySetup();
    console.log('✅ Setup verified successfully\n');

    console.log('🎉 Tenant Migration System initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run migrate:tenant-system run');
    console.log('2. Check status: npm run migrate:tenant-system status');
    console.log('3. Create new migration: npm run migrate:tenant-system create <name> <description>');

  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (db.pool) {
      await db.pool.end();
    }
  }
}

async function createMigrationTables() {
  // Read the initialization SQL
  const sqlPath = path.join(__dirname, 'migrations', 'tenant', '001_initialize_migration_system.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Execute the SQL
  await db.query(sql);

  console.log('  ✓ tenant_migration_definitions table created');
  console.log('  ✓ tenant_migration_status table created');
  console.log('  ✓ Indexes created for performance');
}

async function setupMigrationsDirectory() {
  const migrationsDir = path.join(__dirname, 'migrations', 'tenant');
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Create subdirectories for organization
  const subdirs = ['system', 'tenant-specific', 'data'];
  
  for (const subdir of subdirs) {
    const subdirPath = path.join(migrationsDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }

  console.log('  ✓ Migrations directory structure created');
  console.log('  ✓ Subdirectories: system, tenant-specific, data');
}

async function createInitialMigration() {
  // Insert the initial migration definition
  const migrationId = '001_initialize_migration_system';
  const name = 'Initialize Migration System';
  const description = 'Create migration tracking tables and initial setup';
  
  const upSql = fs.readFileSync(
    path.join(__dirname, 'migrations', 'tenant', '001_initialize_migration_system.sql'), 
    'utf8'
  );
  
  const downSql = `
-- Rollback migration system initialization
DROP TABLE IF EXISTS tenant_migration_status CASCADE;
DROP TABLE IF EXISTS tenant_migration_definitions CASCADE;
  `.trim();

  // Insert migration definition
  await db.query(`
    INSERT INTO tenant_migration_definitions (
      id, name, description, up_sql, down_sql, tenant_specific, dependencies
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      up_sql = EXCLUDED.up_sql,
      down_sql = EXCLUDED.down_sql
  `, [
    migrationId,
    name,
    description,
    upSql,
    downSql,
    false,
    JSON.stringify([])
  ]);

  // Mark as completed since we already ran it
  await db.query(`
    INSERT INTO tenant_migration_status (
      migration_id, tenant_id, status, applied_at, execution_time
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (migration_id, tenant_id) DO UPDATE SET
      status = EXCLUDED.status,
      applied_at = EXCLUDED.applied_at
  `, [
    migrationId,
    null,
    'completed',
    new Date(),
    0
  ]);

  console.log(`  ✓ Initial migration registered: ${migrationId}`);
  console.log('  ✓ Migration marked as completed');
}

async function verifySetup() {
  // Check migration tables exist
  const tablesResult = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('tenant_migration_definitions', 'tenant_migration_status')
    ORDER BY table_name
  `);

  if (tablesResult.rows.length !== 2) {
    throw new Error('Migration tables not found after setup');
  }

  // Check initial migration exists
  const migrationResult = await db.query(`
    SELECT md.id, ms.status 
    FROM tenant_migration_definitions md
    LEFT JOIN tenant_migration_status ms ON md.id = ms.migration_id AND ms.tenant_id IS NULL
    WHERE md.id = '001_initialize_migration_system'
  `);

  if (migrationResult.rows.length === 0) {
    throw new Error('Initial migration not found');
  }

  const migration = migrationResult.rows[0];
  if (migration.status !== 'completed') {
    throw new Error('Initial migration not marked as completed');
  }

  console.log('  ✓ Migration tracking tables verified');
  console.log('  ✓ Initial migration verified');
  console.log('  ✓ System ready for migrations');
}

// Run initialization if called directly
if (require.main === module) {
  initializeMigrationSystem();
}

module.exports = { initializeMigrationSystem };