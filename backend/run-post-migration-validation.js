/**
 * RUN POST-MIGRATION VALIDATION
 * 
 * Main script to execute post-migration referential integrity validation.
 * This script provides a simple interface to run the comprehensive validation
 * with appropriate error handling and user-friendly output.
 * 
 * Usage: node run-post-migration-validation.js [options]
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  detailed: process.argv.includes('--detailed'),
  exportReport: process.argv.includes('--export-report'),
  fixMinorIssues: process.argv.includes('--fix-minor-issues'),
  sqlOnly: process.argv.includes('--sql-only'),
  jsOnly: process.argv.includes('--js-only'),
  help: process.argv.includes('--help') || process.argv.includes('-h')
};

class PostMigrationValidationRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      sqlValidation: null,
      jsValidation: null,
      overallSuccess: false
    };
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'INFO': '📋',
      'SUCCESS': '✅',
      'ERROR': '❌',
      'WARNING': '⚠️',
      'STEP': '🔄'
    }[level] || '📋';

    console.log(`${prefix} [${timestamp}] ${message}`);
    
    if (data) {
      console.log('   Details:', JSON.stringify(data, null, 2));
    }
  }

  showHelp() {
    console.log(`
POST-MIGRATION REFERENTIAL INTEGRITY VALIDATION

This script validates the integrity of inventory data after tenant migration.

USAGE:
  node run-post-migration-validation.js [options]

OPTIONS:
  --detailed          Include detailed analysis and sample data
  --export-report     Export comprehensive JSON report
  --fix-minor-issues  Automatically fix minor issues (orphaned records, missing tenant_id)
  --sql-only          Run only SQL validation (faster, immediate results)
  --js-only           Run only JavaScript validation (comprehensive analysis)
  --help, -h          Show this help message

EXAMPLES:
  # Quick SQL validation
  node run-post-migration-validation.js --sql-only

  # Comprehensive validation with report
  node run-post-migration-validation.js --detailed --export-report

  # Full validation with auto-fix
  node run-post-migration-validation.js --detailed --fix-minor-issues --export-report

VALIDATION CHECKS:
  ✓ Tenant ID assignments across all inventory tables
  ✓ Foreign key relationships within tenant boundaries  
  ✓ Cross-tenant reference violations
  ✓ Data consistency (quantities, duplicates)
  ✓ Tenant distribution analysis
  ✓ Database structure validation

REQUIREMENTS:
  - PostgreSQL database with inventory tables
  - Appropriate database connection credentials
  - Node.js with required dependencies

For detailed documentation, see: backend/POST_MIGRATION_VALIDATION_GUIDE.md
`);
  }

  async checkPrerequisites() {
    this.log('STEP', 'Checking prerequisites...');

    try {
      // Check if validation scripts exist
      const jsValidatorPath = path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validator.js');
      const sqlValidatorPath = path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validation.sql');

      const jsExists = await fs.access(jsValidatorPath).then(() => true).catch(() => false);
      const sqlExists = await fs.access(sqlValidatorPath).then(() => true).catch(() => false);

      if (!jsExists) {
        throw new Error(`JavaScript validator not found: ${jsValidatorPath}`);
      }

      if (!sqlExists) {
        throw new Error(`SQL validator not found: ${sqlValidatorPath}`);
      }

      // Check environment variables
      const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

      if (missingVars.length > 0) {
        this.log('WARNING', `Missing environment variables: ${missingVars.join(', ')}`);
        this.log('INFO', 'Using default values or .env file configuration');
      }

      this.log('SUCCESS', 'Prerequisites check passed');
      return true;

    } catch (error) {
      this.log('ERROR', 'Prerequisites check failed', { error: error.message });
      return false;
    }
  }

  async runSQLValidation() {
    this.log('STEP', 'Running SQL validation...');

    return new Promise((resolve) => {
      const sqlPath = path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validation.sql');
      
      // Build psql command
      const psqlArgs = [
        '-d', process.env.DB_NAME || 'gestao_escolar',
        '-f', sqlPath
      ];

      if (process.env.DB_HOST) {
        psqlArgs.unshift('-h', process.env.DB_HOST);
      }
      if (process.env.DB_PORT) {
        psqlArgs.unshift('-p', process.env.DB_PORT);
      }
      if (process.env.DB_USER) {
        psqlArgs.unshift('-U', process.env.DB_USER);
      }

      const psql = spawn('psql', psqlArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD || ''
        }
      });

      let output = '';
      let errorOutput = '';

      psql.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      psql.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        // Don't print stderr to console as it may contain connection info
      });

      psql.on('close', (code) => {
        const success = code === 0;
        
        this.results.sqlValidation = {
          success,
          exitCode: code,
          output: output.substring(0, 1000), // Truncate for storage
          error: errorOutput.substring(0, 500)
        };

        if (success) {
          this.log('SUCCESS', 'SQL validation completed successfully');
        } else {
          this.log('ERROR', 'SQL validation failed', { exitCode: code, error: errorOutput });
        }

        resolve(success);
      });

      psql.on('error', (error) => {
        this.log('ERROR', 'Failed to run SQL validation', { error: error.message });
        this.results.sqlValidation = {
          success: false,
          error: error.message
        };
        resolve(false);
      });
    });
  }

  async runJavaScriptValidation() {
    this.log('STEP', 'Running JavaScript validation...');

    return new Promise((resolve) => {
      const jsPath = path.join(__dirname, 'scripts', 'post-migration-referential-integrity-validator.js');
      
      // Build node command arguments
      const nodeArgs = [jsPath];
      
      if (config.detailed) {
        nodeArgs.push('--detailed');
      }
      if (config.exportReport) {
        nodeArgs.push('--export-report');
      }
      if (config.fixMinorIssues) {
        nodeArgs.push('--fix-minor-issues');
      }

      const node = spawn('node', nodeArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      let output = '';
      let errorOutput = '';

      node.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      node.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      node.on('close', (code) => {
        const success = code === 0;
        
        this.results.jsValidation = {
          success,
          exitCode: code,
          output: output.substring(0, 1000), // Truncate for storage
          error: errorOutput.substring(0, 500)
        };

        if (success) {
          this.log('SUCCESS', 'JavaScript validation completed successfully');
        } else {
          this.log('ERROR', 'JavaScript validation failed', { exitCode: code });
        }

        resolve(success);
      });

      node.on('error', (error) => {
        this.log('ERROR', 'Failed to run JavaScript validation', { error: error.message });
        this.results.jsValidation = {
          success: false,
          error: error.message
        };
        resolve(false);
      });
    });
  }

  async generateSummaryReport() {
    this.log('STEP', 'Generating summary report...');

    const sqlSuccess = this.results.sqlValidation?.success || false;
    const jsSuccess = this.results.jsValidation?.success || false;
    
    let overallStatus;
    if (config.sqlOnly) {
      overallStatus = sqlSuccess ? 'SUCCESS' : 'FAILURE';
      this.results.overallSuccess = sqlSuccess;
    } else if (config.jsOnly) {
      overallStatus = jsSuccess ? 'SUCCESS' : 'FAILURE';
      this.results.overallSuccess = jsSuccess;
    } else {
      overallStatus = (sqlSuccess && jsSuccess) ? 'SUCCESS' : 'PARTIAL_SUCCESS';
      this.results.overallSuccess = sqlSuccess && jsSuccess;
    }

    console.log('\n========================================');
    console.log('POST-MIGRATION VALIDATION SUMMARY');
    console.log('========================================\n');
    
    console.log(`🎯 Overall Status: ${overallStatus}`);
    console.log(`📅 Validation Time: ${this.results.timestamp}`);
    
    if (!config.jsOnly) {
      console.log(`📊 SQL Validation: ${sqlSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
    }
    
    if (!config.sqlOnly) {
      console.log(`🔍 JavaScript Validation: ${jsSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
    }

    console.log('\n📋 VALIDATION SCOPE:');
    console.log('   ✓ Tenant ID assignments');
    console.log('   ✓ Foreign key relationships');
    console.log('   ✓ Cross-tenant violations');
    console.log('   ✓ Data consistency checks');
    console.log('   ✓ Referential integrity');

    if (config.fixMinorIssues) {
      console.log('\n🔧 AUTO-FIX ENABLED:');
      console.log('   ✓ Minor issues automatically fixed');
    }

    if (config.exportReport) {
      console.log('\n📄 REPORTS GENERATED:');
      console.log('   ✓ Detailed JSON report exported');
    }

    if (overallStatus === 'SUCCESS') {
      console.log('\n✅ MIGRATION VALIDATION SUCCESSFUL!');
      console.log('   All integrity checks passed.');
      console.log('   Inventory data is properly isolated by tenant.');
      console.log('   No critical issues found.');
    } else if (overallStatus === 'PARTIAL_SUCCESS') {
      console.log('\n⚠️ PARTIAL SUCCESS');
      console.log('   Some validations passed, others failed.');
      console.log('   Review the detailed output above.');
    } else {
      console.log('\n❌ VALIDATION FAILED');
      console.log('   Critical issues found that require attention.');
      console.log('   Review the error messages above.');
    }

    console.log('\n📚 NEXT STEPS:');
    if (overallStatus === 'SUCCESS') {
      console.log('   1. Set tenant_id columns to NOT NULL');
      console.log('   2. Add foreign key constraints');
      console.log('   3. Enable Row Level Security policies');
      console.log('   4. Document validation results');
    } else {
      console.log('   1. Review validation errors above');
      console.log('   2. Fix identified issues');
      console.log('   3. Re-run validation');
      console.log('   4. Consult POST_MIGRATION_VALIDATION_GUIDE.md');
    }

    console.log('\n========================================\n');

    return this.results.overallSuccess;
  }

  async run() {
    try {
      this.log('INFO', 'Starting post-migration referential integrity validation');
      this.log('INFO', `Configuration: ${JSON.stringify(config, null, 2)}`);

      // Check prerequisites
      const prerequisitesOk = await this.checkPrerequisites();
      if (!prerequisitesOk) {
        return false;
      }

      // Run validations based on configuration
      if (config.sqlOnly) {
        await this.runSQLValidation();
      } else if (config.jsOnly) {
        await this.runJavaScriptValidation();
      } else {
        // Run both validations
        this.log('INFO', 'Running comprehensive validation (SQL + JavaScript)');
        await this.runSQLValidation();
        console.log('\n' + '='.repeat(60) + '\n');
        await this.runJavaScriptValidation();
      }

      // Generate summary
      const success = await this.generateSummaryReport();
      
      return success;

    } catch (error) {
      this.log('ERROR', 'Validation runner failed', { error: error.message });
      return false;
    }
  }
}

// Main function
async function main() {
  if (config.help) {
    const runner = new PostMigrationValidationRunner();
    runner.showHelp();
    process.exit(0);
  }

  const runner = new PostMigrationValidationRunner();

  try {
    const success = await runner.run();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('❌ Validation runner failed:', error.message);
    process.exit(1);
  }
}

// Signal handling
process.on('SIGINT', () => {
  console.log('\n⚠️ Validation interrupted by user');
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = PostMigrationValidationRunner;