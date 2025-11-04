const fs = require('fs').promises;
const path = require('path');

// Use existing database configuration
const db = require('./dist/database');

async function runBackupMigration() {
  const client = await db.pool.connect();
  
  try {
    console.log('Starting backup and disaster recovery migration...');
    
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, 'migrations', '010_create_backup_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✓ Backup tables created successfully');
    
    // Verify the tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('tenant_backups', 'tenant_restore_points', 'tenant_backup_schedules', 'tenant_backup_logs')
      ORDER BY table_name
    `);
    
    console.log('✓ Created tables:', tablesResult.rows.map(row => row.table_name));
    
    // Check if backup directories exist and create them
    const backupDir = path.join(__dirname, 'backups');
    try {
      await fs.access(backupDir);
      console.log('✓ Backup directory already exists');
    } catch (error) {
      await fs.mkdir(backupDir, { recursive: true });
      console.log('✓ Created backup directory');
    }
    
    // Verify RLS policies
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE tablename IN ('tenant_backups', 'tenant_restore_points', 'tenant_backup_schedules', 'tenant_backup_logs')
      ORDER BY tablename, policyname
    `);
    
    console.log('✓ RLS policies created:', policiesResult.rows.length);
    
    // Check backup statistics view
    const viewResult = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE viewname = 'tenant_backup_stats'
    `);
    
    if (viewResult.rows.length > 0) {
      console.log('✓ Backup statistics view created');
    }
    
    // Test basic functionality
    console.log('\nTesting backup system functionality...');
    
    // Get active tenants
    const tenantsResult = await client.query(`
      SELECT id, name FROM tenants WHERE status = 'active' LIMIT 3
    `);
    
    if (tenantsResult.rows.length > 0) {
      console.log(`✓ Found ${tenantsResult.rows.length} active tenants for testing`);
      
      // Check if default backup schedules were created
      const schedulesResult = await client.query(`
        SELECT COUNT(*) as count FROM tenant_backup_schedules
      `);
      
      console.log(`✓ Default backup schedules created: ${schedulesResult.rows[0].count}`);
    }
    
    // Test backup statistics view
    const statsResult = await client.query(`
      SELECT COUNT(*) as tenant_count FROM tenant_backup_stats
    `);
    
    console.log(`✓ Backup statistics available for ${statsResult.rows[0].tenant_count} tenants`);
    
    console.log('\n🎉 Backup and disaster recovery migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your main application to include backup routes');
    console.log('2. Start the backup scheduler service');
    console.log('3. Configure backup schedules for your tenants');
    console.log('4. Test backup and restore operations');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function testBackupSystem() {
  const client = await db.pool.connect();
  
  try {
    console.log('\n--- Testing Backup System ---');
    
    // Test creating a backup schedule
    const testTenantResult = await client.query(`
      SELECT id FROM tenants WHERE status = 'active' LIMIT 1
    `);
    
    if (testTenantResult.rows.length === 0) {
      console.log('⚠️  No active tenants found for testing');
      return;
    }
    
    const testTenantId = testTenantResult.rows[0].id;
    
    // Create a test backup schedule
    const scheduleResult = await client.query(`
      INSERT INTO tenant_backup_schedules (
        tenant_id, name, schedule_cron, backup_type, retention_days
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name
    `, [testTenantId, 'Test Backup Schedule', '0 3 * * *', 'full', 7]);
    
    console.log(`✓ Created test backup schedule: ${scheduleResult.rows[0].name}`);
    
    // Test backup log entry
    const logResult = await client.query(`
      INSERT INTO tenant_backup_logs (
        tenant_id, operation_type, status, start_time
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING id
    `, [testTenantId, 'backup', 'completed']);
    
    console.log(`✓ Created test backup log entry: ${logResult.rows[0].id}`);
    
    // Test backup statistics
    const statsResult = await client.query(`
      SELECT * FROM tenant_backup_stats WHERE tenant_id = $1
    `, [testTenantId]);
    
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`✓ Backup statistics: ${stats.total_backups} total, ${stats.successful_backups} successful`);
    }
    
    // Clean up test data
    await client.query('DELETE FROM tenant_backup_logs WHERE tenant_id = $1', [testTenantId]);
    await client.query('DELETE FROM tenant_backup_schedules WHERE tenant_id = $1 AND name = $2', [testTenantId, 'Test Backup Schedule']);
    
    console.log('✓ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Backup system test failed:', error);
  } finally {
    client.release();
  }
}

// Main execution
async function main() {
  try {
    await runBackupMigration();
    await testBackupSystem();
  } catch (error) {
    console.error('Migration failed:', error);
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

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { runBackupMigration, testBackupSystem };