/**
 * Comprehensive test runner for system architecture
 * Runs all test suites and generates coverage reports
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests',
    pattern: 'tests/unit/**/*.test.ts',
    description: 'Unit tests for system components'
  },
  {
    name: 'Integration Tests',
    pattern: 'tests/integration/**/*.test.ts',
    description: 'Integration tests for API endpoints and database interactions'
  },
  {
    name: 'Performance Tests',
    pattern: 'tests/performance/**/*.test.ts',
    description: 'Performance tests for query optimization'
  },
  {
    name: 'Security Tests',
    pattern: 'tests/security/**/*.test.ts',
    description: 'Security tests for access control'
  }
];

class TestRunner {
  private resultsDir: string;

  constructor() {
    this.resultsDir = path.join(__dirname, '..', 'test-results');
    this.ensureResultsDir();
  }

  private ensureResultsDir(): void {
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Multi-Tenant Architecture Test Suite');
    console.log('=' .repeat(60));

    const startTime = Date.now();
    const results: { suite: string; success: boolean; duration: number; error?: string }[] = [];

    for (const suite of testSuites) {
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
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    this.printSummary(results, totalDuration);
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    const command = `npx jest --testPathPattern="${suite.pattern}" --verbose --coverage=false`;
    
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
    console.log('🧪 Running All Tests with Coverage Report');
    console.log('=' .repeat(60));

    try {
      const command = `npx jest --coverage --coverageDirectory=coverage --coverageReporters=text,lcov,html`;
      
      execSync(command, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        timeout: 600000 // 10 minutes timeout for full coverage
      });

      console.log('\n📊 Coverage report generated in ./coverage directory');
    } catch (error) {
      console.error('❌ Coverage test run failed:', error);
      throw error;
    }
  }

  async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));
    
    if (!suite) {
      console.error(`❌ Test suite "${suiteName}" not found`);
      console.log('Available suites:');
      testSuites.forEach(s => console.log(`  - ${s.name}`));
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

  private printSummary(results: any[], totalDuration: number): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Total Suites: ${results.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

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
      console.log('\n🎉 All test suites passed successfully!');
    } else {
      console.log(`\n⚠️  ${failed} test suite(s) failed. Please review the errors above.`);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const runner = new TestRunner();

  try {
    if (args.includes('--coverage')) {
      await runner.runWithCoverage();
    } else if (args.includes('--suite')) {
      const suiteIndex = args.indexOf('--suite');
      const suiteName = args[suiteIndex + 1];
      if (!suiteName) {
        console.error('❌ Please specify a suite name after --suite');
        process.exit(1);
      }
      await runner.runSpecificSuite(suiteName);
    } else {
      await runner.runAllTests();
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TestRunner };