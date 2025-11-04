#!/usr/bin/env node

/**
 * MIGRATION ORCHESTRATOR
 * 
 * Comprehensive orchestrator for inventory tenant migration operations.
 * This script coordinates migration, validation, rollback, and verification
 * processes with proper error handling and reporting.
 * 
 * Usage: node migration-orchestrator.js <command> [options]
 * 
 * Commands:
 *   migrate     - Run the full migration process
 *   validate    - Validate migration results
 *   rollback    - Rollback migration changes
 *   verify      - Verify data integrity
 *   status      - Check current migration status
 * 
 * Options:
 *   --dry-run          - Simulate operations without making changes
 *   --force            - Force operations even with warnings
 *   --fix-issues       - Automatically fix detected issues
 *   --preserve-data    - Preserve data during rollback
 *   --detailed         - Show detailed output
 *   --export-report    - Export detailed reports
 */

const { Pool } = require('pg');
const MigrationLogger = require('./migration-logger');
const InventoryTenantMigration = require('../run-inventory-tenant-migration');
const InventoryMigrationValidator = require('./inventory-migration-validator');
const InventoryMigrationRollback = require('./inventory-migration-rollback');
const DataIntegrityVerifier = require('./data-integrity-verifier');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gestao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Parse command line arguments
const command = process.argv[2];
const config = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  fixIssues: process.argv.includes('--fix-issues'),
  preserveData: process.argv.includes('--preserve-data'),
  detailed: process.argv.includes('--detailed'),
  exportReport: process.argv.includes('--export-report'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class MigrationOrchestrator {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.logger = new MigrationLogger('migration-orchestrator', {
      verbose: config.verbose,
      exportLogs: config.exportReport
    });
  }

  async executeQuery(query, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async checkMigrationStatus() {
    await this.logger.logInfo('STATUS_CHECK', 'Checking current migration status...');

    try {
      // Check if tenant_id columns exist
      const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
      const columnStatus = {};

      for (const table of tables) {
        const result = await this.executeQuery(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'tenant_id'
          ) as column_exists
        `, [table]);

        columnStatus[table] = result.rows[0].column_exists;
      }

      // Check data migration status
      const dataStatus = {};
      for (const table of tables) {
        if (columnStatus[table]) {
          const result = await this.executeQuery(`
            SELECT 
              COUNT(*) as total_records,
              COUNT(tenant_id) as records_with_tenant_id
            FROM ${table}
          `);

          const { total_records, records_with_tenant_id } = result.rows[0];
          dataStatus[table] = {
            total: parseInt(total_records),
            migrated: parseInt(records_with_tenant_id),
            percentage: total_records > 0 ? ((records_with_tenant_id / total_records) * 100).toFixed(2) : 100
          };
        }
      }

      // Check RLS status
      const rlsStatus = {};
      for (const table of tables) {
        const result = await this.executeQuery(`
          SELECT rowsecurity FROM pg_tables WHERE tablename = $1
        `, [table]);

        rlsStatus[table] = result.rows[0]?.rowsecurity || false;
      }

      // Check indexes
      const expectedIndexes = [
        'idx_estoque_escolas_tenant_escola_produto',
        'idx_estoque_lotes_tenant_escola_produto',
        'idx_estoque_lotes_tenant_validade_ativo',
        'idx_estoque_historico_tenant_escola_data',
        'idx_estoque_movimentacoes_tenant_lote_data'
      ];

      const indexStatus = {};
      for (const indexName of expectedIndexes) {
        const result = await this.executeQuery(`
          SELECT EXISTS (
            SELECT 1 FROM pg_indexes WHERE indexname = $1
          ) as index_exists
        `, [indexName]);

        indexStatus[indexName] = result.rows[0].index_exists;
      }

      const status = {
        columns: columnStatus,
        data: dataStatus,
        rls: rlsStatus,
        indexes: indexStatus,
        overall: this.calculateOverallStatus(columnStatus, dataStatus, rlsStatus, indexStatus)
      };

      await this.logger.logSuccess('STATUS_CHECK', 'Migration status retrieved', status);
      return status;

    } catch (error) {
      await this.logger.logError('STATUS_CHECK', error);
      throw error;
    }
  }

  calculateOverallStatus(columnStatus, dataStatus, rlsStatus, indexStatus) {
    const columnsExist = Object.values(columnStatus).every(exists => exists);
    const dataFullyMigrated = Object.values(dataStatus).every(status => 
      status && parseFloat(status.percentage) === 100
    );
    const rlsEnabled = Object.values(rlsStatus).every(enabled => enabled);
    const indexesCreated = Object.values(indexStatus).every(exists => exists);

    if (!columnsExist) {
      return 'NOT_STARTED';
    } else if (columnsExist && !dataFullyMigrated) {
      return 'IN_PROGRESS';
    } else if (dataFullyMigrated && !rlsEnabled) {
      return 'DATA_MIGRATED';
    } else if (dataFullyMigrated && rlsEnabled && !indexesCreated) {
      return 'SECURITY_ENABLED';
    } else if (dataFullyMigrated && rlsEnabled && indexesCreated) {
      return 'COMPLETED';
    } else {
      return 'UNKNOWN';
    }
  }

  async runMigration() {
    await this.logger.logInfo('MIGRATION', 'Starting inventory tenant migration...');

    try {
      // Check current status
      const currentStatus = await this.checkMigrationStatus();
      
      if (currentStatus.overall === 'COMPLETED' && !config.force) {
        await this.logger.logWarning('MIGRATION', 'Migration already completed. Use --force to re-run.');
        return false;
      }

      // Run migration
      const migration = new InventoryTenantMigration();
      const success = await migration.runMigration();
      await migration.close();

      if (success) {
        await this.logger.logSuccess('MIGRATION', 'Migration completed successfully');
        
        // Run automatic validation
        await this.logger.logInfo('AUTO_VALIDATION', 'Running automatic validation...');
        const validationSuccess = await this.runValidation();
        
        if (validationSuccess) {
          await this.logger.logSuccess('AUTO_VALIDATION', 'Automatic validation passed');
        } else {
          await this.logger.logWarning('AUTO_VALIDATION', 'Automatic validation found issues');
        }

        return true;
      } else {
        await this.logger.logError('MIGRATION', new Error('Migration failed'));
        return false;
      }

    } catch (error) {
      await this.logger.logError('MIGRATION', error);
      
      if (!config.force) {
        await this.logger.logInfo('AUTO_ROLLBACK', 'Running automatic rollback...');
        await this.runRollback();
      }
      
      throw error;
    }
  }

  async runValidation() {
    await this.logger.logInfo('VALIDATION', 'Starting migration validation...');

    try {
      const validator = new InventoryMigrationValidator();
      const success = await validator.runFullValidation();
      await validator.close();

      if (success) {
        await this.logger.logSuccess('VALIDATION', 'Validation completed successfully');
      } else {
        await this.logger.logError('VALIDATION', new Error('Validation failed'));
      }

      return success;

    } catch (error) {
      await this.logger.logError('VALIDATION', error);
      throw error;
    }
  }

  async runRollback() {
    await this.logger.logInfo('ROLLBACK', 'Starting migration rollback...');

    try {
      const rollback = new InventoryMigrationRollback();
      const success = await rollback.runFullRollback();
      await rollback.close();

      if (success) {
        await this.logger.logSuccess('ROLLBACK', 'Rollback completed successfully');
      } else {
        await this.logger.logError('ROLLBACK', new Error('Rollback failed'));
      }

      return success;

    } catch (error) {
      await this.logger.logError('ROLLBACK', error);
      throw error;
    }
  }

  async runVerification() {
    await this.logger.logInfo('VERIFICATION', 'Starting data integrity verification...');

    try {
      const verifier = new DataIntegrityVerifier();
      const success = await verifier.runFullVerification();
      await verifier.close();

      if (success) {
        await this.logger.logSuccess('VERIFICATION', 'Verification completed successfully');
      } else {
        await this.logger.logError('VERIFICATION', new Error('Verification failed'));
      }

      return success;

    } catch (error) {
      await this.logger.logError('VERIFICATION', error);
      throw error;
    }
  }

  async runFullMigrationWorkflow() {
    await this.logger.logInfo('WORKFLOW', 'Starting full migration workflow...');

    try {
      // Step 1: Check current status
      const initialStatus = await this.checkMigrationStatus();
      await this.logger.logInfo('WORKFLOW', `Initial status: ${initialStatus.overall}`);

      // Step 2: Run migration if needed
      if (initialStatus.overall !== 'COMPLETED' || config.force) {
        const migrationSuccess = await this.runMigration();
        if (!migrationSuccess) {
          throw new Error('Migration failed');
        }
      } else {
        await this.logger.logInfo('WORKFLOW', 'Migration already completed, skipping...');
      }

      // Step 3: Run comprehensive validation
      const validationSuccess = await this.runValidation();
      if (!validationSuccess && !config.force) {
        throw new Error('Validation failed');
      }

      // Step 4: Run data integrity verification
      const verificationSuccess = await this.runVerification();
      if (!verificationSuccess && !config.force) {
        throw new Error('Data integrity verification failed');
      }

      // Step 5: Final status check
      const finalStatus = await this.checkMigrationStatus();
      await this.logger.logSuccess('WORKFLOW', `Final status: ${finalStatus.overall}`);

      await this.logger.logSuccess('WORKFLOW', 'Full migration workflow completed successfully');
      return true;

    } catch (error) {
      await this.logger.logError('WORKFLOW', error);
      throw error;
    }
  }

  async displayStatus() {
    const status = await this.checkMigrationStatus();

    console.log('\n========================================');
    console.log('INVENTORY TENANT MIGRATION STATUS');
    console.log('========================================\n');

    console.log(`Overall Status: ${status.overall}\n`);

    console.log('📋 Column Status:');
    Object.entries(status.columns).forEach(([table, exists]) => {
      console.log(`  ${exists ? '✅' : '❌'} ${table}: tenant_id column ${exists ? 'exists' : 'missing'}`);
    });

    if (Object.values(status.columns).some(exists => exists)) {
      console.log('\n📊 Data Migration Status:');
      Object.entries(status.data).forEach(([table, data]) => {
        if (data) {
          const icon = parseFloat(data.percentage) === 100 ? '✅' : 
                      parseFloat(data.percentage) >= 95 ? '⚠️' : '❌';
          console.log(`  ${icon} ${table}: ${data.migrated}/${data.total} records (${data.percentage}%)`);
        }
      });
    }

    console.log('\n🔒 Row Level Security Status:');
    Object.entries(status.rls).forEach(([table, enabled]) => {
      console.log(`  ${enabled ? '✅' : '❌'} ${table}: RLS ${enabled ? 'enabled' : 'disabled'}`);
    });

    console.log('\n📈 Index Status:');
    Object.entries(status.indexes).forEach(([index, exists]) => {
      console.log(`  ${exists ? '✅' : '❌'} ${index}: ${exists ? 'exists' : 'missing'}`);
    });

    console.log('\n========================================\n');

    return status;
  }

  async close() {
    await this.pool.end();
  }
}

// Command handlers
async function handleCommand(orchestrator, command) {
  switch (command) {
    case 'migrate':
      return await orchestrator.runMigration();
    
    case 'validate':
      return await orchestrator.runValidation();
    
    case 'rollback':
      return await orchestrator.runRollback();
    
    case 'verify':
      return await orchestrator.runVerification();
    
    case 'status':
      await orchestrator.displayStatus();
      return true;
    
    case 'full':
    case 'workflow':
      return await orchestrator.runFullMigrationWorkflow();
    
    default:
      console.error(`Unknown command: ${command}`);
      console.log('\nAvailable commands:');
      console.log('  migrate     - Run the migration process');
      console.log('  validate    - Validate migration results');
      console.log('  rollback    - Rollback migration changes');
      console.log('  verify      - Verify data integrity');
      console.log('  status      - Check current migration status');
      console.log('  full        - Run full migration workflow');
      return false;
  }
}

// Main function
async function main() {
  if (!command) {
    console.error('Error: No command specified');
    console.log('\nUsage: node migration-orchestrator.js <command> [options]');
    console.log('\nCommands: migrate, validate, rollback, verify, status, full');
    process.exit(1);
  }

  const orchestrator = new MigrationOrchestrator();

  try {
    await orchestrator.logger.logInfo('START', `Starting migration orchestrator with command: ${command}`);
    await orchestrator.logger.logInfo('CONFIG', `Configuration: ${JSON.stringify(config, null, 2)}`);

    const success = await handleCommand(orchestrator, command);
    
    await orchestrator.logger.generateReport();
    
    if (success) {
      await orchestrator.logger.logSuccess('COMPLETE', 'Operation completed successfully');
      process.exit(0);
    } else {
      await orchestrator.logger.logError('COMPLETE', new Error('Operation failed'));
      process.exit(1);
    }

  } catch (error) {
    await orchestrator.logger.logError('ORCHESTRATOR_FAILED', error);
    process.exit(1);

  } finally {
    await orchestrator.close();
  }
}

// Signal handling
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interruption detected. Finishing...');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = MigrationOrchestrator;