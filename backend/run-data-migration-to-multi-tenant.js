#!/usr/bin/env node

/**
 * Data Migration Script for Multi-Tenant Architecture
 * 
 * This script migrates existing single-tenant data to multi-tenant structure
 * with comprehensive validation, backup, and rollback capabilities.
 * 
 * Usage:
 *   node run-data-migration-to-multi-tenant.js [options]
 * 
 * Options:
 *   --dry-run          Run validation only, don't perform migration
 *   --no-backup        Skip creating backup tables (not recommended)
 *   --tenant-id        Specify custom tenant ID (default: system tenant)
 *   --rollback         Rollback migration using backup tables
 *   --validate-only    Only run validation checks
 *   --help             Show this help message
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gestao_escolar',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

// Default system tenant ID
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

// Command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  noBackup: args.includes('--no-backup'),
  rollback: args.includes('--rollback'),
  validateOnly: args.includes('--validate-only'),
  help: args.includes('--help'),
  tenantId: args.find(arg => arg.startsWith('--tenant-id='))?.split('=')[1] || DEFAULT_TENANT_ID
};

function showHelp() {
  console.log(`
Data Migration Script for Multi-Tenant Architecture

Usage:
  node run-data-migration-to-multi-tenant.js [options]

Options:
  --dry-run          Run validation only, don't perform migration
  --no-backup        Skip creating backup tables (not recommended)
  --tenant-id=ID     Specify custom tenant ID (default: system tenant)
  --rollback         Rollback migration using backup tables
  --validate-only    Only run validation checks
  --help             Show this help message

Examples:
  # Run full migration with backups
  node run-data-migration-to-multi-tenant.js

  # Dry run to check what would be migrated
  node run-data-migration-to-multi-tenant.js --dry-run

  # Validate data integrity after migration
  node run-data-migration-to-multi-tenant.js --validate-only

  # Rollback migration (requires backup tables)
  node run-data-migration-to-multi-tenant.js --rollback
`);
}

async function runMigrationSQL() {
  const client = await pool.connect();
  try {
    console.log('📋 Loading migration SQL...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', '009_data_migration_to_multi_tenant.sql'),
      'utf8'
    );
    
    console.log('🔧 Executing migration SQL setup...');
    await client.query(migrationSQL);
    console.log('✅ Migration functions and tables created successfully');
    
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

async function validatePreMigration(client) {
  console.log('\n🔍 Running pre-migration validation...');
  
  try {
    // Check if tenant tables exist
    const tenantCheck = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'tenants'
    `);
    
    if (tenantCheck.rows[0].count === '0') {
      throw new Error('Tenants table not found. Please run tenant setup migration first.');
    }
    
    // Check if default tenant exists
    const defaultTenantCheck = await client.query(`
      SELECT COUNT(*) as count FROM tenants WHERE id = $1
    `, [options.tenantId]);
    
    if (defaultTenantCheck.rows[0].count === '0') {
      console.log('⚠️  Default tenant not found, will be created during migration');
    }
    
    // Count tables that need migration
    const tablesNeedingMigration = await client.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'tenant_id' 
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`📊 Found ${tablesNeedingMigration.rows.length} tables with tenant_id column:`);
    tablesNeedingMigration.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Count records that need migration
    let totalRecordsToMigrate = 0;
    for (const table of tablesNeedingMigration.rows) {
      try {
        const countResult = await client.query(`
          SELECT COUNT(*) as count FROM ${table.table_name} WHERE tenant_id IS NULL
        `);
        const count = parseInt(countResult.rows[0].count);
        if (count > 0) {
          console.log(`   📝 ${table.table_name}: ${count} records need migration`);
          totalRecordsToMigrate += count;
        }
      } catch (error) {
        console.log(`   ⚠️  ${table.table_name}: Error checking records - ${error.message}`);
      }
    }
    
    console.log(`\n📈 Total records to migrate: ${totalRecordsToMigrate}`);
    
    if (totalRecordsToMigrate === 0) {
      console.log('✅ No records need migration - all data already has tenant_id assigned');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Pre-migration validation failed:', error.message);
    throw error;
  }
}

async function runDataMigration(client) {
  console.log('\n🚀 Starting data migration...');
  console.log(`   Tenant ID: ${options.tenantId}`);
  console.log(`   Create backups: ${!options.noBackup}`);
  
  try {
    const result = await client.query(`
      SELECT migrate_existing_data_to_multi_tenant($1, $2) as results
    `, [options.tenantId, !options.noBackup]);
    
    const migrationResults = result.rows[0].results;
    
    console.log('\n📊 Migration Results:');
    console.log('='.repeat(50));
    
    const summary = migrationResults.summary;
    console.log(`Total tables processed: ${summary.total_tables_processed}`);
    console.log(`Total records updated: ${summary.total_records_updated}`);
    console.log(`Success rate: ${summary.success_rate}%`);
    
    if (summary.failed_tables && summary.failed_tables.length > 0) {
      console.log(`\n❌ Failed tables (${summary.failed_tables.length}):`);
      summary.failed_tables.forEach(table => {
        console.log(`   - ${table}`);
        if (migrationResults[table] && migrationResults[table].error_message) {
          console.log(`     Error: ${migrationResults[table].error_message}`);
        }
      });
    }
    
    console.log('\n✅ Successful migrations:');
    Object.keys(migrationResults).forEach(key => {
      if (key !== 'summary' && migrationResults[key].status === 'success') {
        const tableResult = migrationResults[key];
        console.log(`   - ${key}: ${tableResult.records_updated} records updated`);
        if (tableResult.backup_table !== 'none') {
          console.log(`     Backup: ${tableResult.backup_table}`);
        }
      }
    });
    
    return migrationResults;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

async function validatePostMigration(client) {
  console.log('\n🔍 Running post-migration validation...');
  
  try {
    const result = await client.query('SELECT validate_all_migrated_data() as results');
    const validationResults = result.rows[0].results;
    
    console.log('\n📊 Validation Results:');
    console.log('='.repeat(50));
    
    let allValid = true;
    Object.keys(validationResults).forEach(tableName => {
      const isValid = validationResults[tableName].is_valid;
      const status = isValid ? '✅' : '❌';
      console.log(`   ${status} ${tableName}: ${isValid ? 'VALID' : 'INVALID'}`);
      if (!isValid) allValid = false;
    });
    
    if (allValid) {
      console.log('\n✅ All data validation checks passed!');
    } else {
      console.log('\n❌ Some validation checks failed. Check the logs for details.');
    }
    
    return allValid;
  } catch (error) {
    console.error('❌ Post-migration validation failed:', error.message);
    throw error;
  }
}

async function showMigrationLogs(client) {
  console.log('\n📋 Recent Migration Logs:');
  console.log('='.repeat(50));
  
  try {
    const logs = await client.query(`
      SELECT migration_name, table_name, operation, records_processed, 
             records_failed, error_message, started_at
      FROM data_migration_log 
      ORDER BY started_at DESC 
      LIMIT 20
    `);
    
    logs.rows.forEach(log => {
      const timestamp = new Date(log.started_at).toLocaleString();
      const status = log.error_message ? '❌' : '✅';
      console.log(`${status} [${timestamp}] ${log.migration_name} - ${log.table_name} (${log.operation})`);
      if (log.records_processed > 0) {
        console.log(`    Records processed: ${log.records_processed}`);
      }
      if (log.records_failed > 0) {
        console.log(`    Records failed: ${log.records_failed}`);
      }
      if (log.error_message) {
        console.log(`    Error: ${log.error_message}`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to retrieve migration logs:', error.message);
  }
}

async function rollbackMigration(client) {
  console.log('\n🔄 Starting migration rollback...');
  
  try {
    // Get list of backup tables
    const backupTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%_backup_%' 
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (backupTables.rows.length === 0) {
      console.log('❌ No backup tables found. Cannot perform rollback.');
      return false;
    }
    
    console.log(`Found ${backupTables.rows.length} backup tables:`);
    backupTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // For each backup table, restore the original
    for (const backupTable of backupTables.rows) {
      const backupTableName = backupTable.table_name;
      const originalTableName = backupTableName.replace(/_backup_\d{8}_\d{6}$/, '');
      
      try {
        console.log(`🔄 Restoring ${originalTableName} from ${backupTableName}...`);
        
        const result = await client.query(`
          SELECT rollback_migration($1, $2) as success
        `, [originalTableName, backupTableName]);
        
        if (result.rows[0].success) {
          console.log(`✅ Successfully restored ${originalTableName}`);
        } else {
          console.log(`❌ Failed to restore ${originalTableName}`);
        }
      } catch (error) {
        console.error(`❌ Error restoring ${originalTableName}:`, error.message);
      }
    }
    
    console.log('\n✅ Rollback completed');
    return true;
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

async function main() {
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('🏗️  Multi-Tenant Data Migration Tool');
  console.log('=====================================');
  
  let client;
  
  try {
    // Setup migration functions
    client = await runMigrationSQL();
    
    if (options.rollback) {
      await rollbackMigration(client);
      await showMigrationLogs(client);
      return;
    }
    
    if (options.validateOnly) {
      await validatePostMigration(client);
      await showMigrationLogs(client);
      return;
    }
    
    // Pre-migration validation
    const needsMigration = await validatePreMigration(client);
    
    if (!needsMigration) {
      console.log('\n🎉 Migration not needed - all data is already migrated!');
      return;
    }
    
    if (options.dryRun) {
      console.log('\n🔍 Dry run completed - no changes made');
      console.log('Run without --dry-run to perform the actual migration');
      return;
    }
    
    // Confirm migration
    console.log('\n⚠️  This will modify your database. Make sure you have a backup!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run migration
    const migrationResults = await runDataMigration(client);
    
    // Post-migration validation
    const validationPassed = await validatePostMigration(client);
    
    // Show logs
    await showMigrationLogs(client);
    
    if (validationPassed) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Test your application to ensure everything works correctly');
      console.log('2. If everything looks good, you can drop the backup tables');
      console.log('3. Update your application code to use tenant context');
    } else {
      console.log('\n⚠️  Migration completed but validation failed');
      console.log('Please review the validation errors and consider rolling back');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Migration interrupted by user');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Migration terminated');
  await pool.end();
  process.exit(0);
});

// Run the migration
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});