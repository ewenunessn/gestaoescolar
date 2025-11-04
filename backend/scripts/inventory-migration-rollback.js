#!/usr/bin/env node

/**
 * INVENTORY TENANT MIGRATION ROLLBACK SCRIPT
 * 
 * Comprehensive rollback script for inventory tenant migration.
 * This script safely reverts the tenant migration changes with proper
 * validation, backup, and logging mechanisms.
 * 
 * Usage: node inventory-migration-rollback.js [--confirm] [--preserve-data] [--dry-run]
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gestao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// Script configuration
const config = {
  confirm: process.argv.includes('--confirm'),
  preserveData: process.argv.includes('--preserve-data'),
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class InventoryMigrationRollback {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.rollbackStartTime = new Date();
    this.rollbackLog = [];
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍',
      'ROLLBACK': '🔄'
    }[level] || '📋';

    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    this.rollbackLog.push(logEntry);
    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data && config.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async executeQuery(query, params = []) {
    const client = await this.pool.connect();
    try {
      if (config.dryRun) {
        this.log('INFO', '[DRY RUN] Would execute query', { query: query.substring(0, 100) + '...' });
        return { rows: [], rowCount: 0, dryRun: true };
      }
      
      const result = await client.query(query, params);
      return result;
    } finally {
      client.release();
    }
  }

  async confirmRollback() {
    if (config.confirm) {
      this.log('INFO', 'Rollback confirmed via --confirm flag');
      return true;
    }

    if (config.dryRun) {
      this.log('INFO', 'Dry run mode - no confirmation needed');
      return true;
    }

    console.log('\n⚠️  WARNING: This will rollback the inventory tenant migration!');
    console.log('This operation will:');
    console.log('  - Remove RLS policies and triggers');
    console.log('  - Remove tenant-aware indexes');
    console.log('  - Optionally remove tenant_id data');
    console.log('  - Optionally remove tenant_id columns');
    console.log('\nBackups will be created before any destructive operations.');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('\nDo you want to continue? (yes/no): ', (answer) => {
        rl.close();
        const confirmed = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
        resolve(confirmed);
      });
    });
  }

  async validateCurrentState() {
    this.log('ROLLBACK', 'Validating current migration state...');

    // Check if tenant_id columns exist
    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    const existingColumns = [];

    for (const table of tables) {
      const result = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tenant_id'
        ) as column_exists
      `, [table]);

      if (result.rows[0]?.column_exists) {
        existingColumns.push(table);
      }
    }

    if (existingColumns.length === 0) {
      throw new Error('No tenant_id columns found. Migration may not have been executed.');
    }

    this.log('SUCCESS', `Found tenant_id columns in ${existingColumns.length} tables`, { tables: existingColumns });

    // Check if there's data with tenant_id
    let totalRecordsWithTenant = 0;
    for (const table of existingColumns) {
      const result = await this.executeQuery(`
        SELECT COUNT(*) as count FROM ${table} WHERE tenant_id IS NOT NULL
      `);
      totalRecordsWithTenant += parseInt(result.rows[0]?.count || 0);
    }

    this.log('INFO', `Found ${totalRecordsWithTenant} records with tenant_id across all tables`);

    return {
      tablesWithTenantId: existingColumns,
      recordsWithTenantId: totalRecordsWithTenant
    };
  }

  async createRollbackBackup() {
    this.log('ROLLBACK', 'Creating rollback backup...');

    if (config.dryRun) {
      this.log('INFO', '[DRY RUN] Would create backup tables');
      return 'dry-run-timestamp';
    }

    const timestamp = this.rollbackStartTime.toISOString().replace(/[:.]/g, '-');
    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tables) {
      try {
        // Check if table has tenant_id column
        const hasColumn = await this.executeQuery(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = 'tenant_id'
          ) as has_tenant_id
        `, [table]);

        if (hasColumn.rows[0]?.has_tenant_id) {
          await this.executeQuery(`
            CREATE TABLE IF NOT EXISTS backup_rollback_${timestamp}_${table} AS 
            SELECT * FROM ${table} WHERE tenant_id IS NOT NULL
          `);
          
          this.log('SUCCESS', `Backup created for ${table}`);
        }
      } catch (error) {
        this.log('ERROR', `Failed to backup ${table}`, { error: error.message });
        throw error;
      }
    }

    this.log('SUCCESS', `Rollback backup completed with timestamp: ${timestamp}`);
    return timestamp;
  }

  async removeTenantTriggers() {
    this.log('ROLLBACK', 'Removing tenant triggers...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    
    for (const table of tables) {
      try {
        await this.executeQuery(`
          DROP TRIGGER IF EXISTS trigger_set_tenant_id_${table} ON ${table}
        `);
        
        this.log('SUCCESS', `Trigger removed from ${table}`);
      } catch (error) {
        this.log('WARNING', `Failed to remove trigger from ${table}`, { error: error.message });
      }
    }

    // Remove trigger function
    try {
      await this.executeQuery(`
        DROP FUNCTION IF EXISTS set_tenant_id_on_inventory()
      `);
      this.log('SUCCESS', 'Tenant trigger function removed');
    } catch (error) {
      this.log('WARNING', 'Failed to remove trigger function', { error: error.message });
    }
  }

  async removeRLSPolicies() {
    this.log('ROLLBACK', 'Removing RLS policies...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    
    for (const table of tables) {
      try {
        // Remove RLS policies
        await this.executeQuery(`
          DROP POLICY IF EXISTS tenant_isolation_${table} ON ${table}
        `);
        
        // Disable RLS
        await this.executeQuery(`
          ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY
        `);
        
        this.log('SUCCESS', `RLS removed from ${table}`);
      } catch (error) {
        this.log('WARNING', `Failed to remove RLS from ${table}`, { error: error.message });
      }
    }
  }

  async removeTenantIndexes() {
    this.log('ROLLBACK', 'Removing tenant-aware indexes...');

    const indexes = [
      'idx_estoque_escolas_tenant_escola_produto',
      'idx_estoque_lotes_tenant_escola_produto',
      'idx_estoque_lotes_tenant_validade_ativo',
      'idx_estoque_historico_tenant_escola_data',
      'idx_estoque_movimentacoes_tenant_lote_data'
    ];

    for (const index of indexes) {
      try {
        await this.executeQuery(`DROP INDEX IF EXISTS ${index}`);
        this.log('SUCCESS', `Index ${index} removed`);
      } catch (error) {
        this.log('WARNING', `Failed to remove index ${index}`, { error: error.message });
      }
    }
  }

  async removeNotNullConstraints() {
    this.log('ROLLBACK', 'Removing NOT NULL constraints from tenant_id columns...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    
    for (const table of tables) {
      try {
        await this.executeQuery(`
          ALTER TABLE ${table} ALTER COLUMN tenant_id DROP NOT NULL
        `);
        
        this.log('SUCCESS', `NOT NULL constraint removed from ${table}.tenant_id`);
      } catch (error) {
        this.log('WARNING', `Failed to remove NOT NULL constraint from ${table}`, { error: error.message });
      }
    }
  }

  async clearTenantData() {
    if (config.preserveData) {
      this.log('INFO', 'Preserving tenant data (--preserve-data flag)');
      return;
    }

    this.log('ROLLBACK', 'Clearing tenant_id data...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    
    for (const table of tables) {
      try {
        const result = await this.executeQuery(`
          UPDATE ${table} SET tenant_id = NULL WHERE tenant_id IS NOT NULL
        `);
        
        const updatedCount = result.rowCount || 0;
        this.log('SUCCESS', `Cleared tenant_id from ${updatedCount} records in ${table}`);
      } catch (error) {
        this.log('ERROR', `Failed to clear tenant_id from ${table}`, { error: error.message });
        throw error;
      }
    }
  }

  async removeTenantColumns() {
    this.log('ROLLBACK', 'Removing tenant_id columns...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    
    for (const table of tables) {
      try {
        // Remove foreign key constraint first
        await this.executeQuery(`
          ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_tenant_id_fkey
        `);
        
        // Remove column
        await this.executeQuery(`
          ALTER TABLE ${table} DROP COLUMN IF EXISTS tenant_id
        `);
        
        this.log('SUCCESS', `tenant_id column removed from ${table}`);
      } catch (error) {
        this.log('ERROR', `Failed to remove tenant_id column from ${table}`, { error: error.message });
        throw error;
      }
    }
  }

  async removeEscolaIdFromLotes() {
    this.log('ROLLBACK', 'Checking escola_id column in estoque_lotes...');

    // Check if escola_id was added during migration
    const result = await this.executeQuery(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id'
      ) as column_exists
    `);

    if (!result.rows[0]?.column_exists) {
      this.log('INFO', 'escola_id column does not exist in estoque_lotes');
      return;
    }

    console.log('\n⚠️  The escola_id column exists in estoque_lotes.');
    console.log('This column may have been added during the migration.');
    
    if (!config.confirm && !config.dryRun) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const shouldRemove = await new Promise((resolve) => {
        rl.question('Remove escola_id column from estoque_lotes? (yes/no): ', (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
      });

      if (!shouldRemove) {
        this.log('INFO', 'Keeping escola_id column in estoque_lotes');
        return;
      }
    }

    try {
      // Remove foreign key constraint
      await this.executeQuery(`
        ALTER TABLE estoque_lotes DROP CONSTRAINT IF EXISTS estoque_lotes_escola_id_fkey
      `);
      
      // Remove column
      await this.executeQuery(`
        ALTER TABLE estoque_lotes DROP COLUMN IF EXISTS escola_id
      `);
      
      this.log('SUCCESS', 'escola_id column removed from estoque_lotes');
    } catch (error) {
      this.log('ERROR', 'Failed to remove escola_id column', { error: error.message });
      throw error;
    }
  }

  async validateRollbackResult() {
    this.log('ROLLBACK', 'Validating rollback result...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];
    const validationResults = {
      columnsRemoved: 0,
      dataCleared: 0,
      rlsDisabled: 0,
      triggersRemoved: 0,
      indexesRemoved: 0
    };

    // Check if tenant_id columns still exist
    for (const table of tables) {
      const result = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'tenant_id'
        ) as column_exists
      `, [table]);

      if (!result.rows[0]?.column_exists) {
        validationResults.columnsRemoved++;
      }
    }

    // Check if RLS is disabled
    for (const table of tables) {
      const result = await this.executeQuery(`
        SELECT rowsecurity FROM pg_tables WHERE tablename = $1
      `, [table]);

      if (result.rows[0] && !result.rows[0].rowsecurity) {
        validationResults.rlsDisabled++;
      }
    }

    this.log('SUCCESS', 'Rollback validation completed', validationResults);
    return validationResults;
  }

  async generateRollbackReport() {
    this.log('INFO', 'Generating rollback report...');

    const report = {
      timestamp: this.rollbackStartTime.toISOString(),
      duration: new Date() - this.rollbackStartTime,
      configuration: config,
      log: this.rollbackLog,
      summary: {
        totalSteps: this.rollbackLog.filter(entry => entry.level === 'SUCCESS').length,
        errors: this.rollbackLog.filter(entry => entry.level === 'ERROR').length,
        warnings: this.rollbackLog.filter(entry => entry.level === 'WARNING').length
      }
    };

    // Console summary
    console.log('\n========================================');
    console.log('INVENTORY TENANT MIGRATION ROLLBACK REPORT');
    console.log('========================================\n');
    
    console.log(`Status: ${report.summary.errors === 0 ? 'SUCCESS' : 'COMPLETED WITH ERRORS'}`);
    console.log(`Duration: ${Math.round(report.duration / 1000)}s`);
    console.log(`Steps Completed: ${report.summary.totalSteps}`);
    console.log(`Errors: ${report.summary.errors}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    
    if (config.dryRun) {
      console.log('\n🔍 DRY RUN MODE - No actual changes were made');
    }

    console.log('\n========================================\n');

    // Export detailed report
    const filename = `inventory-migration-rollback-${this.rollbackStartTime.toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    this.log('SUCCESS', `Detailed rollback report exported to ${filename}`);

    return report;
  }

  async runFullRollback() {
    this.log('INFO', 'Starting inventory tenant migration rollback...');

    try {
      // 1. Confirm rollback
      const confirmed = await this.confirmRollback();
      if (!confirmed) {
        this.log('INFO', 'Rollback cancelled by user');
        return false;
      }

      // 2. Validate current state
      const currentState = await this.validateCurrentState();
      
      // 3. Create backup
      const backupTimestamp = await this.createRollbackBackup();

      // 4. Remove tenant infrastructure
      await this.removeTenantTriggers();
      await this.removeRLSPolicies();
      await this.removeTenantIndexes();
      await this.removeNotNullConstraints();

      // 5. Clear data (optional)
      await this.clearTenantData();

      // 6. Remove columns (if not preserving data)
      if (!config.preserveData) {
        await this.removeTenantColumns();
        await this.removeEscolaIdFromLotes();
      }

      // 7. Validate result
      await this.validateRollbackResult();

      // 8. Generate report
      await this.generateRollbackReport();

      this.log('SUCCESS', 'Rollback completed successfully!');
      
      if (backupTimestamp && backupTimestamp !== 'dry-run-timestamp') {
        this.log('INFO', `Backup available with timestamp: ${backupTimestamp}`);
      }

      return true;

    } catch (error) {
      this.log('ERROR', 'Rollback failed', { error: error.message });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Main function
async function main() {
  const rollback = new InventoryMigrationRollback();

  try {
    rollback.log('INFO', 'Starting inventory tenant migration rollback script');
    rollback.log('INFO', `Configuration: ${JSON.stringify(config, null, 2)}`);

    const success = await rollback.runFullRollback();
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    rollback.log('ERROR', 'Rollback script failed', { error: error.message, stack: error.stack });
    process.exit(1);

  } finally {
    await rollback.close();
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

module.exports = InventoryMigrationRollback;