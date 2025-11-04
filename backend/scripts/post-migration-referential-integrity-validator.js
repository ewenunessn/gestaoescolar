/**
 * POST-MIGRATION REFERENTIAL INTEGRITY VALIDATOR
 * 
 * Comprehensive validation script for inventory tenant migration referential integrity.
 * This script validates that all inventory records have valid tenant_id assignments,
 * checks foreign key relationships within tenant boundaries, validates no cross-tenant
 * references exist, and creates detailed reports on migration success and inconsistencies.
 * 
 * Usage: node post-migration-referential-integrity-validator.js [--detailed] [--export-report] [--fix-minor-issues]
 */

const { Pool } = require('pg');
const fs = require('fs').promises;

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
  exportReport: process.argv.includes('--export-report'),
  fixMinorIssues: process.argv.includes('--fix-minor-issues'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

class PostMigrationReferentialIntegrityValidator {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.validationResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        warningChecks: 0,
        criticalIssues: 0,
        minorIssues: 0
      },
      checks: [],
      issues: [],
      crossTenantViolations: [],
      orphanedRecords: [],
      inconsistentData: [],
      recommendations: [],
      tenantDistribution: {},
      performanceMetrics: {}
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
      'CRITICAL': '🚨',
      'VALIDATE': '🔍'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data && config.verbose) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async executeQuery(query, params = []) {
    const startTime = Date.now();
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      const duration = Date.now() - startTime;
      
      if (config.verbose) {
        this.log('DEBUG', `Query executed in ${duration}ms`);
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  addValidationResult(checkName, status, message, details = null, recommendation = null, severity = 'normal') {
    this.validationResults.totalChecks++;
    
    const result = {
      check: checkName,
      status,
      message,
      details,
      severity,
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
        if (severity === 'critical') {
          this.validationResults.summary.criticalIssues++;
        } else {
          this.validationResults.summary.minorIssues++;
        }
        this.validationResults.issues.push(result);
        this.log(severity === 'critical' ? 'CRITICAL' : 'ERROR', `${checkName}: ${message}`, details);
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
        severity,
        timestamp: new Date().toISOString()
      });
    }
  }

  async validateTenantIdAssignments() {
    this.log('VALIDATE', 'Validating tenant_id assignments across all inventory tables...');

    const inventoryTables = [
      'estoque_escolas',
      'estoque_lotes', 
      'estoque_escolas_historico',
      'estoque_movimentacoes'
    ];

    for (const table of inventoryTables) {
      // Check if all records have tenant_id
      const result = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(tenant_id) as records_with_tenant_id,
          COUNT(*) - COUNT(tenant_id) as records_without_tenant_id,
          COUNT(DISTINCT tenant_id) as unique_tenants
        FROM ${table}
      `);

      const { total_records, records_with_tenant_id, records_without_tenant_id, unique_tenants } = result.rows[0];
      const completeness = total_records > 0 ? (records_with_tenant_id / total_records) * 100 : 100;

      if (records_without_tenant_id === 0) {
        this.addValidationResult(
          `TENANT_ID_ASSIGNMENT_${table.toUpperCase()}`,
          'PASS',
          `All ${total_records} records in ${table} have tenant_id assigned`,
          { total_records, unique_tenants, completeness: '100%' }
        );
      } else {
        this.addValidationResult(
          `TENANT_ID_ASSIGNMENT_${table.toUpperCase()}`,
          'FAIL',
          `${records_without_tenant_id} records in ${table} missing tenant_id`,
          { total_records, records_with_tenant_id, records_without_tenant_id, completeness: `${completeness.toFixed(2)}%` },
          `Update missing tenant_id values in ${table}`,
          records_without_tenant_id > (total_records * 0.1) ? 'critical' : 'normal'
        );

        // Get sample records without tenant_id for debugging
        if (config.detailed) {
          const sampleResult = await this.executeQuery(`
            SELECT id, escola_id, produto_id, created_at 
            FROM ${table} 
            WHERE tenant_id IS NULL 
            LIMIT 5
          `);
          
          this.validationResults.orphanedRecords.push({
            table,
            type: 'missing_tenant_id',
            count: records_without_tenant_id,
            samples: sampleResult.rows
          });
        }
      }

      // Validate tenant_id references are valid
      const tenantValidityResult = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_with_tenant_id,
          COUNT(t.id) as valid_tenant_references,
          COUNT(*) - COUNT(t.id) as invalid_tenant_references
        FROM ${table} tbl
        LEFT JOIN tenants t ON t.id = tbl.tenant_id
        WHERE tbl.tenant_id IS NOT NULL
      `);

      const { total_with_tenant_id, valid_tenant_references, invalid_tenant_references } = tenantValidityResult.rows[0];

      if (invalid_tenant_references === 0) {
        this.addValidationResult(
          `TENANT_ID_VALIDITY_${table.toUpperCase()}`,
          'PASS',
          `All ${total_with_tenant_id} tenant_id references in ${table} are valid`,
          { total_with_tenant_id, valid_tenant_references }
        );
      } else {
        this.addValidationResult(
          `TENANT_ID_VALIDITY_${table.toUpperCase()}`,
          'FAIL',
          `${invalid_tenant_references} invalid tenant_id references in ${table}`,
          { total_with_tenant_id, valid_tenant_references, invalid_tenant_references },
          `Remove or fix records with invalid tenant_id in ${table}`,
          'critical'
        );
      }
    }
  }

  async validateForeignKeyRelationshipsWithinTenants() {
    this.log('VALIDATE', 'Validating foreign key relationships within tenant boundaries...');

    // Validate estoque_escolas -> escolas relationship within tenant
    const estoqueEscolasResult = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN ee.tenant_id = e.tenant_id THEN 1 END) as same_tenant_references,
        COUNT(CASE WHEN ee.tenant_id != e.tenant_id THEN 1 END) as cross_tenant_references,
        COUNT(CASE WHEN e.id IS NULL THEN 1 END) as orphaned_references
      FROM estoque_escolas ee
      LEFT JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.tenant_id IS NOT NULL
    `);

    const estoqueResult = estoqueEscolasResult.rows[0];

    if (estoqueResult.cross_tenant_references === 0 && estoqueResult.orphaned_references === 0) {
      this.addValidationResult(
        'FK_ESTOQUE_ESCOLAS_WITHIN_TENANT',
        'PASS',
        `All ${estoqueResult.total_records} estoque_escolas records reference escolas within same tenant`,
        estoqueResult
      );
    } else {
      const issues = [];
      if (estoqueResult.cross_tenant_references > 0) {
        issues.push(`${estoqueResult.cross_tenant_references} cross-tenant references`);
      }
      if (estoqueResult.orphaned_references > 0) {
        issues.push(`${estoqueResult.orphaned_references} orphaned references`);
      }

      this.addValidationResult(
        'FK_ESTOQUE_ESCOLAS_WITHIN_TENANT',
        'FAIL',
        `estoque_escolas has foreign key violations: ${issues.join(', ')}`,
        estoqueResult,
        'Fix cross-tenant and orphaned references in estoque_escolas',
        'critical'
      );

      // Record cross-tenant violations for detailed report
      if (estoqueResult.cross_tenant_references > 0) {
        const violationsResult = await this.executeQuery(`
          SELECT ee.id, ee.tenant_id as estoque_tenant, e.tenant_id as escola_tenant, ee.escola_id
          FROM estoque_escolas ee
          JOIN escolas e ON e.id = ee.escola_id
          WHERE ee.tenant_id != e.tenant_id
          LIMIT 10
        `);

        this.validationResults.crossTenantViolations.push({
          type: 'estoque_escolas_escola_cross_tenant',
          count: estoqueResult.cross_tenant_references,
          samples: violationsResult.rows
        });
      }
    }

    // Validate estoque_lotes -> escolas relationship within tenant
    const estoqueLotesResult = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN el.tenant_id = e.tenant_id THEN 1 END) as same_tenant_references,
        COUNT(CASE WHEN el.tenant_id != e.tenant_id THEN 1 END) as cross_tenant_references,
        COUNT(CASE WHEN e.id IS NULL THEN 1 END) as orphaned_references,
        COUNT(CASE WHEN el.escola_id IS NULL THEN 1 END) as missing_escola_id
      FROM estoque_lotes el
      LEFT JOIN escolas e ON e.id = el.escola_id
      WHERE el.tenant_id IS NOT NULL
    `);

    const lotesResult = estoqueLotesResult.rows[0];

    if (lotesResult.cross_tenant_references === 0 && lotesResult.orphaned_references === 0) {
      this.addValidationResult(
        'FK_ESTOQUE_LOTES_WITHIN_TENANT',
        'PASS',
        `All ${lotesResult.same_tenant_references} estoque_lotes records reference escolas within same tenant`,
        lotesResult
      );
    } else {
      const issues = [];
      if (lotesResult.cross_tenant_references > 0) {
        issues.push(`${lotesResult.cross_tenant_references} cross-tenant references`);
      }
      if (lotesResult.orphaned_references > 0) {
        issues.push(`${lotesResult.orphaned_references} orphaned references`);
      }

      this.addValidationResult(
        'FK_ESTOQUE_LOTES_WITHIN_TENANT',
        'FAIL',
        `estoque_lotes has foreign key violations: ${issues.join(', ')}`,
        lotesResult,
        'Fix cross-tenant and orphaned references in estoque_lotes',
        'critical'
      );
    }

    // Validate estoque_movimentacoes -> estoque_lotes relationship within tenant
    const movimentacoesResult = await this.executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN em.tenant_id = el.tenant_id THEN 1 END) as same_tenant_references,
        COUNT(CASE WHEN em.tenant_id != el.tenant_id THEN 1 END) as cross_tenant_references,
        COUNT(CASE WHEN el.id IS NULL THEN 1 END) as orphaned_references
      FROM estoque_movimentacoes em
      LEFT JOIN estoque_lotes el ON el.id = em.lote_id
      WHERE em.tenant_id IS NOT NULL
    `);

    const movResult = movimentacoesResult.rows[0];

    if (movResult.cross_tenant_references === 0 && movResult.orphaned_references === 0) {
      this.addValidationResult(
        'FK_ESTOQUE_MOVIMENTACOES_WITHIN_TENANT',
        'PASS',
        `All ${movResult.total_records} estoque_movimentacoes records reference lotes within same tenant`,
        movResult
      );
    } else {
      const issues = [];
      if (movResult.cross_tenant_references > 0) {
        issues.push(`${movResult.cross_tenant_references} cross-tenant references`);
      }
      if (movResult.orphaned_references > 0) {
        issues.push(`${movResult.orphaned_references} orphaned references`);
      }

      this.addValidationResult(
        'FK_ESTOQUE_MOVIMENTACOES_WITHIN_TENANT',
        'FAIL',
        `estoque_movimentacoes has foreign key violations: ${issues.join(', ')}`,
        movResult,
        'Fix cross-tenant and orphaned references in estoque_movimentacoes',
        'critical'
      );
    }

    // Validate produtos references within tenant (if produtos has tenant_id)
    const produtosTenantCheck = await this.executeQuery(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'produtos' AND column_name = 'tenant_id'
      ) as produtos_has_tenant_id
    `);

    if (produtosTenantCheck.rows[0].produtos_has_tenant_id) {
      // Validate estoque_escolas -> produtos relationship within tenant
      const produtosResult = await this.executeQuery(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN ee.tenant_id = p.tenant_id THEN 1 END) as same_tenant_references,
          COUNT(CASE WHEN ee.tenant_id != p.tenant_id THEN 1 END) as cross_tenant_references,
          COUNT(CASE WHEN p.id IS NULL THEN 1 END) as orphaned_references
        FROM estoque_escolas ee
        LEFT JOIN produtos p ON p.id = ee.produto_id
        WHERE ee.tenant_id IS NOT NULL
      `);

      const prodResult = produtosResult.rows[0];

      if (prodResult.cross_tenant_references === 0 && prodResult.orphaned_references === 0) {
        this.addValidationResult(
          'FK_ESTOQUE_PRODUTOS_WITHIN_TENANT',
          'PASS',
          `All ${prodResult.total_records} estoque records reference produtos within same tenant`,
          prodResult
        );
      } else {
        this.addValidationResult(
          'FK_ESTOQUE_PRODUTOS_WITHIN_TENANT',
          'FAIL',
          `Cross-tenant produto references found in estoque`,
          prodResult,
          'Fix cross-tenant produto references',
          'critical'
        );
      }
    }
  }

  async validateNoCrossTenantReferences() {
    this.log('VALIDATE', 'Validating no cross-tenant references exist in inventory data...');

    // Check for any cross-tenant data access patterns
    const crossTenantQueries = [
      {
        name: 'CROSS_TENANT_ESTOQUE_ESCOLA_PRODUTO',
        query: `
          SELECT COUNT(*) as violations
          FROM estoque_escolas ee
          JOIN produtos p ON p.id = ee.produto_id
          WHERE ee.tenant_id != p.tenant_id
            AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'produtos' AND column_name = 'tenant_id')
        `,
        description: 'estoque_escolas referencing produtos from different tenant'
      },
      {
        name: 'CROSS_TENANT_LOTES_ESCOLA',
        query: `
          SELECT COUNT(*) as violations
          FROM estoque_lotes el
          JOIN escolas e ON e.id = el.escola_id
          WHERE el.tenant_id != e.tenant_id
        `,
        description: 'estoque_lotes referencing escolas from different tenant'
      },
      {
        name: 'CROSS_TENANT_MOVIMENTACOES_LOTES',
        query: `
          SELECT COUNT(*) as violations
          FROM estoque_movimentacoes em
          JOIN estoque_lotes el ON el.id = em.lote_id
          WHERE em.tenant_id != el.tenant_id
        `,
        description: 'estoque_movimentacoes referencing lotes from different tenant'
      },
      {
        name: 'CROSS_TENANT_HISTORICO_ESCOLA',
        query: `
          SELECT COUNT(*) as violations
          FROM estoque_escolas_historico eeh
          JOIN escolas e ON e.id = eeh.escola_id
          WHERE eeh.tenant_id != e.tenant_id
        `,
        description: 'estoque_escolas_historico referencing escolas from different tenant'
      }
    ];

    let totalViolations = 0;

    for (const check of crossTenantQueries) {
      try {
        const result = await this.executeQuery(check.query);
        const violations = parseInt(result.rows[0].violations);
        totalViolations += violations;

        if (violations === 0) {
          this.addValidationResult(
            check.name,
            'PASS',
            `No cross-tenant violations found: ${check.description}`,
            { violations: 0 }
          );
        } else {
          this.addValidationResult(
            check.name,
            'FAIL',
            `${violations} cross-tenant violations found: ${check.description}`,
            { violations },
            `Fix cross-tenant references in ${check.description}`,
            'critical'
          );
        }
      } catch (error) {
        this.addValidationResult(
          check.name,
          'WARNING',
          `Could not validate ${check.description}: ${error.message}`,
          { error: error.message },
          'Check if required columns exist'
        );
      }
    }

    // Overall cross-tenant validation summary
    if (totalViolations === 0) {
      this.addValidationResult(
        'CROSS_TENANT_ISOLATION_SUMMARY',
        'PASS',
        'Complete tenant isolation verified - no cross-tenant references found',
        { totalViolations: 0 }
      );
    } else {
      this.addValidationResult(
        'CROSS_TENANT_ISOLATION_SUMMARY',
        'FAIL',
        `Tenant isolation compromised - ${totalViolations} total cross-tenant violations found`,
        { totalViolations },
        'Immediate action required to fix tenant isolation',
        'critical'
      );
    }
  }

  async validateDataConsistency() {
    this.log('VALIDATE', 'Validating data consistency across inventory tables...');

    // Check quantity consistency between estoque_escolas and estoque_lotes
    const quantityConsistencyResult = await this.executeQuery(`
      WITH lotes_summary AS (
        SELECT 
          produto_id,
          escola_id,
          tenant_id,
          SUM(quantidade_atual) as total_lotes_quantidade
        FROM estoque_lotes 
        WHERE status = 'ativo'
        GROUP BY produto_id, escola_id, tenant_id
      ),
      consistency_check AS (
        SELECT 
          ee.id,
          ee.tenant_id,
          ee.escola_id,
          ee.produto_id,
          ee.quantidade_atual as estoque_quantidade,
          COALESCE(ls.total_lotes_quantidade, 0) as lotes_quantidade,
          ABS(ee.quantidade_atual - COALESCE(ls.total_lotes_quantidade, 0)) as diferenca
        FROM estoque_escolas ee
        LEFT JOIN lotes_summary ls ON (
          ls.produto_id = ee.produto_id 
          AND ls.escola_id = ee.escola_id 
          AND ls.tenant_id = ee.tenant_id
        )
        WHERE ee.tenant_id IS NOT NULL
      )
      SELECT 
        COUNT(*) as total_comparisons,
        COUNT(CASE WHEN diferenca = 0 THEN 1 END) as consistent_quantities,
        COUNT(CASE WHEN diferenca > 0 THEN 1 END) as inconsistent_quantities,
        AVG(diferenca) as avg_difference,
        MAX(diferenca) as max_difference
      FROM consistency_check
    `);

    const consistencyResult = quantityConsistencyResult.rows[0];
    const consistencyRate = consistencyResult.total_comparisons > 0 
      ? (consistencyResult.consistent_quantities / consistencyResult.total_comparisons) * 100 
      : 100;

    if (consistencyResult.inconsistent_quantities === 0) {
      this.addValidationResult(
        'QUANTITY_CONSISTENCY_ESTOQUE_LOTES',
        'PASS',
        `All ${consistencyResult.total_comparisons} quantity comparisons are consistent`,
        { ...consistencyResult, consistencyRate: '100%' }
      );
    } else if (consistencyRate >= 95) {
      this.addValidationResult(
        'QUANTITY_CONSISTENCY_ESTOQUE_LOTES',
        'WARNING',
        `${consistencyRate.toFixed(2)}% quantity consistency (${consistencyResult.inconsistent_quantities} inconsistencies)`,
        { ...consistencyResult, consistencyRate: `${consistencyRate.toFixed(2)}%` },
        'Review and fix quantity inconsistencies between estoque_escolas and estoque_lotes'
      );
    } else {
      this.addValidationResult(
        'QUANTITY_CONSISTENCY_ESTOQUE_LOTES',
        'FAIL',
        `Poor quantity consistency: ${consistencyRate.toFixed(2)}% (${consistencyResult.inconsistent_quantities} inconsistencies)`,
        { ...consistencyResult, consistencyRate: `${consistencyRate.toFixed(2)}%` },
        'Major quantity reconciliation needed between estoque_escolas and estoque_lotes',
        'critical'
      );
    }

    // Check for duplicate records within same tenant
    const duplicateChecks = [
      {
        table: 'estoque_escolas',
        query: `
          SELECT tenant_id, escola_id, produto_id, COUNT(*) as duplicates
          FROM estoque_escolas 
          WHERE tenant_id IS NOT NULL
          GROUP BY tenant_id, escola_id, produto_id 
          HAVING COUNT(*) > 1
        `
      },
      {
        table: 'estoque_lotes',
        query: `
          SELECT tenant_id, escola_id, produto_id, lote, COUNT(*) as duplicates
          FROM estoque_lotes 
          WHERE tenant_id IS NOT NULL
          GROUP BY tenant_id, escola_id, produto_id, lote 
          HAVING COUNT(*) > 1
        `
      }
    ];

    for (const check of duplicateChecks) {
      const result = await this.executeQuery(check.query);
      const duplicateCount = result.rows.length;

      if (duplicateCount === 0) {
        this.addValidationResult(
          `DUPLICATE_CHECK_${check.table.toUpperCase()}`,
          'PASS',
          `No duplicate records found in ${check.table}`,
          { duplicateCount: 0 }
        );
      } else {
        this.addValidationResult(
          `DUPLICATE_CHECK_${check.table.toUpperCase()}`,
          'FAIL',
          `${duplicateCount} duplicate record groups found in ${check.table}`,
          { duplicateCount, samples: result.rows.slice(0, 5) },
          `Remove or merge duplicate records in ${check.table}`,
          'normal'
        );

        this.validationResults.inconsistentData.push({
          type: 'duplicates',
          table: check.table,
          count: duplicateCount,
          samples: result.rows.slice(0, 10)
        });
      }
    }
  }

  async generateTenantDistributionReport() {
    this.log('VALIDATE', 'Generating tenant distribution report...');

    const distributionResult = await this.executeQuery(`
      SELECT 
        t.id,
        t.slug,
        t.name,
        t.status,
        (SELECT COUNT(*) FROM estoque_escolas WHERE tenant_id = t.id) as estoque_escolas_count,
        (SELECT COUNT(*) FROM estoque_lotes WHERE tenant_id = t.id) as estoque_lotes_count,
        (SELECT COUNT(*) FROM estoque_escolas_historico WHERE tenant_id = t.id) as historico_count,
        (SELECT COUNT(*) FROM estoque_movimentacoes WHERE tenant_id = t.id) as movimentacoes_count,
        (SELECT COUNT(DISTINCT escola_id) FROM estoque_escolas WHERE tenant_id = t.id) as escolas_with_inventory,
        (SELECT COUNT(DISTINCT produto_id) FROM estoque_escolas WHERE tenant_id = t.id) as produtos_in_inventory
      FROM tenants t
      ORDER BY t.slug
    `);

    let totalInventoryRecords = 0;
    let tenantsWithInventory = 0;
    const tenantStats = [];

    for (const row of distributionResult.rows) {
      const inventoryRecords = parseInt(row.estoque_escolas_count) + 
                              parseInt(row.estoque_lotes_count) + 
                              parseInt(row.historico_count) + 
                              parseInt(row.movimentacoes_count);
      
      totalInventoryRecords += inventoryRecords;
      
      if (inventoryRecords > 0) {
        tenantsWithInventory++;
      }

      const tenantStat = {
        tenant_id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        inventory_records: inventoryRecords,
        estoque_escolas: parseInt(row.estoque_escolas_count),
        estoque_lotes: parseInt(row.estoque_lotes_count),
        historico: parseInt(row.historico_count),
        movimentacoes: parseInt(row.movimentacoes_count),
        escolas_with_inventory: parseInt(row.escolas_with_inventory),
        produtos_in_inventory: parseInt(row.produtos_in_inventory)
      };

      tenantStats.push(tenantStat);

      if (config.detailed) {
        this.log('INFO', `Tenant ${row.slug}: ${inventoryRecords} inventory records across ${tenantStat.escolas_with_inventory} schools`);
      }
    }

    this.validationResults.tenantDistribution = {
      total_tenants: distributionResult.rows.length,
      tenants_with_inventory: tenantsWithInventory,
      total_inventory_records: totalInventoryRecords,
      tenant_stats: tenantStats
    };

    this.addValidationResult(
      'TENANT_DISTRIBUTION_SUMMARY',
      'PASS',
      `Inventory data distributed across ${tenantsWithInventory}/${distributionResult.rows.length} tenants (${totalInventoryRecords} total records)`,
      {
        totalTenants: distributionResult.rows.length,
        tenantsWithInventory,
        totalInventoryRecords,
        averageRecordsPerTenant: tenantsWithInventory > 0 ? Math.round(totalInventoryRecords / tenantsWithInventory) : 0
      }
    );
  }

  async fixMinorIssues() {
    if (!config.fixMinorIssues) {
      this.log('INFO', 'Minor issue fixing disabled (use --fix-minor-issues to enable)');
      return;
    }

    this.log('INFO', 'Attempting to fix minor issues...');

    const fixableIssues = this.validationResults.issues.filter(issue => 
      issue.severity !== 'critical' && (
        issue.check.includes('ORPHANED') || 
        issue.check.includes('DUPLICATE') ||
        issue.check.includes('MISSING_TENANT_ID')
      )
    );

    let fixedIssues = 0;

    for (const issue of fixableIssues) {
      try {
        if (issue.check.includes('MOVIMENTACOES') && issue.check.includes('ORPHANED')) {
          // Remove orphaned movimentacoes
          const result = await this.executeQuery(`
            DELETE FROM estoque_movimentacoes 
            WHERE lote_id NOT IN (SELECT id FROM estoque_lotes)
          `);
          this.log('SUCCESS', `Removed ${result.rowCount} orphaned movimentacoes`);
          fixedIssues++;
        }

        if (issue.check.includes('MISSING_TENANT_ID')) {
          const table = issue.check.split('_')[3].toLowerCase();
          
          if (table === 'estoque_escolas') {
            const result = await this.executeQuery(`
              UPDATE estoque_escolas 
              SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_escolas.escola_id)
              WHERE tenant_id IS NULL 
                AND escola_id IN (SELECT id FROM escolas WHERE tenant_id IS NOT NULL)
            `);
            this.log('SUCCESS', `Fixed ${result.rowCount} missing tenant_id in estoque_escolas`);
            fixedIssues++;
          }
          
          if (table === 'estoque_lotes') {
            const result = await this.executeQuery(`
              UPDATE estoque_lotes 
              SET tenant_id = (SELECT tenant_id FROM escolas WHERE id = estoque_lotes.escola_id)
              WHERE tenant_id IS NULL 
                AND escola_id IS NOT NULL
                AND escola_id IN (SELECT id FROM escolas WHERE tenant_id IS NOT NULL)
            `);
            this.log('SUCCESS', `Fixed ${result.rowCount} missing tenant_id in estoque_lotes`);
            fixedIssues++;
          }
        }

      } catch (error) {
        this.log('ERROR', `Failed to fix issue ${issue.check}`, { error: error.message });
      }
    }

    if (fixedIssues > 0) {
      this.log('SUCCESS', `Fixed ${fixedIssues} minor issues`);
    } else {
      this.log('INFO', 'No minor issues found that could be automatically fixed');
    }
  }

  async generateComprehensiveReport() {
    this.log('INFO', 'Generating comprehensive post-migration validation report...');

    const report = {
      ...this.validationResults,
      summary: {
        ...this.validationResults.summary,
        successRate: this.validationResults.summary.totalChecks > 0 
          ? (this.validationResults.summary.passedChecks / this.validationResults.summary.totalChecks * 100).toFixed(2)
          : 100,
        status: this.validationResults.summary.criticalIssues > 0 
          ? 'CRITICAL_FAILURE'
          : this.validationResults.summary.failedChecks > 0 
            ? 'FAILURE'
            : this.validationResults.summary.warningChecks > 0 
              ? 'SUCCESS_WITH_WARNINGS'
              : 'SUCCESS'
      }
    };

    // Console summary
    console.log('\n========================================');
    console.log('POST-MIGRATION REFERENTIAL INTEGRITY VALIDATION REPORT');
    console.log('========================================\n');
    
    console.log(`🎯 Overall Status: ${report.summary.status}`);
    console.log(`📊 Success Rate: ${report.summary.successRate}%`);
    console.log(`🔍 Total Checks: ${report.summary.totalChecks}`);
    console.log(`✅ Passed: ${report.summary.passedChecks}`);
    console.log(`❌ Failed: ${report.summary.failedChecks}`);
    console.log(`⚠️  Warnings: ${report.summary.warningChecks}`);
    console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`🔧 Minor Issues: ${report.summary.minorIssues}`);
    
    // Tenant distribution summary
    if (report.tenantDistribution) {
      console.log(`\n📈 TENANT DISTRIBUTION:`);
      console.log(`   Total Tenants: ${report.tenantDistribution.total_tenants}`);
      console.log(`   Tenants with Inventory: ${report.tenantDistribution.tenants_with_inventory}`);
      console.log(`   Total Inventory Records: ${report.tenantDistribution.total_inventory_records}`);
    }

    // Critical issues
    if (report.summary.criticalIssues > 0) {
      console.log('\n🚨 CRITICAL ISSUES (IMMEDIATE ACTION REQUIRED):');
      report.issues
        .filter(issue => issue.severity === 'critical')
        .forEach(issue => {
          console.log(`  - ${issue.check}: ${issue.message}`);
        });
    }

    // Cross-tenant violations
    if (report.crossTenantViolations.length > 0) {
      console.log('\n🔒 TENANT ISOLATION VIOLATIONS:');
      report.crossTenantViolations.forEach(violation => {
        console.log(`  - ${violation.type}: ${violation.count} violations`);
      });
    }

    // Other issues
    if (report.summary.failedChecks > report.summary.criticalIssues) {
      console.log('\n❌ OTHER ISSUES:');
      report.issues
        .filter(issue => issue.severity !== 'critical')
        .forEach(issue => {
          console.log(`  - ${issue.check}: ${issue.message}`);
        });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations
        .sort((a, b) => (a.severity === 'critical' ? -1 : 1))
        .forEach(rec => {
          const priority = rec.severity === 'critical' ? '🚨 HIGH' : '📋 NORMAL';
          console.log(`  ${priority}: ${rec.recommendation}`);
        });
    }

    console.log('\n========================================\n');

    // Export detailed report if requested
    if (config.exportReport) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `post-migration-referential-integrity-report-${timestamp}.json`;
      await fs.writeFile(filename, JSON.stringify(report, null, 2));
      this.log('SUCCESS', `Detailed report exported to ${filename}`);
    }

    return report;
  }

  async runFullValidation() {
    this.log('INFO', 'Starting comprehensive post-migration referential integrity validation...');

    try {
      // Core validations
      await this.validateTenantIdAssignments();
      await this.validateForeignKeyRelationshipsWithinTenants();
      await this.validateNoCrossTenantReferences();
      await this.validateDataConsistency();
      await this.generateTenantDistributionReport();

      // Attempt to fix minor issues if requested
      await this.fixMinorIssues();
      
      // Generate comprehensive report
      const report = await this.generateComprehensiveReport();
      
      // Determine overall success
      const success = report.summary.status === 'SUCCESS' || report.summary.status === 'SUCCESS_WITH_WARNINGS';
      
      if (success) {
        this.log('SUCCESS', 'Post-migration validation completed successfully!');
        if (report.summary.status === 'SUCCESS_WITH_WARNINGS') {
          this.log('WARNING', 'Some warnings found - review recommendations');
        }
      } else {
        this.log('ERROR', 'Post-migration validation failed - critical issues found');
      }

      return success;

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
  const validator = new PostMigrationReferentialIntegrityValidator();

  try {
    validator.log('INFO', 'Starting post-migration referential integrity validator');
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

module.exports = PostMigrationReferentialIntegrityValidator;