/**
 * TEST POST-MIGRATION REFERENTIAL INTEGRITY
 * 
 * Test script to validate the post-migration referential integrity validator.
 * This script tests the validator against various scenarios and edge cases
 * to ensure it properly identifies and reports integrity issues.
 */

const { Pool } = require('pg');
const PostMigrationReferentialIntegrityValidator = require('./scripts/post-migration-referential-integrity-validator');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gestao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

class PostMigrationIntegrityTester {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.testResults = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'TEST': '🧪',
      'SETUP': '🔧',
      'CLEANUP': '🧹'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data) {
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

  addTestResult(testName, passed, message, details = null) {
    this.testResults.totalTests++;
    
    const result = {
      test: testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    this.testResults.tests.push(result);

    if (passed) {
      this.testResults.passedTests++;
      this.log('SUCCESS', `${testName}: ${message}`);
    } else {
      this.testResults.failedTests++;
      this.log('ERROR', `${testName}: ${message}`, details);
    }
  }

  async setupTestData() {
    this.log('SETUP', 'Setting up test data...');

    try {
      // Create test tenants if they don't exist
      await this.executeQuery(`
        INSERT INTO tenants (id, slug, name, status, created_at, updated_at)
        VALUES 
          ('test-tenant-1', 'test-tenant-1', 'Test Tenant 1', 'active', NOW(), NOW()),
          ('test-tenant-2', 'test-tenant-2', 'Test Tenant 2', 'active', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `);

      // Create test schools
      await this.executeQuery(`
        INSERT INTO escolas (id, nome, tenant_id, ativo, created_at, updated_at)
        VALUES 
          (9991, 'Test School 1', 'test-tenant-1', true, NOW(), NOW()),
          (9992, 'Test School 2', 'test-tenant-2', true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = EXCLUDED.tenant_id,
          nome = EXCLUDED.nome
      `);

      // Create test products (if produtos has tenant_id)
      const produtosTenantCheck = await this.executeQuery(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'produtos' AND column_name = 'tenant_id'
        ) as has_tenant_id
      `);

      if (produtosTenantCheck.rows[0].has_tenant_id) {
        await this.executeQuery(`
          INSERT INTO produtos (id, nome, tenant_id, ativo, created_at, updated_at)
          VALUES 
            (9991, 'Test Product 1', 'test-tenant-1', true, NOW(), NOW()),
            (9992, 'Test Product 2', 'test-tenant-2', true, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET 
            tenant_id = EXCLUDED.tenant_id,
            nome = EXCLUDED.nome
        `);
      } else {
        await this.executeQuery(`
          INSERT INTO produtos (id, nome, ativo, created_at, updated_at)
          VALUES 
            (9991, 'Test Product 1', true, NOW(), NOW()),
            (9992, 'Test Product 2', true, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET 
            nome = EXCLUDED.nome
        `);
      }

      this.log('SUCCESS', 'Test data setup completed');

    } catch (error) {
      this.log('ERROR', 'Failed to setup test data', { error: error.message });
      throw error;
    }
  }

  async createTestScenarios() {
    this.log('SETUP', 'Creating test scenarios...');

    try {
      // Scenario 1: Valid data with proper tenant isolation
      await this.executeQuery(`
        INSERT INTO estoque_escolas (id, escola_id, produto_id, quantidade_atual, tenant_id, created_at, updated_at)
        VALUES (99991, 9991, 9991, 100, 'test-tenant-1', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = EXCLUDED.tenant_id,
          escola_id = EXCLUDED.escola_id,
          produto_id = EXCLUDED.produto_id
      `);

      await this.executeQuery(`
        INSERT INTO estoque_lotes (id, produto_id, escola_id, lote, quantidade_atual, tenant_id, status, created_at, updated_at)
        VALUES (99991, 9991, 9991, 'TEST-LOTE-1', 100, 'test-tenant-1', 'ativo', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = EXCLUDED.tenant_id,
          escola_id = EXCLUDED.escola_id,
          produto_id = EXCLUDED.produto_id
      `);

      // Scenario 2: Missing tenant_id (should be detected)
      await this.executeQuery(`
        INSERT INTO estoque_escolas (id, escola_id, produto_id, quantidade_atual, tenant_id, created_at, updated_at)
        VALUES (99992, 9991, 9991, 50, NULL, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET tenant_id = NULL
      `);

      // Scenario 3: Cross-tenant reference (should be detected as violation)
      await this.executeQuery(`
        INSERT INTO estoque_escolas (id, escola_id, produto_id, quantidade_atual, tenant_id, created_at, updated_at)
        VALUES (99993, 9991, 9991, 75, 'test-tenant-2', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = 'test-tenant-2',
          escola_id = EXCLUDED.escola_id
      `);

      // Scenario 4: Orphaned movimentacao (should be detected)
      await this.executeQuery(`
        INSERT INTO estoque_movimentacoes (id, lote_id, produto_id, tipo_movimentacao, quantidade_movimentada, tenant_id, created_at)
        VALUES (99991, 99999, 9991, 'entrada', 10, 'test-tenant-1', NOW())
        ON CONFLICT (id) DO UPDATE SET 
          lote_id = 99999,
          tenant_id = EXCLUDED.tenant_id
      `);

      // Scenario 5: Quantity inconsistency
      await this.executeQuery(`
        INSERT INTO estoque_escolas (id, escola_id, produto_id, quantidade_atual, tenant_id, created_at, updated_at)
        VALUES (99994, 9992, 9992, 200, 'test-tenant-2', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = EXCLUDED.tenant_id,
          escola_id = EXCLUDED.escola_id,
          produto_id = EXCLUDED.produto_id,
          quantidade_atual = 200
      `);

      await this.executeQuery(`
        INSERT INTO estoque_lotes (id, produto_id, escola_id, lote, quantidade_atual, tenant_id, status, created_at, updated_at)
        VALUES (99992, 9992, 9992, 'TEST-LOTE-2', 150, 'test-tenant-2', 'ativo', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET 
          tenant_id = EXCLUDED.tenant_id,
          escola_id = EXCLUDED.escola_id,
          produto_id = EXCLUDED.produto_id,
          quantidade_atual = 150
      `);

      this.log('SUCCESS', 'Test scenarios created');

    } catch (error) {
      this.log('ERROR', 'Failed to create test scenarios', { error: error.message });
      throw error;
    }
  }

  async testValidatorDetectsMissingTenantId() {
    this.log('TEST', 'Testing validator detects missing tenant_id...');

    const validator = new PostMigrationReferentialIntegrityValidator();
    
    try {
      await validator.validateTenantIdAssignments();
      
      const missingTenantIdIssues = validator.validationResults.issues.filter(issue => 
        issue.check.includes('TENANT_ID_ASSIGNMENT') && issue.status === 'FAIL'
      );

      const detected = missingTenantIdIssues.length > 0;
      
      this.addTestResult(
        'DETECT_MISSING_TENANT_ID',
        detected,
        detected ? 'Successfully detected missing tenant_id records' : 'Failed to detect missing tenant_id records',
        { issuesFound: missingTenantIdIssues.length }
      );

    } catch (error) {
      this.addTestResult(
        'DETECT_MISSING_TENANT_ID',
        false,
        'Test failed with error',
        { error: error.message }
      );
    } finally {
      await validator.close();
    }
  }

  async testValidatorDetectsCrossTenantViolations() {
    this.log('TEST', 'Testing validator detects cross-tenant violations...');

    const validator = new PostMigrationReferentialIntegrityValidator();
    
    try {
      await validator.validateForeignKeyRelationshipsWithinTenants();
      
      const crossTenantIssues = validator.validationResults.issues.filter(issue => 
        issue.check.includes('FK_') && issue.status === 'FAIL'
      );

      const detected = crossTenantIssues.length > 0;
      
      this.addTestResult(
        'DETECT_CROSS_TENANT_VIOLATIONS',
        detected,
        detected ? 'Successfully detected cross-tenant violations' : 'Failed to detect cross-tenant violations',
        { issuesFound: crossTenantIssues.length }
      );

    } catch (error) {
      this.addTestResult(
        'DETECT_CROSS_TENANT_VIOLATIONS',
        false,
        'Test failed with error',
        { error: error.message }
      );
    } finally {
      await validator.close();
    }
  }

  async testValidatorDetectsOrphanedRecords() {
    this.log('TEST', 'Testing validator detects orphaned records...');

    const validator = new PostMigrationReferentialIntegrityValidator();
    
    try {
      await validator.validateForeignKeyRelationshipsWithinTenants();
      
      const orphanedIssues = validator.validationResults.issues.filter(issue => 
        issue.message.includes('orphaned') || issue.message.includes('inexistente')
      );

      const detected = orphanedIssues.length > 0;
      
      this.addTestResult(
        'DETECT_ORPHANED_RECORDS',
        detected,
        detected ? 'Successfully detected orphaned records' : 'Failed to detect orphaned records',
        { issuesFound: orphanedIssues.length }
      );

    } catch (error) {
      this.addTestResult(
        'DETECT_ORPHANED_RECORDS',
        false,
        'Test failed with error',
        { error: error.message }
      );
    } finally {
      await validator.close();
    }
  }

  async testValidatorDetectsQuantityInconsistencies() {
    this.log('TEST', 'Testing validator detects quantity inconsistencies...');

    const validator = new PostMigrationReferentialIntegrityValidator();
    
    try {
      await validator.validateDataConsistency();
      
      const quantityIssues = validator.validationResults.checks.filter(check => 
        check.check.includes('QUANTITY_CONSISTENCY')
      );

      const hasInconsistencies = quantityIssues.some(check => 
        check.status === 'WARNING' || check.status === 'FAIL'
      );
      
      this.addTestResult(
        'DETECT_QUANTITY_INCONSISTENCIES',
        hasInconsistencies,
        hasInconsistencies ? 'Successfully detected quantity inconsistencies' : 'No quantity inconsistencies detected (expected for test data)',
        { checksPerformed: quantityIssues.length }
      );

    } catch (error) {
      this.addTestResult(
        'DETECT_QUANTITY_INCONSISTENCIES',
        false,
        'Test failed with error',
        { error: error.message }
      );
    } finally {
      await validator.close();
    }
  }

  async testValidatorGeneratesTenantDistribution() {
    this.log('TEST', 'Testing validator generates tenant distribution report...');

    const validator = new PostMigrationReferentialIntegrityValidator();
    
    try {
      await validator.generateTenantDistributionReport();
      
      const hasDistribution = validator.validationResults.tenantDistribution && 
                             validator.validationResults.tenantDistribution.tenant_stats &&
                             validator.validationResults.tenantDistribution.tenant_stats.length > 0;
      
      this.addTestResult(
        'GENERATE_TENANT_DISTRIBUTION',
        hasDistribution,
        hasDistribution ? 'Successfully generated tenant distribution report' : 'Failed to generate tenant distribution report',
        { 
          tenantsFound: hasDistribution ? validator.validationResults.tenantDistribution.tenant_stats.length : 0,
          totalRecords: hasDistribution ? validator.validationResults.tenantDistribution.total_inventory_records : 0
        }
      );

    } catch (error) {
      this.addTestResult(
        'GENERATE_TENANT_DISTRIBUTION',
        false,
        'Test failed with error',
        { error: error.message }
      );
    } finally {
      await validator.close();
    }
  }

  async testFullValidationWorkflow() {
    this.log('TEST', 'Testing full validation workflow...');

    const validator = new PostMigrationReferentialIntegrityValidator();
    
    try {
      const success = await validator.runFullValidation();
      
      const hasResults = validator.validationResults.summary.totalChecks > 0;
      const hasIssues = validator.validationResults.summary.failedChecks > 0;
      
      this.addTestResult(
        'FULL_VALIDATION_WORKFLOW',
        hasResults,
        hasResults ? `Full validation completed with ${validator.validationResults.summary.totalChecks} checks` : 'Full validation failed to run',
        { 
          totalChecks: validator.validationResults.summary.totalChecks,
          passedChecks: validator.validationResults.summary.passedChecks,
          failedChecks: validator.validationResults.summary.failedChecks,
          warningChecks: validator.validationResults.summary.warningChecks,
          success
        }
      );

      // Test that validator correctly identifies our test issues
      const expectedIssues = [
        'TENANT_ID_ASSIGNMENT',
        'FK_',
        'CROSS_TENANT'
      ];

      let detectedExpectedIssues = 0;
      for (const expectedIssue of expectedIssues) {
        const found = validator.validationResults.issues.some(issue => 
          issue.check.includes(expectedIssue)
        );
        if (found) detectedExpectedIssues++;
      }

      this.addTestResult(
        'DETECT_EXPECTED_ISSUES',
        detectedExpectedIssues >= 2, // Should detect at least 2 of our planted issues
        `Detected ${detectedExpectedIssues}/${expectedIssues.length} expected issue types`,
        { detectedExpectedIssues, expectedIssues: expectedIssues.length }
      );

    } catch (error) {
      this.addTestResult(
        'FULL_VALIDATION_WORKFLOW',
        false,
        'Test failed with error',
        { error: error.message }
      );
    } finally {
      await validator.close();
    }
  }

  async cleanupTestData() {
    this.log('CLEANUP', 'Cleaning up test data...');

    try {
      // Remove test records in reverse dependency order
      await this.executeQuery('DELETE FROM estoque_movimentacoes WHERE id BETWEEN 99990 AND 99999');
      await this.executeQuery('DELETE FROM estoque_lotes WHERE id BETWEEN 99990 AND 99999');
      await this.executeQuery('DELETE FROM estoque_escolas WHERE id BETWEEN 99990 AND 99999');
      await this.executeQuery('DELETE FROM produtos WHERE id BETWEEN 99990 AND 99999');
      await this.executeQuery('DELETE FROM escolas WHERE id BETWEEN 99990 AND 99999');
      await this.executeQuery('DELETE FROM tenants WHERE id LIKE \'test-tenant-%\'');

      this.log('SUCCESS', 'Test data cleanup completed');

    } catch (error) {
      this.log('ERROR', 'Failed to cleanup test data', { error: error.message });
      // Don't throw - cleanup failures shouldn't fail the test
    }
  }

  async generateTestReport() {
    const report = {
      ...this.testResults,
      summary: {
        ...this.testResults,
        successRate: this.testResults.totalTests > 0 
          ? (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(2)
          : 100,
        status: this.testResults.failedTests === 0 ? 'SUCCESS' : 'FAILURE'
      }
    };

    console.log('\n========================================');
    console.log('POST-MIGRATION VALIDATOR TEST REPORT');
    console.log('========================================\n');
    
    console.log(`🎯 Overall Status: ${report.summary.status}`);
    console.log(`📊 Success Rate: ${report.summary.successRate}%`);
    console.log(`🧪 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passedTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    
    if (report.summary.failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      report.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.test}: ${test.message}`);
        });
    }

    console.log('\n✅ PASSED TESTS:');
    report.tests
      .filter(test => test.passed)
      .forEach(test => {
        console.log(`  - ${test.test}: ${test.message}`);
      });

    console.log('\n========================================\n');

    return report.summary.status === 'SUCCESS';
  }

  async runAllTests() {
    this.log('INFO', 'Starting post-migration referential integrity validator tests...');

    try {
      // Setup
      await this.setupTestData();
      await this.createTestScenarios();

      // Run tests
      await this.testValidatorDetectsMissingTenantId();
      await this.testValidatorDetectsCrossTenantViolations();
      await this.testValidatorDetectsOrphanedRecords();
      await this.testValidatorDetectsQuantityInconsistencies();
      await this.testValidatorGeneratesTenantDistribution();
      await this.testFullValidationWorkflow();

      // Generate report
      const success = await this.generateTestReport();
      
      return success;

    } catch (error) {
      this.log('ERROR', 'Test suite failed', { error: error.message });
      return false;

    } finally {
      // Always cleanup
      await this.cleanupTestData();
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Main function
async function main() {
  const tester = new PostMigrationIntegrityTester();

  try {
    tester.log('INFO', 'Starting post-migration referential integrity validator tests');

    const success = await tester.runAllTests();
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    tester.log('ERROR', 'Test suite failed', { error: error.message, stack: error.stack });
    process.exit(1);

  } finally {
    await tester.close();
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = PostMigrationIntegrityTester;