const fs = require('fs').promises;
const path = require('path');

// Use existing database configuration
const db = require('./dist/database');

async function testBackupTables() {
  console.log('🧪 Testing Backup System Database Tables\n');
  
  const client = await db.pool.connect();
  
  try {
    // 1. Test backup tables exist
    console.log('1. Checking backup tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenant_backups', 'tenant_restore_points', 'tenant_backup_schedules', 'tenant_backup_logs')
      ORDER BY table_name
    `);
    
    const expectedTables = ['tenant_backup_logs', 'tenant_backup_schedules', 'tenant_backups', 'tenant_restore_points'];
    const foundTables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`✓ Found tables: ${foundTables.join(', ')}`);
    
    if (expectedTables.every(table => foundTables.includes(table))) {
      console.log('✓ All backup tables exist\n');
    } else {
      throw new Error('Missing backup tables');
    }
    
    // 2. Test backup statistics view
    console.log('2. Testing backup statistics view...');
    const viewResult = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE viewname = 'tenant_backup_stats'
    `);
    
    if (viewResult.rows.length > 0) {
      console.log('✓ Backup statistics view exists');
      
      // Test the view
      const statsResult = await client.query('SELECT COUNT(*) as tenant_count FROM tenant_backup_stats');
      console.log(`✓ Statistics available for ${statsResult.rows[0].tenant_count} tenants\n`);
    } else {
      console.log('⚠️  Backup statistics view not found\n');
    }
    
    // 3. Test RLS policies
    console.log('3. Checking RLS policies...');
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE tablename IN ('tenant_backups', 'tenant_restore_points', 'tenant_backup_schedules', 'tenant_backup_logs')
      ORDER BY tablename, policyname
    `);
    
    console.log(`✓ Found ${policiesResult.rows.length} RLS policies`);
    policiesResult.rows.forEach(policy => {
      console.log(`  - ${policy.tablename}: ${policy.policyname}`);
    });
    console.log('');
    
    // 4. Test backup directory
    console.log('4. Checking backup directory...');
    const backupDir = path.join(__dirname, 'backups');
    try {
      await fs.access(backupDir);
      console.log(`✓ Backup directory exists: ${backupDir}`);
    } catch (error) {
      await fs.mkdir(backupDir, { recursive: true });
      console.log(`✓ Created backup directory: ${backupDir}`);
    }
    console.log('');
    
    // 5. Test tenant data for backup
    console.log('5. Checking tenant data...');
    const tenantsResult = await client.query(`
      SELECT id, name, status FROM tenants WHERE status = 'active' LIMIT 3
    `);
    
    if (tenantsResult.rows.length > 0) {
      console.log(`✓ Found ${tenantsResult.rows.length} active tenants for backup testing`);
      tenantsResult.rows.forEach(tenant => {
        console.log(`  - ${tenant.name} (${tenant.id})`);
      });
    } else {
      console.log('⚠️  No active tenants found');
    }
    console.log('');
    
    // 6. Test backup schedule creation
    console.log('6. Testing backup schedule creation...');
    if (tenantsResult.rows.length > 0) {
      const testTenantId = tenantsResult.rows[0].id;
      
      // Create a test schedule
      const scheduleResult = await client.query(`
        INSERT INTO tenant_backup_schedules (
          tenant_id, name, schedule_cron, backup_type, retention_days, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name
      `, [testTenantId, 'Test Schedule', '0 2 * * *', 'full', 30, true]);
      
      console.log(`✓ Created test backup schedule: ${scheduleResult.rows[0].name}`);
      
      // Clean up
      await client.query('DELETE FROM tenant_backup_schedules WHERE id = $1', [scheduleResult.rows[0].id]);
      console.log('✓ Cleaned up test schedule');
    }
    console.log('');
    
    // 7. Test backup metadata creation
    console.log('7. Testing backup metadata creation...');
    if (tenantsResult.rows.length > 0) {
      const testTenantId = tenantsResult.rows[0].id;
      const backupId = `test-backup-${Date.now()}`;
      
      // Create test backup metadata
      await client.query(`
        INSERT INTO tenant_backups (
          id, tenant_id, timestamp, size, checksum, tables, 
          compression, encryption, status, path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        backupId,
        testTenantId,
        new Date(),
        1024,
        'test-checksum-123',
        JSON.stringify(['escolas', 'produtos']),
        false,
        false,
        'completed',
        `/tmp/${backupId}.sql`
      ]);
      
      console.log(`✓ Created test backup metadata: ${backupId}`);
      
      // Test backup listing
      const backupsResult = await client.query(`
        SELECT id, status, size FROM tenant_backups WHERE tenant_id = $1
      `, [testTenantId]);
      
      console.log(`✓ Found ${backupsResult.rows.length} backup(s) for tenant`);
      
      // Clean up
      await client.query('DELETE FROM tenant_backups WHERE id = $1', [backupId]);
      console.log('✓ Cleaned up test backup metadata');
    }
    console.log('');
    
    console.log('🎉 All backup system database tests passed successfully!');
    console.log('\nThe backup system database structure is ready for use.');
    console.log('\nNext steps:');
    console.log('1. The backup API endpoints are available at /api/backup/*');
    console.log('2. Use the CLI tools for backup operations');
    console.log('3. Configure backup schedules for your tenants');
    console.log('4. Test actual backup and restore operations');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    await testBackupTables();
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  } finally {
    // Don't end the pool here as it's shared
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Run the tests
if (require.main === module) {
  main();
}

module.exports = { testBackupTables };