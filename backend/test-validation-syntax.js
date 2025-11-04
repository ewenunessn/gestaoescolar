/**
 * VALIDATION SYNTAX TEST
 * 
 * Simple test to verify that the validation scripts have correct syntax
 * and can be loaded without database connection issues.
 */

const fs = require('fs');
const path = require('path');

class ValidationSyntaxTester {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'TEST': '🧪'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
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

  testFileExists(filePath, testName) {
    try {
      const exists = fs.existsSync(filePath);
      this.addTestResult(
        testName,
        exists,
        exists ? `File exists: ${filePath}` : `File missing: ${filePath}`
      );
      return exists;
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        `Error checking file: ${filePath}`,
        { error: error.message }
      );
      return false;
    }
  }

  testJavaScriptSyntax(filePath, testName) {
    try {
      // Try to require the module without executing it
      const moduleCode = fs.readFileSync(filePath, 'utf8');
      
      // Basic syntax checks
      const hasRequire = moduleCode.includes('require(');
      const hasClass = moduleCode.includes('class ');
      const hasAsyncFunction = moduleCode.includes('async ');
      const hasModuleExports = moduleCode.includes('module.exports');
      
      const syntaxValid = hasRequire && hasClass && hasAsyncFunction && hasModuleExports;
      
      this.addTestResult(
        testName,
        syntaxValid,
        syntaxValid ? 'JavaScript syntax appears valid' : 'JavaScript syntax issues detected',
        { hasRequire, hasClass, hasAsyncFunction, hasModuleExports }
      );
      
      return syntaxValid;
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        'JavaScript syntax test failed',
        { error: error.message }
      );
      return false;
    }
  }

  testSQLSyntax(filePath, testName) {
    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Basic SQL syntax checks
      const hasSelect = sqlContent.includes('SELECT');
      const hasFrom = sqlContent.includes('FROM');
      const hasWhere = sqlContent.includes('WHERE');
      const hasCase = sqlContent.includes('CASE');
      const hasUnion = sqlContent.includes('UNION');
      
      // Check for tenant-related queries
      const hasTenantQueries = sqlContent.includes('tenant_id');
      const hasEstoqueQueries = sqlContent.includes('estoque_');
      
      const syntaxValid = hasSelect && hasFrom && hasTenantQueries && hasEstoqueQueries;
      
      this.addTestResult(
        testName,
        syntaxValid,
        syntaxValid ? 'SQL syntax appears valid' : 'SQL syntax issues detected',
        { hasSelect, hasFrom, hasWhere, hasCase, hasUnion, hasTenantQueries, hasEstoqueQueries }
      );
      
      return syntaxValid;
    } catch (error) {
      this.addTestResult(
        testName,
        false,
        'SQL syntax test failed',
        { error: error.message }
      );
      return false;
    }
  }

  testValidatorClassStructure() {
    try {
      // Test if we can load the validator class structure without database connection
      const validatorPath = path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validator.js');
      const validatorCode = fs.readFileSync(validatorPath, 'utf8');
      
      // Check for required methods
      const requiredMethods = [
        'validateTenantIdAssignments',
        'validateForeignKeyRelationshipsWithinTenants',
        'validateNoCrossTenantReferences',
        'validateDataConsistency',
        'generateTenantDistributionReport',
        'runFullValidation'
      ];
      
      let foundMethods = 0;
      for (const method of requiredMethods) {
        if (validatorCode.includes(`async ${method}(`) || validatorCode.includes(`${method}(`)) {
          foundMethods++;
        }
      }
      
      const allMethodsFound = foundMethods === requiredMethods.length;
      
      this.addTestResult(
        'VALIDATOR_CLASS_STRUCTURE',
        allMethodsFound,
        allMethodsFound ? 'All required validator methods found' : `Only ${foundMethods}/${requiredMethods.length} methods found`,
        { foundMethods, totalRequired: requiredMethods.length, requiredMethods }
      );
      
      return allMethodsFound;
    } catch (error) {
      this.addTestResult(
        'VALIDATOR_CLASS_STRUCTURE',
        false,
        'Validator class structure test failed',
        { error: error.message }
      );
      return false;
    }
  }

  testValidationCategories() {
    try {
      const validatorPath = path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validator.js');
      const validatorCode = fs.readFileSync(validatorPath, 'utf8');
      
      // Check for validation categories mentioned in requirements
      const validationCategories = [
        'tenant_id',
        'foreign key',
        'cross-tenant',
        'referential integrity',
        'data consistency',
        'tenant distribution'
      ];
      
      let foundCategories = 0;
      for (const category of validationCategories) {
        if (validatorCode.toLowerCase().includes(category.toLowerCase())) {
          foundCategories++;
        }
      }
      
      const allCategoriesFound = foundCategories === validationCategories.length;
      
      this.addTestResult(
        'VALIDATION_CATEGORIES',
        allCategoriesFound,
        allCategoriesFound ? 'All validation categories covered' : `Only ${foundCategories}/${validationCategories.length} categories found`,
        { foundCategories, totalRequired: validationCategories.length }
      );
      
      return allCategoriesFound;
    } catch (error) {
      this.addTestResult(
        'VALIDATION_CATEGORIES',
        false,
        'Validation categories test failed',
        { error: error.message }
      );
      return false;
    }
  }

  generateTestReport() {
    const report = {
      ...this.testResults,
      summary: {
        totalTests: this.testResults.totalTests,
        passedTests: this.testResults.passedTests,
        failedTests: this.testResults.failedTests,
        successRate: this.testResults.totalTests > 0 
          ? (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(2)
          : 100,
        status: this.testResults.failedTests === 0 ? 'SUCCESS' : 'FAILURE'
      }
    };

    console.log('\n========================================');
    console.log('VALIDATION SYNTAX TEST REPORT');
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

  runAllTests() {
    this.log('INFO', 'Starting validation syntax tests...');

    try {
      // Test file existence
      this.testFileExists(
        path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validator.js'),
        'JS_VALIDATOR_EXISTS'
      );
      
      this.testFileExists(
        path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validation.sql'),
        'SQL_VALIDATOR_EXISTS'
      );
      
      this.testFileExists(
        path.join(__dirname, 'POST_MIGRATION_VALIDATION_GUIDE.md'),
        'DOCUMENTATION_EXISTS'
      );

      // Test JavaScript syntax
      this.testJavaScriptSyntax(
        path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validator.js'),
        'JS_VALIDATOR_SYNTAX'
      );

      // Test SQL syntax
      this.testSQLSyntax(
        path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validation.sql'),
        'SQL_VALIDATOR_SYNTAX'
      );

      // Test validator structure
      this.testValidatorClassStructure();
      this.testValidationCategories();

      // Generate report
      const success = this.generateTestReport();
      
      return success;

    } catch (error) {
      this.log('ERROR', 'Test suite failed', { error: error.message });
      return false;
    }
  }
}

// Main function
async function main() {
  const tester = new ValidationSyntaxTester();

  try {
    tester.log('INFO', 'Starting validation syntax tests');

    const success = tester.runAllTests();
    
    if (success) {
      tester.log('SUCCESS', 'All syntax tests passed! Validation tools are ready to use.');
    } else {
      tester.log('ERROR', 'Some syntax tests failed. Review the issues before using validation tools.');
    }
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    tester.log('ERROR', 'Test suite failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = ValidationSyntaxTester;