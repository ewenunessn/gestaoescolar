#!/usr/bin/env node

/**
 * Multi-Tenant Data Validation Script
 * 
 * This script performs comprehensive validation of multi-tenant data integrity,
 * checking for orphaned records, missing tenant assignments, and referential integrity.
 * 
 * Usage:
 *   node validate-multi-tenant-data.js [options]
 * 
 * Options:
 *   --table=name       Validate specific table only
 *   --fix-issues       Automatically fix found issues (use with caution)
 *   --report-only      Generate detailed report without console output
 *   --export-csv       Export results to CSV file
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
  fixIssues: args.includes('--fix-issues'),
  reportOnly: args.includes('--report-only'),
  exportCsv: args.includes('--export-csv'),
  help: args.includes('--help')
};

function showHelp() {
  console.log(`
Multi-Tenant Data Validation Script

Usage:
  node validate-multi-tenant-data.js [options]

Options:
  --table=name       Validate specific table only
  --fix-issues       Automatically fix found issues (use with caution)
  --report-only      Generate detailed report without console output
  --export-csv       Export results to CSV file
  --help             Show this help message

Examples:
  # Validate all tables
  node validate-multi-tenant-data.js

  # Validate specific table
  node validate-multi-tenant-data.js --table=escolas

  # Generate report and export to CSV
  node validate-multi-tenant-data.js --report-only --export-csv

  # Fix issues automatically (dangerous!)
  node validate-multi-tenant-data.js --fix-issues
`);
}

class ValidationReport {
  constructor() {
    this.results = [];
    this.summary = {
      totalTables: 0,
      tablesWithIssues: 0,
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      fixedIssues: 0
    };
  }

  addResult(tableName, validationType, status, message, recordCount = 0, severity = 'info') {
    const result = {
      tableName,
      validationType,
      status,
      message,
      recordCount,
      severity,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    if (status === 'FAIL') {
      this.summary.totalIssues++;
      if (severity === 'critical') {
        this.summary.criticalIssues++;
      } else if (severity === 'warning') {
        this.summary.warningIssues++;
      }
    }
  }

  addTableResult(tableName) {
    this.summary.totalTables++;
    const tableIssues = this.results.filter(r => r.tableName === tableName && r.status === 'FAIL');
    if (tableIssues.length > 0) {
      this.summary.tablesWithIssues++;
    }
  }

  exportToCsv(filename) {
    const csvHeader = 'Table,Validation Type,Status,Message,Record Count,Severity,Timestamp\n';
    const csvRows = this.results.map(r => 
      `"${r.tableName}","${r.validationType}","${r.status}","${r.message}",${r.recordCount},"${r.severity}","${r.timestamp}"`
    ).join('\n');
    
    fs.writeFileSync(filename, csvHeader + csvRows);
  }

  printSummary() {
    if (options.reportOnly) return;
    
    console.log('\n📊 Validation Summary:');
    console.log('='.repeat(50));
    console.log(`Total tables validated: ${this.summary.totalTables}`);
    console.log(`Tables with issues: ${this.summary.tablesWithIssues}`);
    console.log(`Total issues found: ${this.summary.totalIssues}`);
    console.log(`Critical issues: ${this.summary.criticalIssues}`);
    console.log(`Warning issues: ${this.summary.warningIssues}`);
    
    if (options.fixIssues && this.summary.fixedIssues > 0) {
      console.log(`Issues fixed: ${this.summary.fixedIssues}`);
    }
    
    const healthScore = this.summary.totalTables > 0 
      ? Math.round((this.summary.totalTables - this.summary.tablesWithIssues) / this.summary.totalTables * 100)
      : 100;
    
    console.log(`\n🏥 Data Health Score: ${healthScore}%`);
    
    if (healthScore === 100) {
      console.log('✅ All validations passed!');
    } else if (healthScore >= 90) {
      console.log('⚠️  Minor issues found - review recommended');
    } else if (healthScore >= 70) {
      console.log('🔶 Moderate issues found - attention required');
    } else {
      console.log('🔴 Serious issues found - immediate action required');
    }
  }
}

async function getTenantTables(client) {
  const result = await client.query(`
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'tenant_id' 
    AND table_schema = 'public'
    AND table_name NOT LIKE '%_backup_%'
    ORDER BY table_name
  `);
  
  return result.rows.map(row => row.table_name);
}

async function validateTenantReferences(client, tableName, report) {
  try {
    // Check for NULL tenant_id values
    const nullTenantResult = await client.query(`
      SELECT COUNT(*) as count FROM ${tableName} WHERE tenant_id IS NULL
    `);
    
    const nullCount = parseInt(nullTenantResult.rows[0].count);
    if (nullCount > 0) {
      report.addResult(
        tableName, 
        'NULL_TENANT_ID', 
        'FAIL', 
        `Found ${nullCount} records with NULL tenant_id`,
        nullCount,
        'critical'
      );
      
      if (options.fixIssues) {
        await client.query(`
          UPDATE ${tableName} 
          SET tenant_id = '00000000-0000-0000-0000-000000000000' 
          WHERE tenant_id IS NULL
        `);
        report.summary.fixedIssues += nullCount;
        report.addResult(tableName, 'FIX_NULL_TENANT_ID', 'FIXED', `Fixed ${nullCount} NULL tenant_id records`);
      }
    } else {
      report.addResult(tableName, 'NULL_TENANT_ID', 'PASS', 'No NULL tenant_id values found');
    }
    
    // Check for orphaned tenant references
    const orphanedResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM ${tableName} 
      WHERE tenant_id NOT IN (SELECT id FROM tenants)
    `);
    
    const orphanedCount = parseInt(orphanedResult.rows[0].count);
    if (orphanedCount > 0) {
      report.addResult(
        tableName, 
        'ORPHANED_TENANT_REF', 
        'FAIL', 
        `Found ${orphanedCount} records with invalid tenant_id references`,
        orphanedCount,
        'critical'
      );
    } else {
      report.addResult(tableName, 'ORPHANED_TENANT_REF', 'PASS', 'No orphaned tenant references found');
    }
    
    // Check tenant distribution
    const distributionResult = await client.query(`
      SELECT tenant_id, COUNT(*) as count
      FROM ${tableName}
      GROUP BY tenant_id
      ORDER BY count DESC
    `);
    
    if (distributionResult.rows.length > 0) {
      const totalRecords = distributionResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
      const tenantCount = distributionResult.rows.length;
      
      report.addResult(
        tableName, 
        'TENANT_DISTRIBUTION', 
        'INFO', 
        `Records distributed across ${tenantCount} tenant(s), total: ${totalRecords}`,
        totalRecords
      );
      
      // Check for uneven distribution (warning if one tenant has >95% of records)
      const maxTenantRecords = parseInt(distributionResult.rows[0].count);
      if (tenantCount > 1 && (maxTenantRecords / totalRecords) > 0.95) {
        report.addResult(
          tableName, 
          'UNEVEN_DISTRIBUTION', 
          'FAIL', 
          `One tenant has ${Math.round(maxTenantRecords / totalRecords * 100)}% of all records`,
          maxTenantRecords,
          'warning'
        );
      }
    }
    
  } catch (error) {
    report.addResult(
      tableName, 
      'VALIDATION_ERROR', 
      'FAIL', 
      `Validation error: ${error.message}`,
      0,
      'critical'
    );
  }
}

async function validateForeignKeyIntegrity(client, tableName, report) {
  try {
    // Get foreign key constraints for this table
    const fkResult = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1
        AND tc.table_schema = 'public'
    `, [tableName]);
    
    for (const fk of fkResult.rows) {
      // Skip tenant_id foreign keys (already validated)
      if (fk.column_name === 'tenant_id') continue;
      
      // Check for orphaned foreign key references
      const orphanedFkResult = await client.query(`
        SELECT COUNT(*) as count
        FROM ${tableName} t1
        WHERE t1.${fk.column_name} IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM ${fk.foreign_table_name} t2 
          WHERE t2.${fk.foreign_column_name} = t1.${fk.column_name}
        )
      `);
      
      const orphanedFkCount = parseInt(orphanedFkResult.rows[0].count);
      if (orphanedFkCount > 0) {
        report.addResult(
          tableName,
          'ORPHANED_FK_REF',
          'FAIL',
          `Found ${orphanedFkCount} orphaned references in ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`,
          orphanedFkCount,
          'warning'
        );
      }
      
      // Check for cross-tenant references (if both tables have tenant_id)
      const foreignTableHasTenantId = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [fk.foreign_table_name]);
      
      if (parseInt(foreignTableHasTenantId.rows[0].count) > 0) {
        const crossTenantResult = await client.query(`
          SELECT COUNT(*) as count
          FROM ${tableName} t1
          JOIN ${fk.foreign_table_name} t2 ON t1.${fk.column_name} = t2.${fk.foreign_column_name}
          WHERE t1.tenant_id != t2.tenant_id
        `);
        
        const crossTenantCount = parseInt(crossTenantResult.rows[0].count);
        if (crossTenantCount > 0) {
          report.addResult(
            tableName,
            'CROSS_TENANT_REF',
            'FAIL',
            `Found ${crossTenantCount} cross-tenant references in ${fk.column_name} -> ${fk.foreign_table_name}`,
            crossTenantCount,
            'critical'
          );
        }
      }
    }
    
    if (fkResult.rows.length === 0) {
      report.addResult(tableName, 'FK_INTEGRITY', 'INFO', 'No foreign key constraints to validate');
    } else {
      report.addResult(tableName, 'FK_INTEGRITY', 'PASS', `Validated ${fkResult.rows.length} foreign key constraint(s)`);
    }
    
  } catch (error) {
    report.addResult(
      tableName,
      'FK_VALIDATION_ERROR',
      'FAIL',
      `Foreign key validation error: ${error.message}`,
      0,
      'warning'
    );
  }
}

async function validateTableStructure(client, tableName, report) {
  try {
    // Check if tenant_id column has proper constraints
    const columnInfo = await client.query(`
      SELECT 
        column_name,
        is_nullable,
        data_type,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = 'tenant_id'
    `, [tableName]);
    
    if (columnInfo.rows.length === 0) {
      report.addResult(
        tableName,
        'MISSING_TENANT_COLUMN',
        'FAIL',
        'Table does not have tenant_id column',
        0,
        'critical'
      );
      return;
    }
    
    const column = columnInfo.rows[0];
    
    // Check data type
    if (column.data_type !== 'uuid') {
      report.addResult(
        tableName,
        'WRONG_TENANT_TYPE',
        'FAIL',
        `tenant_id column has wrong data type: ${column.data_type} (should be uuid)`,
        0,
        'warning'
      );
    }
    
    // Check if column is nullable (should be NOT NULL for core tables)
    const coreTablesList = ['escolas', 'produtos', 'usuarios', 'fornecedores', 'contratos', 'modalidades'];
    if (coreTablesList.includes(tableName) && column.is_nullable === 'YES') {
      report.addResult(
        tableName,
        'NULLABLE_TENANT_ID',
        'FAIL',
        'Core table has nullable tenant_id column',
        0,
        'warning'
      );
    }
    
    // Check for proper indexes
    const indexInfo = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1 AND indexdef LIKE '%tenant_id%'
    `, [tableName]);
    
    if (indexInfo.rows.length === 0) {
      report.addResult(
        tableName,
        'MISSING_TENANT_INDEX',
        'FAIL',
        'No indexes found on tenant_id column',
        0,
        'warning'
      );
    } else {
      report.addResult(
        tableName,
        'TENANT_INDEX',
        'PASS',
        `Found ${indexInfo.rows.length} index(es) on tenant_id`
      );
    }
    
  } catch (error) {
    report.addResult(
      tableName,
      'STRUCTURE_VALIDATION_ERROR',
      'FAIL',
      `Structure validation error: ${error.message}`,
      0,
      'warning'
    );
  }
}

async function validateTable(client, tableName, report) {
  if (!options.reportOnly) {
    console.log(`🔍 Validating table: ${tableName}`);
  }
  
  await validateTenantReferences(client, tableName, report);
  await validateForeignKeyIntegrity(client, tableName, report);
  await validateTableStructure(client, tableName, report);
  
  report.addTableResult(tableName);
}

async function validateSystemTenant(client, report) {
  try {
    // Check if system tenant exists
    const systemTenantResult = await client.query(`
      SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000'
    `);
    
    if (systemTenantResult.rows.length === 0) {
      report.addResult(
        'tenants',
        'MISSING_SYSTEM_TENANT',
        'FAIL',
        'System tenant (00000000-0000-0000-0000-000000000000) not found',
        0,
        'critical'
      );
    } else {
      const systemTenant = systemTenantResult.rows[0];
      report.addResult(
        'tenants',
        'SYSTEM_TENANT',
        'PASS',
        `System tenant found: ${systemTenant.name}`
      );
      
      // Check system tenant status
      if (systemTenant.status !== 'active') {
        report.addResult(
          'tenants',
          'SYSTEM_TENANT_INACTIVE',
          'FAIL',
          `System tenant status is '${systemTenant.status}' (should be 'active')`,
          0,
          'warning'
        );
      }
    }
    
    // Check total tenant count
    const tenantCountResult = await client.query('SELECT COUNT(*) as count FROM tenants');
    const tenantCount = parseInt(tenantCountResult.rows[0].count);
    
    report.addResult(
      'tenants',
      'TENANT_COUNT',
      'INFO',
      `Total tenants in system: ${tenantCount}`,
      tenantCount
    );
    
  } catch (error) {
    report.addResult(
      'tenants',
      'SYSTEM_VALIDATION_ERROR',
      'FAIL',
      `System validation error: ${error.message}`,
      0,
      'critical'
    );
  }
}

async function main() {
  if (options.help) {
    showHelp();
    return;
  }
  
  if (!options.reportOnly) {
    console.log('🔍 Multi-Tenant Data Validation');
    console.log('================================');
  }
  
  const client = await pool.connect();
  const report = new ValidationReport();
  
  try {
    // Validate system tenant first
    await validateSystemTenant(client, report);
    
    // Get tables to validate
    let tablesToValidate;
    if (options.table) {
      tablesToValidate = [options.table];
    } else {
      tablesToValidate = await getTenantTables(client);
    }
    
    if (!options.reportOnly) {
      console.log(`\n📋 Found ${tablesToValidate.length} table(s) to validate`);
    }
    
    // Validate each table
    for (const tableName of tablesToValidate) {
      await validateTable(client, tableName, report);
    }
    
    // Print summary
    report.printSummary();
    
    // Export to CSV if requested
    if (options.exportCsv) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `multi-tenant-validation-${timestamp}.csv`;
      report.exportToCsv(filename);
      
      if (!options.reportOnly) {
        console.log(`\n📄 Results exported to: ${filename}`);
      }
    }
    
    // Generate detailed report
    if (options.reportOnly) {
      console.log(JSON.stringify({
        summary: report.summary,
        results: report.results
      }, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the validation
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});