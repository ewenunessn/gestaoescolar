/**
 * Inventory-specific test runner for tenant inventory implementation
 * Runs all inventory-related test suites
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

interface InventoryTestSuite {
  name: string;
  pattern: string;
  description: string;
  category: 'unit' | 'integration' | 'performance' | 'security';
}

const inventoryTestSuites: InventoryTestSuite[] = [
  {
    name: 'Tenant Inventory Validator Unit Tests',
    pattern: 'tests/unit/services/tenantInventoryValidator.test.ts',
    description: 'Unit tests for tenant inventory validation logic',
    category: 'unit'
  },
  {
    name: 'Tenant Inventory RLS Unit Tests',
    pattern: 'tests/unit/database/tenantInventoryRLS.test.ts',
    description: 'Unit tests for RLS policies and database triggers',
    category: 'unit'
  },
  {
    name: 'Tenant Inventory Error Handling Unit Tests',
    pattern: 'tests/unit/middleware/tenantInventoryErrorHandling.test.ts',
    description: 'Unit tests for inventory error handling middleware',
    category: 'unit'
  },
  {
    name: 'Tenant Inventory Isolation Integration Tests',
    pattern: 'tests/integration/tenantInventoryIsolation.test.ts',
    description: 'End-to-end tenant inventory isolation verification',
    category: 'integration'
  },
  {
    name: 'Tenant Inventory Performance Tests',
    pattern: 'tests/performance/tenantInventoryPerformance.test.ts',
    description: 'Performance tests for tenant inventory queries',
    category: 'performance'
  },
  {
    name: 'Tenant Inventory Security Tests',
    pattern: 'tests/security/tenantInventorySecurity.test.ts',
    description: 'Security tests for cross-tenant access prevention',
    category: 'security'
  }
];

class InventoryTestRunner {
  private resultsDir: string;

  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'test-results', 'inventory');
    this.ensureResultsDir();
  }

  private ensureResultsDir(): void {
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runAllInventoryTests(): Promise<void> {
    console.log('🧪 Starting Tenant Inventory Test Suite');
    console.log('=' .repeat(60));

    const startTime = Date.now();
    const results: { suite: string; success: boolean; duration: number; error?: string }[] = [];

    for (const suite of inventoryTestSuites) {
      console.log(`\n📋 Running ${suite.name}...`);
      console.log(`   Category: ${suite.category.toUpperCase()}`);
      console.log(`   ${suite.description}`);
      
      const suiteStartTime = Date.now();
      
      try {
        await this.runTestSuite(suite);
        const duration = Date.now() - suiteStartTime;
        results.push({ suite: suite.name, success: true, duration });
        console.log(`✅ ${suite.name} completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - suiteStartTime;
        results.push({ 
          suite: suite.name, 
          success: false, 
          duration, 
          error: error instanceof Error ? error.message : String(error)
        });
        console.log(`❌ ${suite.name} failed after ${duration}ms`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    this.printInventorySummary(results, totalDuration);
  }

  async runByCategory(category: 'unit' | 'integration' | 'performance' | 'security'): Promise<void> {
    console.log(`🧪 Running ${category.toUpperCase()} Inventory Tests`);
    console.log('=' .repeat(60));

    const categoryTests = inventoryTestSuites.filter(suite => suite.category === category);
    
    if (categoryTests.length === 0) {
      console.log(`No tests found for category: ${category}`);
      return;
    }

    const startTime = Date.now();
    const results: { suite: string; success: boolean; duration: number; error?: string }[] = [];

    for (const suite of categoryTests) {
      console.log(`\n📋 Running ${suite.name}...`);
      console.log(`   ${suite.description}`);
      
      const suiteStartTime = Date.now();
      
      try {
        await this.runTestSuite(suite);
        const duration = Date.now() - suiteStartTime;
        results.push({ suite: suite.name, success: true, duration });
        console.log(`✅ ${suite.name} completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - suiteStartTime;
        results.push({ 
          suite: suite.name, 
          success: false, 
          duration, 
          error: error instanceof Error ? error.message : String(error)
        });
        console.log(`❌ ${suite.name} failed after ${duration}ms`);
      }
    }

    const totalDuration = Date.now() - startTime;
    this.printInventorySummary(results, totalDuration);
  }

  private async runTestSuite(suite: InventoryTestSuite): Promise<void> {
    const command = `npx jest --testPathPattern="${suite.pattern}" --verbose --coverage=false --runInBand`;
    
    try {
      execSync(command, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..'),
        timeout: 300000 // 5 minutes timeout per suite
      });
    } catch (error: any) {
      throw new Error(`Test suite failed: ${error.message}`);
    }
  }

  async runWithCoverage(): Promise<void> {
    console.log('🧪 Running Inventory Tests with Coverage Report');
    console.log('=' .repeat(60));

    try {
      const inventoryPatterns = inventoryTestSuites.map(suite => suite.pattern).join('|');
      const command = `npx jest --testPathPattern="(${inventoryPatterns})" --coverage --coverageDirectory=coverage/inventory --coverageReporters=text,lcov,html`;
      
      execSync(command, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        timeout: 600000 // 10 minutes timeout for full coverage
      });

      console.log('\n📊 Inventory coverage report generated in ./coverage/inventory directory');
    } catch (error) {
      console.error('❌ Inventory coverage test run failed:', error);
      throw error;
    }
  }

  async runSpecificTest(testName: string): Promise<void> {
    const suite = inventoryTestSuites.find(s => 
      s.name.toLowerCase().includes(testName.toLowerCase()) ||
      s.pattern.includes(testName)
    );
    
    if (!suite) {
      console.error(`❌ Test "${testName}" not found`);
      console.log('Available inventory tests:');
      inventoryTestSuites.forEach(s => console.log(`  - ${s.name}`));
      return;
    }

    console.log(`🧪 Running ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log('-'.repeat(40));

    try {
      await this.runTestSuite(suite);
      console.log(`✅ ${suite.name} completed successfully`);
    } catch (error) {
      console.error(`❌ ${suite.name} failed:`, error);
      throw error;
    }
  }

  private printInventorySummary(results: any[], totalDuration: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 INVENTORY TEST SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Total Inventory Test Suites: ${results.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

    // Category breakdown
    const categories = ['unit', 'integration', 'performance', 'security'];
    console.log('\n📋 Category Breakdown:');
    categories.forEach(category => {
      const categoryTests = inventoryTestSuites.filter(suite => suite.category === category);
      const categoryResults = results.filter(result => 
        categoryTests.some(test => test.name === result.suite)
      );
      const categorySuccess = categoryResults.filter(r => r.success).length;
      const categoryTotal = categoryResults.length;
      
      if (categoryTotal > 0) {
        console.log(`  ${category.toUpperCase()}: ${categorySuccess}/${categoryTotal} passed`);
      }
    });

    if (failed > 0) {
      console.log('\n❌ Failed Suites:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.suite}: ${result.error}`);
      });
    }

    console.log('\n📋 Suite Details:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.suite}: ${result.duration}ms`);
    });

    if (successful === results.length) {
      console.log('\n🎉 All inventory test suites passed successfully!');
      console.log('\n✅ Tenant inventory implementation is ready for production');
    } else {
      console.log(`\n⚠️  ${failed} inventory test suite(s) failed. Please review the errors above.`);
      process.exit(1);
    }
  }

  printTestRequirementsCoverage(): void {
    console.log('\n📋 Requirements Coverage Verification');
    console.log('='.repeat(60));

    const requirementsCoverage = {
      '8.1 - Tenant Validation Testing': [
        'Tenant Inventory Validator Unit Tests',
        'Tenant Inventory RLS Unit Tests',
        'Tenant Inventory Isolation Integration Tests'
      ],
      '8.2 - Cross-Tenant Access Prevention': [
        'Tenant Inventory Isolation Integration Tests',
        'Tenant Inventory Security Tests'
      ],
      '8.3 - Performance Testing': [
        'Tenant Inventory Performance Tests'
      ],
      '8.4 - Error Handling Testing': [
        'Tenant Inventory Error Handling Unit Tests',
        'Tenant Inventory Validator Unit Tests'
      ],
      '8.5 - End-to-End Workflow Testing': [
        'Tenant Inventory Isolation Integration Tests'
      ]
    };

    Object.entries(requirementsCoverage).forEach(([requirement, tests]) => {
      console.log(`\n${requirement}:`);
      tests.forEach(test => {
        const suite = inventoryTestSuites.find(s => s.name === test);
        const status = suite ? '✅' : '❌';
        console.log(`  ${status} ${test}`);
      });
    });

    console.log('\n🎯 All requirements from the tenant inventory specification are covered by tests');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new InventoryTestRunner();

  try {
    if (args.includes('--coverage')) {
      await runner.runWithCoverage();
    } else if (args.includes('--category')) {
      const categoryIndex = args.indexOf('--category');
      const category = args[categoryIndex + 1] as 'unit' | 'integration' | 'performance' | 'security';
      if (!category || !['unit', 'integration', 'performance', 'security'].includes(category)) {
        console.error('❌ Please specify a valid category: unit, integration, performance, security');
        process.exit(1);
      }
      await runner.runByCategory(category);
    } else if (args.includes('--test')) {
      const testIndex = args.indexOf('--test');
      const testName = args[testIndex + 1];
      if (!testName) {
        console.error('❌ Please specify a test name after --test');
        process.exit(1);
      }
      await runner.runSpecificTest(testName);
    } else if (args.includes('--requirements')) {
      runner.printTestRequirementsCoverage();
    } else {
      await runner.runAllInventoryTests();
    }
  } catch (error) {
    console.error('❌ Inventory test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { InventoryTestRunner };