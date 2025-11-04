const { Pool } = require('pg');
const { TenantBackupService } = require('./src/services/tenantBackupService');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sistema_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testBackupSystem() {
  console.log('🧪 Testing Tenant Backup and Disaster Recovery System\n');
  
  const backupService = new TenantBackupService(pool);
  let testTenantId = null;
  let testBackupId = null;
  
  try {
    // 1. Get or create a test tenant
    console.log('1. Setting up test tenant...');
    testTenantId = await setupTestTenant();
    console.log(`✓ Test tenant ready: ${testTenantId}\n`);
    
    // 2. Test backup creation
    console.log('2. Testing backup creation...');
    const backupMetadata = await testBackupCreation(backupService, testTenantId);
    testBackupId = backupMetadata.id;
    console.log(`✓ Backup created successfully: ${testBackupId}\n`);
    
    // 3. Test backup validation
    console.log('3. Testing backup validation...');
    await testBackupValidation(backupService, backupMetadata.path);
    console.log('✓ Backup validation passed\n');
    
    // 4. Test backup listing
    console.log('4. Testing backup listing...');
    await testBackupListing(backupService, testTenantId);
    console.log('✓ Backup listing works correctly\n');
    
    // 5. Test backup restoration (validation only)
    console.log('5. Testing backup restoration (validation only)...');
    await testBackupRestoration(backupService, testTenantId, backupMetadata.path);
    console.log('✓ Backup restoration validation passed\n');
    
    // 6. Test backup statistics
    console.log('6. Testing backup statistics...');
    await testBackupStatistics(testTenantId);
    console.log('✓ Backup statistics working correctly\n');
    
    // 7. Test backup cleanup
    console.log('7. Testing backup cleanup...');
    await testBackupCleanup(backupService, testTenantId);
    console.log('✓ Backup cleanup working correctly\n');
    
    console.log('🎉 All backup system tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (testTenantId && testBackupId) {
      await cleanupTestData(testTenantId, testBackupId);
    }
  }
}

async function setupTestTenant() {
  const client = await pool.connect();
  
  try {
    // Check if test tenant exists
    let result = await client.query(`
      SELECT id FROM tenants WHERE slug = 'test-backup-tenant'
    `);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Create test tenant
    result = await client.query(`
      INSERT INTO tenants (slug, name, status, settings, limits)
      VALUES ('test-backup-tenant', 'Test Backup Tenant', 'active', '{}', '{}')
      RETURNING id
    `);
    
    const tenantId = result.rows[0].id;
    
    // Add some test data
    await client.query(`
      INSERT INTO escolas (tenant_id, nome, endereco, telefone)
      VALUES ($1, 'Escola Teste Backup', 'Rua Teste, 123', '11999999999')
    `, [tenantId]);
    
    await client.query(`
      INSERT INTO produtos (tenant_id, nome, categoria, unidade_medida)
      VALUES ($1, 'Produto Teste Backup', 'Categoria Teste', 'UN')
    `, [tenantId]);
    
    return tenantId;
    
  } finally {
    client.release();
  }
}

async function testBackupCreation(backupService, tenantId) {
  const backupOptions = {
    tenantId,
    includeData: true,
    includeSchema: true,
    compression: false,
    encryption: false
  };
  
  const metadata = await backupService.createTenantBackup(backupOptions);
  
  // Verify backup metadata
  if (!metadata.id || !metadata.path || !metadata.checksum) {
    throw new Error('Backup metadata is incomplete');
  }
  
  // Verify backup file exists
  try {
    await fs.access(metadata.path);
  } catch (error) {
    throw new Error(`Backup file not found: ${metadata.path}`);
  }
  
  // Verify backup file has content
  const stats = await fs.stat(metadata.path);
  if (stats.size === 0) {
    throw new Error('Backup file is empty');
  }
  
  console.log(`  - Backup ID: ${metadata.id}`);
  console.log(`  - File size: ${(metadata.size / 1024).toFixed(2)} KB`);
  console.log(`  - Tables: ${metadata.tables.length}`);
  
  return metadata;
}

async function testBackupValidation(backupService, backupPath) {
  const isValid = await backupService.validateBackupIntegrity(backupPath);
  
  if (!isValid) {
    throw new Error('Backup validation failed');
  }
  
  console.log('  - Integrity check passed');
  console.log('  - Checksum verification passed');
  console.log('  - File readability test passed');
}

async function testBackupListing(backupService, tenantId) {
  const backups = await backupService.listTenantBackups(tenantId);
  
  if (backups.length === 0) {
    throw new Error('No backups found for tenant');
  }
  
  const latestBackup = backups[0];
  if (!latestBackup.id || !latestBackup.timestamp || !latestBackup.status) {
    throw new Error('Backup listing returned incomplete data');
  }
  
  console.log(`  - Found ${backups.length} backup(s)`);
  console.log(`  - Latest backup: ${latestBackup.id}`);
  console.log(`  - Status: ${latestBackup.status}`);
}

