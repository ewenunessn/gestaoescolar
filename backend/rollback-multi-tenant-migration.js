#!/usr/bin/env node

/**
 * Multi-Tenant Migration Rollback Script
 * 
 * This script provides comprehensive rollback capabilities for multi-tenant migrations,
 * including data restoration from backups and schema rollback.
 * 
 * Usage:
 *   node rollback-multi-tenant-migration.js [options]
 * 
 * Options:
 *   --table=name       Rollback specific table only
 *   --backup-date=date Rollback to specific backup date (YYYYMMDD_HHMMSS)
 *   --list-backups     List available backup tables
 *   --dry-run          Show what would be rolled back without doing it
 *   --force            Skip confirmation prompts
 *   --cleanup          Remove backup tables after successful rollback
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

// Command line arguments
const args = process.argv.slice(2);
const options = {
  table: args.find(arg => arg.startsWith('--table='))?.split('=')[1],
  backupDate: args.find(arg => arg.startsWith('--backup-date='))?.split('=')[1],
  listBackups: args.includes('--list-backups'),
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  cleanup: args.includes('--cleanup'),
  help: args.includes('--help')
};

function showHelp() {
  console.log(`
Multi-Tenant Migration Rollback Script

Usage:
  node rollback-multi-tenant-migration.js [options]

Options:
  --table=name       Rollback specific table only
  --backup-date=date Rollback to specific backup date (YYYYMMDD_HHMMSS)
  --list-backups     List available backup tables
  --dry-run          Show what would be rolled back without doing it
  --force            Skip confirmation prompts
  --cleanup          Remove backup tables after successful rollback
  --help             Show this help message

Examples:
  # List available backups
  node rollback-multi-tenant-migration.js --list-backups

  # Rollback all tables (with confirmation)
  node rollback-multi-tenant-migration.js

  # Rollback specific table
  node rollback-multi-tenant-migration.js --table=escolas

  # Dry run to see what would be rolled back
  node rollback-multi-tenant-migration.js --dry-run

  # Force rollback without confirmation
  node rollback-multi-tenant-migration.js --force

  # Rollback and cleanup backup tables
  node rollback-multi-tenant-migration.js --cleanup
`);
}

async function getBackupTables(client, tableFilter = null, dateFilter = null) {
  let query = `
    SELECT 
      table_name,
      SUBSTRING(table_name FROM '(.+)_backup_') as original_table,
      SUBSTRING(table_name FROM '_backup_(.+)$') as backup_date
    FROM information_schema.tables 
    WHERE table_name LIKE '%_backup_%' 
    AND table_schema = 'public'
  `;
  
  const params = [];
  
  if (tableFilter) {
    query += ` AND table_name LIKE $${params.length + 1}`;
    params.push(`${tableFilter}_backup_%`);
  }
  
  if (dateFilter) {
    query += ` AND table_name LIKE $${params.length + 1}`;
    params.push(`%_backup_${dateFilter}`);
  }
  
  query += ` ORDER BY table_name`;
  
  const result = await client.query(query, params);
  return result.rows;
}

async function listBackupTables(client) {
  console.log('📋 Available Backup Tables:');
  console.log('='.repeat(60));
  
  const backups = await getBackupTables(client);
  
  if (backups.length === 0) {
    console.log('No backup tables found.');
    return;
  }
  
  // Group by original table
  const groupedBackups = {};
  backups.forEach(backup => {
    if (!groupedBackups[backup.original_table]) {
      groupedBackups[backup.original_table] = [];
    }
    groupedBackups[backup.original_table].push(backup);
  });
  
  Object.keys(groupedBackups).sort().forEach(originalTable => {
    console.log(`\n📊 ${originalTable}:`);
    groupedBackups[originalTable].forEach(backup => {
      const date = backup.backup_date;
      const formattedDate = `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)} ${date.substring(9,11)}:${date.substring(11,13)}:${date.substring(13,15)}`;
      console.log(`   🗄️  ${backup.table_name} (${formattedDate})`);
    });
  });
  
  console.log(`\nTotal backup tables: ${backups.length}`);
}

async function getTableRecordCount(client, tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

async function validateBackupIntegrity(client, backupTableName, originalTableName) {
  try {
    // Check if backup table exists
    const backupExists = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = $1 AND table_schema = 'public'
    `, [backupTableName]);
    
    if (parseInt(backupExists.rows[0].count) === 0) {
      return { valid: false, error: 'Backup table does not exist' };
    }
    
    // Check if backup has data
    const backupCount = await getTableRecordCount(client, backupTableName);
    if (backupCount === 0) {
      return { valid: false, error: 'Backup table is empty' };
    }
    
    // Compare structure (basic check)
    const originalColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [originalTableName]);
    
    const backupColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [backupTableName]);
    
    // Check if backup has at least the same columns (may have fewer if tenant_id was added later)
    const originalColumnNames = originalColumns.rows.map(r => r.column_name);
    const backupColumnNames = backupColumns.rows.map(r => r.column_name);
    
    const missingColumns = originalColumnNames.filter(col => 
      col !== 'tenant_id' && !backupColumnNames.includes(col)
    );
    
    if (missingColumns.length > 0) {
      return { 
        valid: false, 
        error: `Backup missing columns: ${missingColumns.join(', ')}` 
      };
    }
    
    return { 
      valid: true, 
      backupRecords: backupCount,
      originalRecords: await getTableRecordCount(client, originalTableName)
    };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

async function rollbackTable(client, originalTableName, backupTableName, dryRun = false) {
  console.log(`\n🔄 ${dryRun ? '[DRY RUN] ' : ''}Rolling back ${originalTableName} from ${backupTableName}...`);
  
  try {
    // Validate backup integrity
    const validation = await validateBackupIntegrity(client, backupTableName, originalTableName);
    if (!validation.valid) {
      throw new Error(`Backup validation failed: ${validation.error}`);
    }
    
    console.log(`   📊 Backup has ${validation.backupRecords} records, current table has ${validation.originalRecords} records`);
    
    if (dryRun) {
      console.log(`   ✅ [DRY RUN] Would restore ${validation.backupRecords} records to ${originalTableName}`);
      return { success: true, recordsRestored: validation.backupRecords };
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    try {
      // Disable foreign key checks temporarily
      await client.query('SET session_replication_role = replica');
      
      // Truncate current table
      console.log(`   🗑️  Truncating ${originalTableName}...`);
      await client.query(`TRUNCATE TABLE ${originalTableName} RESTART IDENTITY CASCADE`);
      
      // Get column list from backup table (excluding tenant_id if it doesn't exist in backup)
      const backupColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [backupTableName]);
      
      const columnList = backupColumns.rows.map(r => r.column_name).join(', ');
      
      // Restore data from backup
      console.log(`   📥 Restoring data from backup...`);
      const restoreResult = await client.query(`
        INSERT INTO ${originalTableName} (${columnList})
        SELECT ${columnList} FROM ${backupTableName}
      `);
      
      const recordsRestored = restoreResult.rowCount;
      
      // Re-enable foreign key checks
      await client.query('SET session_replication_role = DEFAULT');
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log(`   ✅ Successfully restored ${recordsRestored} records to ${originalTableName}`);
      
      return { success: true, recordsRestored };
      
    } catch (error) {
      // Rollback transaction
      await client.query('ROLLBACK');
      await client.query('SET session_replication_role = DEFAULT');
      throw error;
    }
    
  } catch (error) {
    console.log(`   ❌ Failed to rollback ${originalTableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function cleanupBackupTable(client, backupTableName, dryRun = false) {
  if (dryRun) {
    console.log(`   🗑️  [DRY RUN] Would drop backup table: ${backupTableName}`);
    return;
  }
  
  try {
    await client.query(`DROP TABLE IF EXISTS ${backupTableName}`);
    console.log(`   🗑️  Cleaned up backup table: ${backupTableName}`);
  } catch (error) {
    console.log(`   ⚠️  Failed to cleanup backup table ${backupTableName}: ${error.message}`);
  }
}

async function confirmRollback(backups, dryRun = false) {
  if (options.force || dryRun) {
    return true;
  }
  
  console.log('\n⚠️  WARNING: This will restore data from backups and may cause data loss!');
  console.log('\nTables to be rolled back:');
  backups.forEach(backup => {
    console.log(`   - ${backup.original_table} (from ${backup.table_name})`);
  });
  
  console.log('\n❗ Make sure you have a current backup before proceeding!');
  console.log('\nType "ROLLBACK" to confirm, or press Ctrl+C to cancel:');
  
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let input = '';
    
    process.stdin.on('data', (key) => {
      if (key === '\u0003') { // Ctrl+C
        console.log('\n\n🛑 Rollback cancelled by user');
        process.exit(0);
      }
      
      if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        
        if (input.trim() === 'ROLLBACK') {
          console.log('\n✅ Rollback confirmed');
          resolve(true);
        } else {
          console.log('\n❌ Rollback cancelled - incorrect confirmation');
          resolve(false);
        }
      } else if (key === '\u007f') { // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += key;
        process.stdout.write(key);
      }
    });
  });
}

async function main() {
  if (options.help) {
    showHelp();
    return;
  }
  
  console.log('🔄 Multi-Tenant Migration Rollback Tool');
  console.log('========================================');
  
  const client = await pool.connect();
  
  try {
    if (options.listBackups) {
      await listBackupTables(client);
      return;
    }
    
    // Get backup tables to process
    const backups = await getBackupTables(client, options.table, options.backupDate);
    
    if (backups.length === 0) {
      console.log('❌ No backup tables found matching the criteria');
      return;
    }
    
    console.log(`\n📋 Found ${backups.length} backup table(s) to process`);
    
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No changes will be made');
    }
    
    // Confirm rollback
    const confirmed = await confirmRollback(backups, options.dryRun);
    if (!confirmed) {
      console.log('❌ Rollback cancelled');
      return;
    }
    
    // Process rollbacks
    const results = {
      successful: 0,
      failed: 0,
      totalRecordsRestored: 0,
      errors: []
    };
    
    for (const backup of backups) {
      const result = await rollbackTable(
        client, 
        backup.original_table, 
        backup.table_name, 
        options.dryRun
      );
      
      if (result.success) {
        results.successful++;
        results.totalRecordsRestored += result.recordsRestored || 0;
        
        // Cleanup backup table if requested and not dry run
        if (options.cleanup && !options.dryRun) {
          await cleanupBackupTable(client, backup.table_name, options.dryRun);
        }
      } else {
        results.failed++;
        results.errors.push(`${backup.original_table}: ${result.error}`);
      }
    }
    
    // Print summary
    console.log('\n📊 Rollback Summary:');
    console.log('='.repeat(40));
    console.log(`Successful rollbacks: ${results.successful}`);
    console.log(`Failed rollbacks: ${results.failed}`);
    
    if (!options.dryRun) {
      console.log(`Total records restored: ${results.totalRecordsRestored}`);
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
    
    if (results.successful === backups.length) {
      if (options.dryRun) {
        console.log('\n✅ Dry run completed successfully');
        console.log('Run without --dry-run to perform the actual rollback');
      } else {
        console.log('\n🎉 All rollbacks completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Verify your application works correctly');
        console.log('2. Run data validation to ensure integrity');
        console.log('3. Consider re-running the migration with fixes');
      }
    } else {
      console.log('\n⚠️  Some rollbacks failed - please review the errors above');
    }
    
  } catch (error) {
    console.error('\n💥 Rollback failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Rollback interrupted by user');
  await pool.end();
  process.exit(0);
});

// Run the rollback
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});