#!/usr/bin/env node

/**
 * DATA INTEGRITY VERIFIER
 * 
 * Comprehensive data integrity verification for inventory tenant migration.
 * This script performs deep validation of data consistency, referential integrity,
 * and business logic compliance after migration.
 * 
 * Usage: node data-integrity-verifier.js [--fix-issues] [--detailed] [--export-report]
 */

const { Pool } = require('pg');
const MigrationLogger = require('./migration-logger');

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
  fixIssues: process.argv.includes('--fix-issues'),
  detailed: process.argv.includes('--detailed'),
  exportReport: process.argv.includes('--export-report'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class DataIntegrityVerifier {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.logger = new MigrationLogger('data-integrity-verification', {
      verbose: config.verbose,
      exportLogs: config.exportReport
    });
    this.issues = [];
    this.fixedIssues = [];
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

  async addIssue(category, severity, description, details, fixQuery = null) {
    const issue = {
      category,
      severity,
      description,
      details,
      fixQuery,
      timestamp: new Date().toISOString()
    };

    this.issues.push(issue);
    
    await this.logger.log(
      severity === 'CRITICAL' ? 'ERROR' : 'WARNING',
      `INTEGRITY_${category.toUpperCase()}`,
      description,
      details
    );

    return issue;
  }

  async verifyTenantDataCompleteness() {
    await this.logger.logInfo('VERIFY_COMPLETENESS', 'Verifying tenant data completeness...');

    const tables = [
      'estoque_escolas',
      'estoque_lotes', 
      'estoque_escolas_historico',
      'estoque_movimentacoes'
    ];

    for (const table of tables) {
      const result = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(tenant_id) as records_with_tenant,
          COUNT(*) - COUNT(tenant_id) as records_without_tenant
        FROM ${table}
      `);

      const { total_records, records_with_tenant, records_without_tenant } = result.rows[0];
      const completeness = total_records > 0 ? (records_with_tenant / total_records) * 100 : 100;

      if (records_without_tenant > 0) {
        await this.addIssue(
          'DATA_COMPLETENESS',
          records_without_tenant > total_records * 0.1 ? 'CRITICAL' : 'WARNING',
          `${records_without_tenant} records in ${table} missing tenant_id`,
          { table, total_records, records_without_tenant, completeness: `${completeness.toFixed(2)}%` },
          `UPDATE ${table} SET tenant_id = (SELECT appropriate_tenant_id) WHERE tenant_id IS NULL`
        );
      } else {
        await this.logger.logSuccess(
          'DATA_COMPLETENESS',
          `All ${total_records} records in ${table} have tenant_id`,
          { table, total_records, completeness: '100%' }
        );
      }
    }
  }

  async verifyReferentialIntegrity() {
    await this.logger.logInfo('VERIFY_REFERENTIAL', 'Verifying referential integrity...');

    // Check estoque_escolas -> escolas relationship
    const estoqueEscolasCheck = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_estoque,
        COUNT(e.id) as valid_escola_refs,
        COUNT(*) - COUNT(e.id) as invalid_escola_refs
      FROM estoque_escolas ee
      LEFT JOIN escolas e ON e.id = ee.escola_id
    `);

    const { total_estoque, valid_escola_refs, invalid_escola_refs } = estoqueEscolasCheck.rows[0];

    if (invalid_escola_refs > 0) {
      await this.addIssue(
        'REFERENTIAL_INTEGRITY',
        'CRITICAL',
        `${invalid_escola_refs} estoque_escolas records reference non-existent escolas`,
        { total_estoque, valid_escola_refs, invalid_escola_refs },
        'DELETE FROM estoque_escolas WHERE escola_id NOT IN (SELECT id FROM escolas)'
      );
    }

    // Check estoque_lotes -> escolas relationship
    const estoqueLotesCheck = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_lotes,
        COUNT(el.escola_id) as lotes_with_escola,
        COUNT(e.id) as valid_escola_refs,
        COUNT(el.escola_id) - COUNT(e.id) as invalid_escola_refs
      FROM estoque_lotes el
      LEFT JOIN escolas e ON e.id = el.escola_id
    `);

    const lotesResult = estoqueLotesCheck.rows[0];

    if (lotesResult.invalid_escola_refs > 0) {
      await this.addIssue(
        'REFERENTIAL_INTEGRITY',
        'CRITICAL',
        `${lotesResult.invalid_escola_refs} estoque_lotes records reference non-existent escolas`,
        lotesResult,
        'UPDATE estoque_lotes SET escola_id = NULL WHERE escola_id NOT IN (SELECT id FROM escolas)'
      );
    }

    // Check estoque_movimentacoes -> estoque_lotes relationship
    const movimentacoesCheck = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_movimentacoes,
        COUNT(el.id) as valid_lote_refs,
        COUNT(*) - COUNT(el.id) as invalid_lote_refs
      FROM estoque_movimentacoes em
      LEFT JOIN estoque_lotes el ON el.id = em.lote_id
    `);

    const movResult = movimentacoesCheck.rows[0];

    if (movResult.invalid_lote_refs > 0) {
      await this.addIssue(
        'REFERENTIAL_INTEGRITY',
        'CRITICAL',
        `${movResult.invalid_lote_refs} estoque_movimentacoes records reference non-existent lotes`,
        movResult,
        'DELETE FROM estoque_movimentacoes WHERE lote_id NOT IN (SELECT id FROM estoque_lotes)'
      );
    }

    // Check tenant_id references
    const tenantTables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tenantTables) {
      const tenantCheck = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(t.id) as valid_tenant_refs,
          COUNT(*) - COUNT(t.id) as invalid_tenant_refs
        FROM ${table} tbl
        LEFT JOIN tenants t ON t.id = tbl.tenant_id
        WHERE tbl.tenant_id IS NOT NULL
      `);

      const { total_records, valid_tenant_refs, invalid_tenant_refs } = tenantCheck.rows[0];

      if (invalid_tenant_refs > 0) {
        await this.addIssue(
          'REFERENTIAL_INTEGRITY',
          'CRITICAL',
          `${invalid_tenant_refs} records in ${table} reference non-existent tenants`,
          { table, total_records, valid_tenant_refs, invalid_tenant_refs },
          `DELETE FROM ${table} WHERE tenant_id NOT IN (SELECT id FROM tenants)`
        );
      }
    }
  }

  async verifyTenantConsistency() {
    await this.logger.logInfo('VERIFY_CONSISTENCY', 'Verifying tenant consistency...');

    // Check estoque_escolas vs escolas tenant consistency
    const estoqueEscolasConsistency = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN ee.tenant_id = e.tenant_id THEN 1 END) as consistent_records,
        COUNT(CASE WHEN ee.tenant_id != e.tenant_id THEN 1 END) as inconsistent_records,
        array_agg(DISTINCT ee.id) FILTER (WHERE ee.tenant_id != e.tenant_id) as inconsistent_ids
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.tenant_id IS NOT NULL AND e.tenant_id IS NOT NULL
    `);

    const estoqueResult = estoqueEscolasConsistency.rows[0];

    if (estoqueResult.inconsistent_records > 0) {
      await this.addIssue(
        'TENANT_CONSISTENCY',
        'CRITICAL',
        `${estoqueResult.inconsistent_records} estoque_escolas records have inconsistent tenant_id with their escola`,
        estoqueResult,
        'UPDATE estoque_escolas SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_escolas.escola_id)'
      );
    }

    // Check estoque_lotes vs escolas tenant consistency
    const estoqueLotesConsistency = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN el.tenant_id = e.tenant_id THEN 1 END) as consistent_records,
        COUNT(CASE WHEN el.tenant_id != e.tenant_id THEN 1 END) as inconsistent_records,
        array_agg(DISTINCT el.id) FILTER (WHERE el.tenant_id != e.tenant_id) as inconsistent_ids
      FROM estoque_lotes el
      JOIN escolas e ON e.id = el.escola_id
      WHERE el.tenant_id IS NOT NULL AND e.tenant_id IS NOT NULL
    `);

    const lotesResult = estoqueLotesConsistency.rows[0];

    if (lotesResult.inconsistent_records > 0) {
      await this.addIssue(
        'TENANT_CONSISTENCY',
        'CRITICAL',
        `${lotesResult.inconsistent_records} estoque_lotes records have inconsistent tenant_id with their escola`,
        lotesResult,
        'UPDATE estoque_lotes SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_lotes.escola_id)'
      );
    }

    // Check estoque_movimentacoes vs estoque_lotes tenant consistency
    const movimentacoesConsistency = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN em.tenant_id = el.tenant_id THEN 1 END) as consistent_records,
        COUNT(CASE WHEN em.tenant_id != el.tenant_id THEN 1 END) as inconsistent_records,
        array_agg(DISTINCT em.id) FILTER (WHERE em.tenant_id != el.tenant_id) as inconsistent_ids
      FROM estoque_movimentacoes em
      JOIN estoque_lotes el ON el.id = em.lote_id
      WHERE em.tenant_id IS NOT NULL AND el.tenant_id IS NOT NULL
    `);

    const movResult = movimentacoesConsistency.rows[0];

    if (movResult.inconsistent_records > 0) {
      await this.addIssue(
        'TENANT_CONSISTENCY',
        'CRITICAL',
        `${movResult.inconsistent_records} estoque_movimentacoes records have inconsistent tenant_id with their lote`,
        movResult,
        'UPDATE estoque_movimentacoes SET tenant_id = (SELECT tenant_id FROM estoque_lotes WHERE id = estoque_movimentacoes.lote_id)'
      );
    }
  }

  async verifyBusinessLogicIntegrity() {
    await this.logger.logInfo('VERIFY_BUSINESS_LOGIC', 'Verifying business logic integrity...');

    // Check for negative quantities
    const negativeQuantities = await this.executeQuery(`
      SELECT 
        'estoque_escolas' as table_name,
        COUNT(*) as negative_count,
        array_agg(id) as negative_ids
      FROM estoque_escolas 
      WHERE quantidade_atual < 0
      
      UNION ALL
      
      SELECT 
        'estoque_lotes' as table_name,
        COUNT(*) as negative_count,
        array_agg(id) as negative_ids
      FROM estoque_lotes 
      WHERE quantidade_atual < 0 OR quantidade_inicial < 0
    `);

    for (const row of negativeQuantities.rows) {
      if (row.negative_count > 0) {
        await this.addIssue(
          'BUSINESS_LOGIC',
          'WARNING',
          `${row.negative_count} records in ${row.table_name} have negative quantities`,
          { table: row.table_name, count: row.negative_count, ids: row.negative_ids },
          `UPDATE ${row.table_name} SET quantidade_atual = 0 WHERE quantidade_atual < 0`
        );
      }
    }

    // Check for lotes with quantidade_atual > quantidade_inicial
    const invalidLoteQuantities = await this.executeQuery(`
      SELECT 
        COUNT(*) as invalid_count,
        array_agg(id) as invalid_ids
      FROM estoque_lotes 
      WHERE quantidade_atual > quantidade_inicial
    `);

    if (invalidLoteQuantities.rows[0].invalid_count > 0) {
      await this.addIssue(
        'BUSINESS_LOGIC',
        'WARNING',
        `${invalidLoteQuantities.rows[0].invalid_count} lotes have quantidade_atual > quantidade_inicial`,
        invalidLoteQuantities.rows[0],
        'UPDATE estoque_lotes SET quantidade_atual = quantidade_inicial WHERE quantidade_atual > quantidade_inicial'
      );
    }

    // Check for future expiration dates that are in the past
    const expiredLotes = await this.executeQuery(`
      SELECT 
        COUNT(*) as expired_count,
        array_agg(id) as expired_ids
      FROM estoque_lotes 
      WHERE data_validade < CURRENT_DATE AND status = 'ativo'
    `);

    if (expiredLotes.rows[0].expired_count > 0) {
      await this.addIssue(
        'BUSINESS_LOGIC',
        'WARNING',
        `${expiredLotes.rows[0].expired_count} active lotes have expired dates`,
        expiredLotes.rows[0],
        "UPDATE estoque_lotes SET status = 'vencido' WHERE data_validade < CURRENT_DATE AND status = 'ativo'"
      );
    }
  }

  async verifyDataDistribution() {
    await this.logger.logInfo('VERIFY_DISTRIBUTION', 'Verifying data distribution across tenants...');

    // Check if all data is concentrated in one tenant (potential migration issue)
    const tenantDistribution = await this.executeQuery(`
      SELECT 
        t.slug as tenant_slug,
        t.name as tenant_name,
        (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) as estoque_count,
        (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id = t.id) as lotes_count,
        (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id = t.id) as historico_count,
        (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id = t.id) as movimentacoes_count
      FROM tenants t
      ORDER BY t.slug
    `);

    let totalRecords = 0;
    let maxTenantRecords = 0;
    let tenantsWithData = 0;

    for (const row of tenantDistribution.rows) {
      const tenantRecords = parseInt(row.estoque_count) + parseInt(row.lotes_count) + 
                           parseInt(row.historico_count) + parseInt(row.movimentacoes_count);
      
      totalRecords += tenantRecords;
      maxTenantRecords = Math.max(maxTenantRecords, tenantRecords);
      
      if (tenantRecords > 0) {
        tenantsWithData++;
      }
    }

    // Check if more than 90% of data is in one tenant (potential issue)
    if (totalRecords > 0 && maxTenantRecords / totalRecords > 0.9 && tenantsWithData > 1) {
      await this.addIssue(
        'DATA_DISTRIBUTION',
        'WARNING',
        `${((maxTenantRecords / totalRecords) * 100).toFixed(1)}% of inventory data is concentrated in one tenant`,
        { totalRecords, maxTenantRecords, tenantsWithData },
        'Review tenant assignment logic - data may not be properly distributed'
      );
    }

    // Check for tenants with no inventory data but with schools
    const tenantsWithSchoolsButNoInventory = await this.executeQuery(`
      SELECT 
        t.slug,
        t.name,
        (SELECT COUNT(*) FROM escolas WHERE tenant_id = t.id) as escola_count,
        (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) as estoque_count
      FROM tenants t
      WHERE (SELECT COUNT(*) FROM escolas WHERE tenant_id = t.id) > 0
        AND (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) = 0
    `);

    if (tenantsWithSchoolsButNoInventory.rows.length > 0) {
      await this.addIssue(
        'DATA_DISTRIBUTION',
        'WARNING',
        `${tenantsWithSchoolsButNoInventory.rows.length} tenants have schools but no inventory data`,
        { tenants: tenantsWithSchoolsButNoInventory.rows },
        'Verify if these tenants should have inventory data'
      );
    }
  }

  async verifyIndexPerformance() {
    await this.logger.logInfo('VERIFY_PERFORMANCE', 'Verifying index performance...');

    // Check if tenant-aware indexes exist and are being used
    const expectedIndexes = [
      'idx_estoque_escolas_tenant_escola_produto',
      'idx_estoque_lotes_tenant_escola_produto',
      'idx_estoque_lotes_tenant_validade_ativo',
      'idx_estoque_historico_tenant_escola_data',
      'idx_estoque_movimentacoes_tenant_lote_data'
    ];

    for (const indexName of expectedIndexes) {
      const indexExists = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes WHERE indexname = $1
        ) as exists
      `, [indexName]);

      if (!indexExists.rows[0].exists) {
        await this.addIssue(
          'PERFORMANCE',
          'WARNING',
          `Missing tenant-aware index: ${indexName}`,
          { indexName },
          `CREATE INDEX ${indexName} ON ... -- Check migration scripts for exact definition`
        );
      }
    }

    // Check for tables without proper indexing on tenant_id
    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes'];

    for (const table of tables) {
      const tenantIndexExists = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = $1 
            AND indexdef LIKE '%tenant_id%'
        ) as has_tenant_index
      `, [table]);

      if (!tenantIndexExists.rows[0].has_tenant_index) {
        await this.addIssue(
          'PERFORMANCE',
          'WARNING',
          `Table ${table} lacks tenant_id indexing`,
          { table },
          `CREATE INDEX idx_${table}_tenant_id ON ${table}(tenant_id)`
        );
      }
    }
  }

  async fixIssues() {
    if (!config.fixIssues) {
      await this.logger.logInfo('FIX_ISSUES', 'Issue fixing disabled (use --fix-issues to enable)');
      return;
    }

    await this.logger.logInfo('FIX_ISSUES', `Attempting to fix ${this.issues.length} identified issues...`);

    const fixableIssues = this.issues.filter(issue => 
      issue.fixQuery && 
      (issue.category === 'REFERENTIAL_INTEGRITY' || 
       issue.category === 'TENANT_CONSISTENCY' ||
       issue.category === 'DATA_COMPLETENESS')
    );

    for (const issue of fixableIssues) {
      try {
        await this.logger.logInfo('FIX_ISSUE', `Fixing: ${issue.description}`);
        
        const result = await this.executeQuery(issue.fixQuery);
        const affectedRows = result.rowCount || 0;
        
        this.fixedIssues.push({
          ...issue,
          fixedAt: new Date().toISOString(),
          affectedRows
        });

        await this.logger.logSuccess(
          'FIX_ISSUE',
          `Fixed: ${issue.description}`,
          { affectedRows, fixQuery: issue.fixQuery }
        );

      } catch (error) {
        await this.logger.logError('FIX_ISSUE', error, { 
          issue: issue.description,
          fixQuery: issue.fixQuery 
        });
      }
    }

    await this.logger.logSuccess(
      'FIX_ISSUES',
      `Fixed ${this.fixedIssues.length}/${fixableIssues.length} issues`
    );
  }

  async generateIntegrityReport() {
    const criticalIssues = this.issues.filter(issue => issue.severity === 'CRITICAL');
    const warningIssues = this.issues.filter(issue => issue.severity === 'WARNING');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        criticalIssues: criticalIssues.length,
        warningIssues: warningIssues.length,
        fixedIssues: this.fixedIssues.length,
        status: criticalIssues.length === 0 ? 
          (warningIssues.length === 0 ? 'PASS' : 'PASS_WITH_WARNINGS') : 'FAIL'
      },
      issues: this.issues,
      fixedIssues: this.fixedIssues,
      recommendations: this.generateRecommendations()
    };

    // Console summary
    console.log('\n========================================');
    console.log('DATA INTEGRITY VERIFICATION REPORT');
    console.log('========================================\n');
    
    console.log(`Status: ${report.summary.status}`);
    console.log(`Total Issues: ${report.summary.totalIssues}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`Warning Issues: ${report.summary.warningIssues}`);
    console.log(`Fixed Issues: ${report.summary.fixedIssues}`);

    if (criticalIssues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        console.log(`  - ${issue.category}: ${issue.description}`);
      });
    }

    if (warningIssues.length > 0) {
      console.log('\n⚠️ WARNING ISSUES:');
      warningIssues.forEach(issue => {
        console.log(`  - ${issue.category}: ${issue.description}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }

    console.log('\n========================================\n');

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    const criticalIssues = this.issues.filter(issue => issue.severity === 'CRITICAL');
    if (criticalIssues.length > 0) {
      recommendations.push('Address all critical issues before proceeding to production');
    }

    const referentialIssues = this.issues.filter(issue => issue.category === 'REFERENTIAL_INTEGRITY');
    if (referentialIssues.length > 0) {
      recommendations.push('Run data cleanup to fix referential integrity issues');
    }

    const consistencyIssues = this.issues.filter(issue => issue.category === 'TENANT_CONSISTENCY');
    if (consistencyIssues.length > 0) {
      recommendations.push('Re-run tenant assignment migration to fix consistency issues');
    }

    const performanceIssues = this.issues.filter(issue => issue.category === 'PERFORMANCE');
    if (performanceIssues.length > 0) {
      recommendations.push('Create missing indexes to improve query performance');
    }

    const businessLogicIssues = this.issues.filter(issue => issue.category === 'BUSINESS_LOGIC');
    if (businessLogicIssues.length > 0) {
      recommendations.push('Review and fix business logic violations');
    }

    if (this.issues.length === 0) {
      recommendations.push('Data integrity verification passed - system is ready for production');
    }

    return recommendations;
  }

  async runFullVerification() {
    await this.logger.logInfo('START_VERIFICATION', 'Starting comprehensive data integrity verification...');

    try {
      await this.verifyTenantDataCompleteness();
      await this.verifyReferentialIntegrity();
      await this.verifyTenantConsistency();
      await this.verifyBusinessLogicIntegrity();
      await this.verifyDataDistribution();
      await this.verifyIndexPerformance();

      await this.fixIssues();

      const report = await this.generateIntegrityReport();
      await this.logger.generateReport();

      return report.summary.status === 'PASS' || report.summary.status === 'PASS_WITH_WARNINGS';

    } catch (error) {
      await this.logger.logError('VERIFICATION_FAILED', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Main function
async function main() {
  const verifier = new DataIntegrityVerifier();

  try {
    await verifier.logger.logInfo('START', 'Starting data integrity verifier');
    await verifier.logger.logInfo('CONFIG', `Configuration: ${JSON.stringify(config, null, 2)}`);

    const success = await verifier.runFullVerification();
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    await verifier.logger.logError('VERIFIER_FAILED', error);
    process.exit(1);

  } finally {
    await verifier.close();
  }
}

// Signal handling
process.on('SIGINT', async () => {
  console.log('\n⚠️ Interruption detected. Finishing...');
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = DataIntegrityVerifier;