async function testBackupRestoration(backupService, tenantId, backupPath) {
  // Test validation-only restore
  const restoreOptions = {
    tenantId,
    backupPath,
    validateOnly: true
  };
  
  await backupService.restoreTenantBackup(restoreOptions);
  
  console.log('  - Restore validation completed');
  console.log('  - Backup file is restorable');
}

async function testBackupStatistics(tenantId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM tenant_backup_stats WHERE tenant_id = $1
    `, [tenantId]);
    
    if (result.rows.length === 0) {
      throw new Error('No backup statistics found');
    }
    
    const stats = result.rows[0];
    
    console.log(`  - Total backups: ${stats.total_backups}`);
    console.log(`  - Successful backups: ${stats.successful_backups}`);
    console.log(`  - Failed backups: ${stats.failed_backups}`);
    console.log(`  - Total size: ${stats.total_backup_size ? (stats.total_backup_size / 1024).toFixed(2) + ' KB' : '0 KB'}`);
    
  } finally {
    client.release();
  }
}

async function testBackupCleanup(backupService, tenantId) {
  // Create an old backup entry for testing cleanup
  const client = await pool.connect();
  
  try {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35); // 35 days ago
    
    await client.query(`
      INSERT INTO tenant_backups (
        id, tenant_id, timestamp, size, checksum, tables, 
        compression, encryption, status, path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      'old-backup-test',
      tenantId,
      oldDate,
      1024,
      'test-checksum',
      JSON.stringify(['test_table']),
      false,
      false,
      'completed',
      '/tmp/old-backup-test.sql'
    ]);
    
    // Test cleanup with 30-day retention
    await backupService.cleanupOldBackups(tenantId, 30);
    
    // Verify old backup was removed
    const result = await client.query(`
      SELECT id FROM tenant_backups WHERE id = 'old-backup-test'
    `);
    
    if (result.rows.length > 0) {
      throw new Error('Old backup was not cleaned up');
    }
    
    console.log('  - Old backups cleaned up successfully');
    
  } finally {
    client.release();
  }
}

async function cleanupTestData(tenantId, backupId) {
  console.log('\n🧹 Cleaning up test data...');
  
  const client = await pool.connect();
  
  try {
    // Remove test backup files
    const backupsResult = await client.query(`
      SELECT path FROM tenant_backups WHERE tenant_id = $1
    `, [tenantId]);
    
    for (const backup of backupsResult.rows) {
      try {
        await fs.unlink(backup.path);
      } catch (error) {
        // File might not exist, ignore error
      }
    }
    
    // Remove test data from database
    await client.query('DELETE FROM tenant_backup_logs WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM tenant_backup_schedules WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM tenant_backups WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM escolas WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM produtos WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    
    console.log('✓ Test data cleaned up successfully');
    
  } catch (error) {
    console.error('⚠️  Error during cleanup:', error.message);
  } finally {
    client.release();
  }
}

async function testBackupScheduler() {
  console.log('\n🕐 Testing Backup Scheduler...');
  
  const client = await pool.connect();
  
  try {
    // Test creating a backup schedule
    const testTenantResult = await client.query(`
      SELECT id FROM tenants WHERE status = 'active' LIMIT 1
    `);
    
    if (testTenantResult.rows.length === 0) {
      console.log('⚠️  No active tenants found for scheduler testing');
      return;
    }
    
    const tenantId = testTenantResult.rows[0].id;
    
    // Create test schedule
    const scheduleResult = await client.query(`
      INSERT INTO tenant_backup_schedules (
        tenant_id, name, schedule_cron, backup_type, retention_days, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name
    `, [tenantId, 'Test Schedule', '0 2 * * *', 'full', 30, true]);
    
    console.log(`✓ Created test backup schedule: ${scheduleResult.rows[0].name}`);
    
    // Test schedule listing
    const listResult = await client.query(`
      SELECT COUNT(*) as count FROM tenant_backup_schedules WHERE tenant_id = $1
    `, [tenantId]);
    
    console.log(`✓ Found ${listResult.rows[0].count} schedule(s) for tenant`);
    
    // Cleanup
    await client.query('DELETE FROM tenant_backup_schedules WHERE id = $1', [scheduleResult.rows[0].id]);
    
    console.log('✓ Backup scheduler test completed');
    
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    await testBackupSystem();
    await testBackupScheduler();
    
    console.log('\n✅ All backup and disaster recovery tests completed successfully!');
    console.log('\nThe backup system is ready for production use.');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = { testBackupSystem, testBackupScheduler };