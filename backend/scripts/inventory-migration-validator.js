/**
 * INVENTORY TENANT MIGRATION VALIDATOR
 * 
 * Comprehensive validation script for inventory tenant migration.
 * This script validates data integrity, referential integrity, and tenant isolation
 * after the inventory tenant migration has been executed.
 * 
 * Usage: node inventory-migration-validator.js [--detailed] [--fix-issues] [--export-report]
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

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
  detailed: process.argv.includes('--detailed'),
  fixIssues: process.argv.includes('--fix-issues'),
  exportReport: process.argv.includes('--export-report'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class InventoryMigrationValidator {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.validationResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0
      },
      checks: [],
      issues: [],
      recommendations: []
    };
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'WARNING': '⚠️',
      'ERROR': '❌',
      'DEBUG': '🔍',
      'VALIDATE': '🔍'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data && config.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
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

  addValidationResult(checkName, status, message, details = null, recommendation = null) {
    this.validationResults.totalChecks++;
    
    const result = {
      check: checkName,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    this.validationResults.checks.push(result);

    switch (status) {
      case 'PASS':
        this.validationResults.summary.passedChecks++;
        this.log('SUCCESS', `${checkName}: ${message}`);
        break;
      case 'FAIL':
        this.validationResults.summary.failedChecks++;
        this.validationResults.issues.push(result);
        this.log('ERROR', `${checkName}: ${message}`, details);
        break;
      case 'WARNING':
        this.validationResults.summary.warningChecks++;
        this.log('WARNING', `${checkName}: ${message}`, details);
        break;
    }

    if (recommendation) {
      this.validationResults.recommendations.push({
        check: checkName,
        recommendation,
        timestamp: new Date().toISOString()
      });
    }
  }

  async validateTableStructure() {
    this.log('VALIDATE', 'Validating table structure...');

    // Check if tenant_id columns exist
    const requiredColumns = [
      { table: 'estoque_escolas', column: 'tenant_id' },
      { table: 'estoque_lotes', column: 'tenant_id' },
      { table: 'estoque_escolas_historico', column: 'tenant_id' },
      { table: 'estoque_movimentacoes', column: 'tenant_id' },
      { table: 'estoque_lotes', column: 'escola_id' }
    ];

    for (const { table, column } of requiredColumns) {
      const result = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2
        ) as column_exists
      `, [table, column]);

      const exists = result.rows[0].column_exists;
      
      if (exists) {
        this.addValidationResult(
          `STRUCTURE_${table.toUpperCase()}_${column.toUpperCase()}`,
          'PASS',
          `Column ${column} exists in ${table}`
        );
      } else {
        this.addValidationResult(
          `STRUCTURE_${table.toUpperCase()}_${column.toUpperCase()}`,
          'FAIL',
          `Column ${column} missing in ${table}`,
          { table, column },
          `Execute ALTER TABLE ${table} ADD COLUMN ${column} UUID;`
        );
      }
    }

    // Check if columns are NOT NULL (after migration)
    const notNullColumns = [
      { table: 'estoque_escolas', column: 'tenant_id' },
      { table: 'estoque_lotes', column: 'tenant_id' },
      { table: 'estoque_escolas_historico', column: 'tenant_id' },
      { table: 'estoque_movimentacoes', column: 'tenant_id' }
    ];

    for (const { table, column } of notNullColumns) {
      const result = await this.executeQuery(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [table, column]);

      if (result.rows.length > 0) {
        const isNullable = result.rows[0].is_nullable === 'YES';
        
        if (!isNullable) {
          this.addValidationResult(
            `CONSTRAINT_${table.toUpperCase()}_${column.toUpperCase()}_NOT_NULL`,
            'PASS',
            `Column ${column} in ${table} is NOT NULL`
          );
        } else {
          this.addValidationResult(
            `CONSTRAINT_${table.toUpperCase()}_${column.toUpperCase()}_NOT_NULL`,
            'WARNING',
            `Column ${column} in ${table} is nullable`,
            { table, column },
            `Execute ALTER TABLE ${table} ALTER COLUMN ${column} SET NOT NULL after data migration`
          );
        }
      }
    }
  }

  async validateDataCompleteness() {
    this.log('VALIDATE', 'Validating data completeness...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tables) {
      const result = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(tenant_id) as records_with_tenant_id,
          COUNT(*) - COUNT(tenant_id) as records_without_tenant_id
        FROM ${table}
      `);

      const { total_records, records_with_tenant_id, records_without_tenant_id } = result.rows[0];
      const completeness = total_records > 0 ? (records_with_tenant_id / total_records) * 100 : 100;

      if (completeness === 100) {
        this.addValidationResult(
          `DATA_COMPLETENESS_${table.toUpperCase()}`,
          'PASS',
          `All ${total_records} records in ${table} have tenant_id`,
          { total_records, records_with_tenant_id, completeness: '100%' }
        );
      } else if (completeness >= 95) {
        this.addValidationResult(
          `DATA_COMPLETENESS_${table.toUpperCase()}`,
          'WARNING',
          `${completeness.toFixed(2)}% of records in ${table} have tenant_id`,
          { total_records, records_with_tenant_id, records_without_tenant_id, completeness: `${completeness.toFixed(2)}%` },
          `Update remaining ${records_without_tenant_id} records with appropriate tenant_id`
        );
      } else {
        this.addValidationResult(
          `DATA_COMPLETENESS_${table.toUpperCase()}`,
          'FAIL',
          `Only ${completeness.toFixed(2)}% of records in ${table} have tenant_id`,
          { total_records, records_with_tenant_id, records_without_tenant_id, completeness: `${completeness.toFixed(2)}%` },
          `Re-run data migration for ${table}`
        );
      }
    }
  }

  async validateReferentialIntegrity() {
    this.log('VALIDATE', 'Validating referential integrity...');

    // Check estoque_lotes.escola_id references
    const lotesIntegrityResult = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_lotes,
        COUNT(el.escola_id) as lotes_with_escola_id,
        COUNT(e.id) as valid_escola_references,
        COUNT(*) - COUNT(e.id) as invalid_escola_references
      FROM estoque_lotes el
      LEFT JOIN escolas e ON e.id = el.escola_id
    `);

    const { total_lotes, lotes_with_escola_id, valid_escola_references, invalid_escola_references } = lotesIntegrityResult.rows[0];

    if (invalid_escola_references === 0) {
      this.addValidationResult(
        'REFERENTIAL_INTEGRITY_LOTES_ESCOLA',
        'PASS',
        `All ${total_lotes} lotes have valid escola_id references`,
        { total_lotes, valid_escola_references }
      );
    } else {
      this.addValidationResult(
        'REFERENTIAL_INTEGRITY_LOTES_ESCOLA',
        'FAIL',
        `${invalid_escola_references} lotes have invalid escola_id references`,
        { total_lotes, lotes_with_escola_id, valid_escola_references, invalid_escola_references },
        'Fix or remove lotes with invalid escola_id references'
      );
    }

    // Check estoque_movimentacoes.lote_id references
    const movimentacoesIntegrityResult = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_movimentacoes,
        COUNT(el.id) as valid_lote_references,
        COUNT(*) - COUNT(el.id) as invalid_lote_references
      FROM estoque_movimentacoes em
      LEFT JOIN estoque_lotes el ON el.id = em.lote_id
    `);

    const { total_movimentacoes, valid_lote_references, invalid_lote_references } = movimentacoesIntegrityResult.rows[0];

    if (invalid_lote_references === 0) {
      this.addValidationResult(
        'REFERENTIAL_INTEGRITY_MOVIMENTACOES_LOTE',
        'PASS',
        `All ${total_movimentacoes} movimentacoes have valid lote_id references`,
        { total_movimentacoes, valid_lote_references }
      );
    } else {
      this.addValidationResult(
        'REFERENTIAL_INTEGRITY_MOVIMENTACOES_LOTE',
        'FAIL',
        `${invalid_lote_references} movimentacoes have invalid lote_id references`,
        { total_movimentacoes, valid_lote_references, invalid_lote_references },
        'Remove movimentacoes with invalid lote_id references'
      );
    }

    // Check tenant_id references
    const tenantTables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tenantTables) {
      const result = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(t.id) as valid_tenant_references,
          COUNT(*) - COUNT(t.id) as invalid_tenant_references
        FROM ${table} tbl
        LEFT JOIN tenants t ON t.id = tbl.tenant_id
        WHERE tbl.tenant_id IS NOT NULL
      `);

      const { total_records, valid_tenant_references, invalid_tenant_references } = result.rows[0];

      if (invalid_tenant_references === 0) {
        this.addValidationResult(
          `REFERENTIAL_INTEGRITY_${table.toUpperCase()}_TENANT`,
          'PASS',
          `All ${total_records} records in ${table} have valid tenant_id references`,
          { total_records, valid_tenant_references }
        );
      } else {
        this.addValidationResult(
          `REFERENTIAL_INTEGRITY_${table.toUpperCase()}_TENANT`,
          'FAIL',
          `${invalid_tenant_references} records in ${table} have invalid tenant_id references`,
          { total_records, valid_tenant_references, invalid_tenant_references },
          `Fix or remove records with invalid tenant_id in ${table}`
        );
      }
    }
  }

  async validateTenantConsistency() {
    this.log('VALIDATE', 'Validating tenant consistency...');

    // Check estoque_escolas vs escolas tenant consistency
    const estoqueEscolasConsistency = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN ee.tenant_id = e.tenant_id THEN 1 END) as consistent_records,
        COUNT(CASE WHEN ee.tenant_id != e.tenant_id THEN 1 END) as inconsistent_records
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.tenant_id IS NOT NULL AND e.tenant_id IS NOT NULL
    `);

    const { total_records, consistent_records, inconsistent_records } = estoqueEscolasConsistency.rows[0];

    if (inconsistent_records === 0) {
      this.addValidationResult(
        'TENANT_CONSISTENCY_ESTOQUE_ESCOLAS',
        'PASS',
        `All ${total_records} estoque_escolas records have consistent tenant_id with their escola`,
        { total_records, consistent_records }
      );
    } else {
      this.addValidationResult(
        'TENANT_CONSISTENCY_ESTOQUE_ESCOLAS',
        'FAIL',
        `${inconsistent_records} estoque_escolas records have inconsistent tenant_id`,
        { total_records, consistent_records, inconsistent_records },
        'Update estoque_escolas tenant_id to match escola tenant_id'
      );
    }

    // Check estoque_lotes vs escolas tenant consistency
    const estoqueLotesConsistency = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN el.tenant_id = e.tenant_id THEN 1 END) as consistent_records,
        COUNT(CASE WHEN el.tenant_id != e.tenant_id THEN 1 END) as inconsistent_records
      FROM estoque_lotes el
      JOIN escolas e ON e.id = el.escola_id
      WHERE el.tenant_id IS NOT NULL AND e.tenant_id IS NOT NULL
    `);

    const lotesResult = estoqueLotesConsistency.rows[0];

    if (lotesResult.inconsistent_records === 0) {
      this.addValidationResult(
        'TENANT_CONSISTENCY_ESTOQUE_LOTES',
        'PASS',
        `All ${lotesResult.total_records} estoque_lotes records have consistent tenant_id with their escola`,
        { total_records: lotesResult.total_records, consistent_records: lotesResult.consistent_records }
      );
    } else {
      this.addValidationResult(
        'TENANT_CONSISTENCY_ESTOQUE_LOTES',
        'FAIL',
        `${lotesResult.inconsistent_records} estoque_lotes records have inconsistent tenant_id`,
        lotesResult,
        'Update estoque_lotes tenant_id to match escola tenant_id'
      );
    }

    // Check estoque_movimentacoes vs estoque_lotes tenant consistency
    const movimentacoesConsistency = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN em.tenant_id = el.tenant_id THEN 1 END) as consistent_records,
        COUNT(CASE WHEN em.tenant_id != el.tenant_id THEN 1 END) as inconsistent_records
      FROM estoque_movimentacoes em
      JOIN estoque_lotes el ON el.id = em.lote_id
      WHERE em.tenant_id IS NOT NULL AND el.tenant_id IS NOT NULL
    `);

    const movResult = movimentacoesConsistency.rows[0];

    if (movResult.inconsistent_records === 0) {
      this.addValidationResult(
        'TENANT_CONSISTENCY_ESTOQUE_MOVIMENTACOES',
        'PASS',
        `All ${movResult.total_records} estoque_movimentacoes records have consistent tenant_id with their lote`,
        { total_records: movResult.total_records, consistent_records: movResult.consistent_records }
      );
    } else {
      this.addValidationResult(
        'TENANT_CONSISTENCY_ESTOQUE_MOVIMENTACOES',
        'FAIL',
        `${movResult.inconsistent_records} estoque_movimentacoes records have inconsistent tenant_id`,
        movResult,
        'Update estoque_movimentacoes tenant_id to match estoque_lotes tenant_id'
      );
    }
  }

  async validateIndexes() {
    this.log('VALIDATE', 'Validating tenant-aware indexes...');

    const expectedIndexes = [
      'idx_estoque_escolas_tenant_escola_produto',
      'idx_estoque_lotes_tenant_escola_produto',
      'idx_estoque_lotes_tenant_validade_ativo',
      'idx_estoque_historico_tenant_escola_data',
      'idx_estoque_movimentacoes_tenant_lote_data'
    ];

    for (const indexName of expectedIndexes) {
      const result = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = $1
        ) as index_exists
      `, [indexName]);

      const exists = result.rows[0].index_exists;

      if (exists) {
        this.addValidationResult(
          `INDEX_${indexName.toUpperCase()}`,
          'PASS',
          `Index ${indexName} exists`
        );
      } else {
        this.addValidationResult(
          `INDEX_${indexName.toUpperCase()}`,
          'WARNING',
          `Index ${indexName} missing`,
          { indexName },
          `Create index: CREATE INDEX ${indexName} ON ...`
        );
      }
    }
  }

  async validateRLS() {
    this.log('VALIDATE', 'Validating Row Level Security...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tables) {
      // Check if RLS is enabled
      const rlsResult = await this.executeQuery(`
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = $1
      `, [table]);

      if (rlsResult.rows.length > 0) {
        const rlsEnabled = rlsResult.rows[0].rowsecurity;

        if (rlsEnabled) {
          this.addValidationResult(
            `RLS_ENABLED_${table.toUpperCase()}`,
            'PASS',
            `RLS enabled on ${table}`
          );
        } else {
          this.addValidationResult(
            `RLS_ENABLED_${table.toUpperCase()}`,
            'WARNING',
            `RLS not enabled on ${table}`,
            { table },
            `Execute: ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
          );
        }

        // Check if RLS policies exist
        const policyResult = await this.executeQuery(`
          SELECT COUNT(*) as policy_count
          FROM pg_policies 
          WHERE tablename = $1
        `, [table]);

        const policyCount = parseInt(policyResult.rows[0].policy_count);

        if (policyCount > 0) {
          this.addValidationResult(
            `RLS_POLICIES_${table.toUpperCase()}`,
            'PASS',
            `${policyCount} RLS policies found on ${table}`
          );
        } else {
          this.addValidationResult(
            `RLS_POLICIES_${table.toUpperCase()}`,
            'WARNING',
            `No RLS policies found on ${table}`,
            { table },
            `Create RLS policy for tenant isolation on ${table}`
          );
        }
      }
    }
  }

  async validateTriggers() {
    this.log('VALIDATE', 'Validating tenant triggers...');

    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tables) {
      const result = await this.executeQuery(`
        SELECT COUNT(*) as trigger_count
        FROM information_schema.triggers 
        WHERE event_object_table = $1 
          AND trigger_name LIKE '%tenant%'
      `, [table]);

      const triggerCount = parseInt(result.rows[0].trigger_count);

      if (triggerCount > 0) {
        this.addValidationResult(
          `TRIGGERS_${table.toUpperCase()}`,
          'PASS',
          `${triggerCount} tenant triggers found on ${table}`
        );
      } else {
        this.addValidationResult(
          `TRIGGERS_${table.toUpperCase()}`,
          'WARNING',
          `No tenant triggers found on ${table}`,
          { table },
          `Create trigger to automatically set tenant_id on ${table}`
        );
      }
    }
  }

  async validateDataDistribution() {
    this.log('VALIDATE', 'Validating data distribution across tenants...');

    const result = await this.executeQuery(`
      SELECT 
        t.slug as tenant_slug,
        t.name as tenant_name,
        (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) as estoque_escolas_count,
        (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id = t.id) as estoque_lotes_count,
        (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id = t.id) as historico_count,
        (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id = t.id) as movimentacoes_count
      FROM tenants t
      ORDER BY t.slug
    `);

    let totalRecords = 0;
    let tenantsWithData = 0;

    for (const row of result.rows) {
      const recordCount = parseInt(row.estoque_escolas_count) + 
                         parseInt(row.estoque_lotes_count) + 
                         parseInt(row.historico_count) + 
                         parseInt(row.movimentacoes_count);
      
      totalRecords += recordCount;
      
      if (recordCount > 0) {
        tenantsWithData++;
        
        this.addValidationResult(
          `DATA_DISTRIBUTION_${row.tenant_slug.toUpperCase()}`,
          'PASS',
          `Tenant ${row.tenant_slug} has ${recordCount} inventory records`,
          {
            tenant: row.tenant_slug,
            estoque_escolas: row.estoque_escolas_count,
            estoque_lotes: row.estoque_lotes_count,
            historico: row.historico_count,
            movimentacoes: row.movimentacoes_count,
            total: recordCount
          }
        );
      }
    }

    this.addValidationResult(
      'DATA_DISTRIBUTION_SUMMARY',
      'PASS',
      `Data distributed across ${tenantsWithData} tenants (${totalRecords} total records)`,
      { tenantsWithData, totalRecords }
    );
  }

  async fixIssues() {
    if (!config.fixIssues) {
      this.log('INFO', 'Issue fixing disabled (use --fix-issues to enable)');
      return;
    }

    this.log('INFO', 'Attempting to fix identified issues...');

    const fixableIssues = this.validationResults.issues.filter(issue => 
      issue.check.includes('REFERENTIAL_INTEGRITY') || 
      issue.check.includes('DATA_COMPLETENESS')
    );

    for (const issue of fixableIssues) {
      try {
        if (issue.check.includes('MOVIMENTACOES_LOTE')) {
          // Fix orphaned movimentacoes
          this.log('INFO', 'Fixing orphaned movimentacoes...');
          await this.executeQuery(`
            DELETE FROM estoque_movimentacoes 
            WHERE lote_id NOT IN (SELECT id FROM estoque_lotes)
          `);
          this.log('SUCCESS', 'Orphaned movimentacoes removed');
        }

        if (issue.check.includes('DATA_COMPLETENESS')) {
          // Try to populate missing tenant_id
          const table = issue.check.split('_')[2].toLowerCase();
          this.log('INFO', `Fixing missing tenant_id in ${table}...`);
          
          if (table === 'estoque_escolas') {
            await this.executeQuery(`
              UPDATE estoque_escolas 
              SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_escolas.escola_id)
              WHERE tenant_id IS NULL
            `);
          } else if (table === 'estoque_lotes') {
            await this.executeQuery(`
              UPDATE estoque_lotes 
              SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_lotes.escola_id)
              WHERE tenant_id IS NULL AND escola_id IS NOT NULL
            `);
          }
          
          this.log('SUCCESS', `Missing tenant_id fixed in ${table}`);
        }

      } catch (error) {
        this.log('ERROR', `Failed to fix issue ${issue.check}`, { error: error.message });
      }
    }
  }

  async generateReport() {
    this.log('INFO', 'Generating validation report...');

    const report = {
      ...this.validationResults,
      summary: {
        ...this.validationResults.summary,
        successRate: this.validationResults.summary.totalChecks > 0 
          ? (this.validationResults.summary.passedChecks / this.validationResults.summary.totalChecks * 100).toFixed(2)
          : 100,
        status: this.validationResults.summary.failedChecks === 0 
          ? (this.validationResults.summary.warningChecks === 0 ? 'PASS' : 'PASS_WITH_WARNINGS')
          : 'FAIL'
      }
    };

    // Console summary
    console.log('\n========================================');
    console.log('INVENTORY TENANT MIGRATION VALIDATION REPORT');
    console.log('========================================\n');
    
    console.log(`Status: ${report.summary.status}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);
    console.log(`Total Checks: ${report.summary.totalChecks}`);
    console.log(`Passed: ${report.summary.passedChecks}`);
    console.log(`Failed: ${report.summary.failedChecks}`);
    console.log(`Warnings: ${report.summary.warningChecks}`);
    
    if (report.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      report.issues.forEach(issue => {
        console.log(`  - ${issue.check}: ${issue.message}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec.check}: ${rec.recommendation}`);
      });
    }

    console.log('\n========================================\n');

    // Export detailed report if requested
    if (config.exportReport) {
      const filename = `inventory-migration-validation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await fs.writeFile(filename, JSON.stringify(report, null, 2));
      this.log('SUCCESS', `Detailed report exported to ${filename}`);
    }

    return report;
  }

  async runFullValidation() {
    this.log('INFO', 'Starting comprehensive inventory tenant migration validation...');

    try {
      await this.validateTableStructure();
      await this.validateDataCompleteness();
      await this.validateReferentialIntegrity();
      await this.validateTenantConsistency();
      await this.validateIndexes();
      await this.validateRLS();
      await this.validateTriggers();
      await this.validateDataDistribution();

      await this.fixIssues();
      
      const report = await this.generateReport();
      
      if (report.summary.status === 'PASS') {
        this.log('SUCCESS', 'All validations passed! Migration is successful.');
        return true;
      } else if (report.summary.status === 'PASS_WITH_WARNINGS') {
        this.log('WARNING', 'Validation passed with warnings. Review recommendations.');
        return true;
      } else {
        this.log('ERROR', 'Validation failed. Critical issues found.');
        return false;
      }

    } catch (error) {
      this.log('ERROR', 'Validation failed with error', { error: error.message });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Main function
async function main() {
  const validator = new InventoryMigrationValidator();

  try {
    validator.log('INFO', 'Starting inventory tenant migration validator');
    validator.log('INFO', `Configuration: ${JSON.stringify(config, null, 2)}`);

    const success = await validator.runFullValidation();
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    validator.log('ERROR', 'Validator failed', { error: error.message, stack: error.stack });
    process.exit(1);

  } finally {
    await validator.close();
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

module.exports = InventoryMigrationValidator 