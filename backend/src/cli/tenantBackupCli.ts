#!/usr/bin/env node

import { Pool } from 'pg';
import { Command } from 'commander';
import { TenantBackupService } from '../services/tenantBackupService';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sistema_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const backupService = new TenantBackupService(pool);

const program = new Command();

program
  .name('tenant-backup-cli')
  .description('CLI tool for tenant backup and disaster recovery operations')
  .version('1.0.0');

// Create backup command
program
  .command('backup')
  .description('Create a backup for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .option('--no-data', 'Exclude data from backup')
  .option('--no-schema', 'Exclude schema from backup')
  .option('-c, --compress', 'Enable compression')
  .option('-e, --encrypt', 'Enable encryption')
  .option('--tables <tables>', 'Comma-separated list of tables to backup')
  .action(async (options) => {
    try {
      console.log(`Creating backup for tenant: ${options.tenant}`);
      
      const backupOptions = {
        tenantId: options.tenant,
        includeData: options.data,
        includeSchema: options.schema,
        compression: options.compress || false,
        encryption: options.encrypt || false,
        tables: options.tables ? options.tables.split(',') : undefined
      };

      const metadata = await backupService.createTenantBackup(backupOptions);
      
      console.log('Backup created successfully:');
      console.log(`- Backup ID: ${metadata.id}`);
      console.log(`- Path: ${metadata.path}`);
      console.log(`- Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Tables: ${metadata.tables.length}`);
      console.log(`- Checksum: ${metadata.checksum}`);
      
    } catch (error) {
      console.error('Backup failed:', error.message);
      process.exit(1);
    }
  });

// Restore backup command
program
  .command('restore')
  .description('Restore a tenant from backup')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .requiredOption('-p, --path <backupPath>', 'Path to backup file')
  .option('--target-tenant <targetTenantId>', 'Target tenant ID for cross-tenant restore')
  .option('--validate-only', 'Only validate backup without restoring')
  .option('--point-in-time <timestamp>', 'Point-in-time recovery timestamp (ISO format)')
  .action(async (options) => {
    try {
      console.log(`Restoring backup for tenant: ${options.tenant}`);
      
      const restoreOptions = {
        tenantId: options.tenant,
        backupPath: options.path,
        targetTenantId: options.targetTenant,
        validateOnly: options.validateOnly || false,
        pointInTime: options.pointInTime ? new Date(options.pointInTime) : undefined
      };

      await backupService.restoreTenantBackup(restoreOptions);
      
      if (options.validateOnly) {
        console.log('Backup validation completed successfully');
      } else {
        console.log('Restore completed successfully');
      }
      
    } catch (error) {
      console.error('Restore failed:', error.message);
      process.exit(1);
    }
  });

// Point-in-time recovery command
program
  .command('point-in-time-recovery')
  .description('Perform point-in-time recovery for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .requiredOption('--target-time <timestamp>', 'Target recovery time (ISO format)')
  .action(async (options) => {
    try {
      console.log(`Performing point-in-time recovery for tenant: ${options.tenant}`);
      console.log(`Target time: ${options.targetTime}`);
      
      await backupService.performPointInTimeRecovery(
        options.tenant, 
        new Date(options.targetTime)
      );
      
      console.log('Point-in-time recovery completed successfully');
      
    } catch (error) {
      console.error('Point-in-time recovery failed:', error.message);
      process.exit(1);
    }
  });

// List backups command
program
  .command('list')
  .description('List backups for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .option('--limit <number>', 'Limit number of results', '10')
  .action(async (options) => {
    try {
      const backups = await backupService.listTenantBackups(options.tenant);
      const limit = parseInt(options.limit);
      const limitedBackups = backups.slice(0, limit);
      
      console.log(`\nBackups for tenant ${options.tenant}:`);
      console.log('─'.repeat(80));
      
      if (limitedBackups.length === 0) {
        console.log('No backups found');
        return;
      }
      
      limitedBackups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.id}`);
        console.log(`   Status: ${backup.status}`);
        console.log(`   Created: ${backup.timestamp.toISOString()}`);
        console.log(`   Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Tables: ${backup.tables.length}`);
        console.log(`   Path: ${backup.path}`);
        console.log('');
      });
      
      if (backups.length > limit) {
        console.log(`... and ${backups.length - limit} more backups`);
      }
      
    } catch (error) {
      console.error('Failed to list backups:', error.message);
      process.exit(1);
    }
  });

// Validate backup command
program
  .command('validate')
  .description('Validate backup integrity')
  .requiredOption('-p, --path <backupPath>', 'Path to backup file')
  .action(async (options) => {
    try {
      console.log(`Validating backup: ${options.path}`);
      
      const isValid = await backupService.validateBackupIntegrity(options.path);
      
      if (isValid) {
        console.log('✓ Backup is valid and can be restored');
      } else {
        console.log('✗ Backup validation failed');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Validation failed:', error.message);
      process.exit(1);
    }
  });

// Cleanup old backups command
program
  .command('cleanup')
  .description('Clean up old backups for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .option('--retention-days <days>', 'Retention period in days', '30')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .action(async (options) => {
    try {
      const retentionDays = parseInt(options.retentionDays);
      console.log(`Cleaning up backups older than ${retentionDays} days for tenant: ${options.tenant}`);
      
      if (options.dryRun) {
        // List what would be deleted
        const allBackups = await backupService.listTenantBackups(options.tenant);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        const oldBackups = allBackups.filter(backup => backup.timestamp < cutoffDate);
        
        console.log(`Would delete ${oldBackups.length} backups:`);
        oldBackups.forEach(backup => {
          console.log(`- ${backup.id} (${backup.timestamp.toISOString()})`);
        });
      } else {
        await backupService.cleanupOldBackups(options.tenant, retentionDays);
        console.log('Cleanup completed successfully');
      }
      
    } catch (error) {
      console.error('Cleanup failed:', error.message);
      process.exit(1);
    }
  });

// Backup statistics command
program
  .command('stats')
  .description('Show backup statistics for a tenant')
  .requiredOption('-t, --tenant <tenantId>', 'Tenant ID')
  .action(async (options) => {
    try {
      const client = await pool.connect();
      
      try {
        const result = await client.query(`
          SELECT * FROM tenant_backup_stats WHERE tenant_id = $1
        `, [options.tenant]);
        
        const stats = result.rows[0];
        
        if (!stats) {
          console.log(`No backup statistics found for tenant: ${options.tenant}`);
          return;
        }
        
        console.log(`\nBackup Statistics for ${stats.tenant_name || options.tenant}:`);
        console.log('─'.repeat(50));
        console.log(`Total Backups: ${stats.total_backups}`);
        console.log(`Successful: ${stats.successful_backups}`);
        console.log(`Failed: ${stats.failed_backups}`);
        console.log(`Last Backup: ${stats.last_backup ? new Date(stats.last_backup).toISOString() : 'Never'}`);
        console.log(`Total Size: ${stats.total_backup_size ? (stats.total_backup_size / 1024 / 1024 / 1024).toFixed(2) + ' GB' : '0 GB'}`);
        console.log(`Average Size: ${stats.avg_backup_size ? (stats.avg_backup_size / 1024 / 1024).toFixed(2) + ' MB' : '0 MB'}`);
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Failed to get statistics:', error.message);
      process.exit(1);
    }
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}