#!/usr/bin/env node

/**
 * Tenant Migration CLI Tool
 * Command-line interface for managing tenant migrations
 */

import { tenantMigrationService } from '../services/tenantMigrationService';
import { generateMigrationFromTemplate, generateBulkTenantIdMigration, generateBulkRLSMigration } from '../services/migrationTemplates';

interface CliCommand {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<void>;
}

class TenantMigrationCli {
  private commands: CliCommand[] = [
    {
      name: 'create',
      description: 'Create a new migration',
      handler: this.createMigration.bind(this)
    },
    {
      name: 'run',
      description: 'Run pending migrations',
      handler: this.runMigrations.bind(this)
    },
    {
      name: 'rollback',
      description: 'Rollback migrations',
      handler: this.rollbackMigrations.bind(this)
    },
    {
      name: 'status',
      description: 'Show migration status',
      handler: this.showStatus.bind(this)
    },
    {
      name: 'generate',
      description: 'Generate migration from template',
      handler: this.generateFromTemplate.bind(this)
    },
    {
      name: 'recover',
      description: 'Recover failed migration',
      handler: this.recoverMigration.bind(this)
    },
    {
      name: 'validate',
      description: 'Validate migration integrity',
      handler: this.validateIntegrity.bind(this)
    },
    {
      name: 'help',
      description: 'Show help information',
      handler: this.showHelp.bind(this)
    }
  ];

  async run(args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.showHelp([]);
      return;
    }

    const commandName = args[0];
    const command = this.commands.find(cmd => cmd.name === commandName);

    if (!command) {
      console.error(`❌ Unknown command: ${commandName}`);
      await this.showHelp([]);
      return;
    }

    try {
      await command.handler(args.slice(1));
    } catch (error: any) {
      console.error(`❌ Error executing command: ${error.message}`);
      process.exit(1);
    }
  }

  private async createMigration(args: string[]): Promise<void> {
    if (args.length < 2) {
      console.error('Usage: create <name> <description> [--tenant-specific]');
      return;
    }

    const name = args[0];
    const description = args[1];
    const tenantSpecific = args.includes('--tenant-specific');

    console.log('📝 Creating new migration...');
    console.log(`Name: ${name}`);
    console.log(`Description: ${description}`);
    console.log(`Tenant-specific: ${tenantSpecific}`);

    // Create empty migration template
    const upSql = `-- Migration: ${name}\n-- Description: ${description}\n\n-- Add your migration SQL here\n`;
    const downSql = `-- Rollback: ${name}\n-- Description: ${description}\n\n-- Add your rollback SQL here\n`;

    const migration = await tenantMigrationService.createMigration({
      name,
      description,
      upSql,
      downSql,
      tenantSpecific,
      dependencies: []
    });

    console.log(`✅ Migration created: ${migration.id}`);
    console.log(`📁 Edit migration files in: migrations/tenant/${migration.id}/`);
  }

  private async runMigrations(args: string[]): Promise<void> {
    const tenantId = this.extractTenantId(args);
    const migrationId = this.extractMigrationId(args);

    if (migrationId) {
      console.log(`🚀 Running migration: ${migrationId}`);
      if (tenantId) {
        console.log(`🏢 For tenant: ${tenantId}`);
      }

      const result = await tenantMigrationService.runMigration(migrationId, tenantId);
      this.printMigrationResult(result);
    } else {
      console.log('🚀 Running all pending migrations...');
      if (tenantId) {
        console.log(`🏢 For tenant: ${tenantId}`);
      }

      const results = await tenantMigrationService.runAllPendingMigrations(tenantId);
      
      console.log(`\n📊 Migration Results:`);
      results.forEach(result => this.printMigrationResult(result));

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`\n✅ Successful: ${successful}`);
      console.log(`❌ Failed: ${failed}`);
    }
  }

  private async rollbackMigrations(args: string[]): Promise<void> {
    const tenantId = this.extractTenantId(args);
    const migrationId = this.extractMigrationId(args);
    const toMigrationId = this.extractToMigrationId(args);

    if (migrationId) {
      console.log(`⏪ Rolling back migration: ${migrationId}`);
      if (tenantId) {
        console.log(`🏢 For tenant: ${tenantId}`);
      }

      const result = await tenantMigrationService.rollbackMigration(migrationId, tenantId);
      this.printMigrationResult(result);
    } else if (tenantId) {
      console.log(`⏪ Rolling back tenant migrations: ${tenantId}`);
      if (toMigrationId) {
        console.log(`📍 To migration: ${toMigrationId}`);
      }

      const results = await tenantMigrationService.rollbackTenantMigrations(tenantId, toMigrationId);
      
      console.log(`\n📊 Rollback Results:`);
      results.forEach(result => this.printMigrationResult(result));
    } else {
      console.error('Usage: rollback --migration <id> [--tenant <id>] OR rollback --tenant <id> [--to <migration-id>]');
    }
  }

  private async showStatus(args: string[]): Promise<void> {
    const tenantId = this.extractTenantId(args);

    console.log('📋 Migration Status');
    if (tenantId) {
      console.log(`🏢 For tenant: ${tenantId}`);
    }

    const statuses = await tenantMigrationService.getMigrationStatus(tenantId);

    if (statuses.length === 0) {
      console.log('No migrations found.');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('Migration ID'.padEnd(30) + 'Status'.padEnd(12) + 'Applied At'.padEnd(20) + 'Execution Time');
    console.log('='.repeat(80));

    statuses.forEach(status => {
      const migrationId = status.migrationId.padEnd(30);
      const statusText = this.getStatusIcon(status.status) + status.status.padEnd(10);
      const appliedAt = status.appliedAt 
        ? new Date(status.appliedAt).toLocaleString().padEnd(20)
        : 'N/A'.padEnd(20);
      const executionTime = status.executionTime 
        ? `${status.executionTime}ms`
        : 'N/A';

      console.log(`${migrationId}${statusText}${appliedAt}${executionTime}`);

      if (status.error) {
        console.log(`  ❌ Error: ${status.error}`);
      }
    });
  }

  private async generateFromTemplate(args: string[]): Promise<void> {
    if (args.length < 1) {
      console.error('Usage: generate <template> [options]');
      console.log('\nAvailable templates:');
      console.log('  add-tenant-id --table <name> [--default-tenant <id>]');
      console.log('  enable-rls --table <name>');
      console.log('  bulk-tenant-id --tables <name1,name2,...> [--default-tenant <id>]');
      console.log('  bulk-rls --tables <name1,name2,...>');
      return;
    }

    const template = args[0];

    switch (template) {
      case 'add-tenant-id':
        await this.generateAddTenantId(args.slice(1));
        break;
      case 'enable-rls':
        await this.generateEnableRLS(args.slice(1));
        break;
      case 'bulk-tenant-id':
        await this.generateBulkTenantId(args.slice(1));
        break;
      case 'bulk-rls':
        await this.generateBulkRLS(args.slice(1));
        break;
      default:
        console.error(`❌ Unknown template: ${template}`);
    }
  }

  private async generateAddTenantId(args: string[]): Promise<void> {
    const tableName = this.extractOption(args, '--table');
    const defaultTenantId = this.extractOption(args, '--default-tenant');

    if (!tableName) {
      console.error('❌ --table option is required');
      return;
    }

    console.log(`📝 Generating add-tenant-id migration for table: ${tableName}`);

    const { upSql, downSql } = generateMigrationFromTemplate('addTenantId', {
      tableName,
      defaultTenantId,
      nullable: false,
      addIndex: true,
      addForeignKey: true
    });

    const migration = await tenantMigrationService.createMigration({
      name: `add_tenant_id_to_${tableName}`,
      description: `Add tenant_id column to ${tableName} table`,
      upSql,
      downSql,
      tenantSpecific: false
    });

    console.log(`✅ Migration created: ${migration.id}`);
  }

  private async generateEnableRLS(args: string[]): Promise<void> {
    const tableName = this.extractOption(args, '--table');

    if (!tableName) {
      console.error('❌ --table option is required');
      return;
    }

    console.log(`📝 Generating enable-rls migration for table: ${tableName}`);

    const { upSql, downSql } = generateMigrationFromTemplate('enableRLS', {
      tableName
    });

    const migration = await tenantMigrationService.createMigration({
      name: `enable_rls_${tableName}`,
      description: `Enable Row Level Security for ${tableName} table`,
      upSql,
      downSql,
      tenantSpecific: false
    });

    console.log(`✅ Migration created: ${migration.id}`);
  }

  private async generateBulkTenantId(args: string[]): Promise<void> {
    const tablesOption = this.extractOption(args, '--tables');
    const defaultTenantId = this.extractOption(args, '--default-tenant');

    if (!tablesOption) {
      console.error('❌ --tables option is required');
      return;
    }

    const tableNames = tablesOption.split(',').map(name => name.trim());
    console.log(`📝 Generating bulk add-tenant-id migration for tables: ${tableNames.join(', ')}`);

    const { upSql, downSql } = generateBulkTenantIdMigration(tableNames, defaultTenantId);

    const migration = await tenantMigrationService.createMigration({
      name: `bulk_add_tenant_id`,
      description: `Add tenant_id column to multiple tables: ${tableNames.join(', ')}`,
      upSql,
      downSql,
      tenantSpecific: false
    });

    console.log(`✅ Migration created: ${migration.id}`);
  }

  private async generateBulkRLS(args: string[]): Promise<void> {
    const tablesOption = this.extractOption(args, '--tables');

    if (!tablesOption) {
      console.error('❌ --tables option is required');
      return;
    }

    const tableNames = tablesOption.split(',').map(name => name.trim());
    console.log(`📝 Generating bulk enable-rls migration for tables: ${tableNames.join(', ')}`);

    const { upSql, downSql } = generateBulkRLSMigration(tableNames);

    const migration = await tenantMigrationService.createMigration({
      name: `bulk_enable_rls`,
      description: `Enable Row Level Security for multiple tables: ${tableNames.join(', ')}`,
      upSql,
      downSql,
      tenantSpecific: false
    });

    console.log(`✅ Migration created: ${migration.id}`);
  }

  private async recoverMigration(args: string[]): Promise<void> {
    const migrationId = this.extractMigrationId(args);
    const tenantId = this.extractTenantId(args);

    if (!migrationId) {
      console.error('Usage: recover --migration <id> [--tenant <id>]');
      return;
    }

    console.log(`🔧 Recovering failed migration: ${migrationId}`);
    if (tenantId) {
      console.log(`🏢 For tenant: ${tenantId}`);
    }

    const result = await tenantMigrationService.recoverFailedMigration(migrationId, tenantId);
    this.printMigrationResult(result);
  }

  private async validateIntegrity(args: string[]): Promise<void> {
    const tenantId = this.extractTenantId(args);

    console.log('🔍 Validating migration integrity...');
    if (tenantId) {
      console.log(`🏢 For tenant: ${tenantId}`);
    }

    const isValid = await tenantMigrationService.validateMigrationIntegrity(tenantId);

    if (isValid) {
      console.log('✅ Migration integrity is valid');
    } else {
      console.log('❌ Migration integrity issues found');
      process.exit(1);
    }
  }

  private async showHelp(args: string[]): Promise<void> {
    console.log('🔧 Tenant Migration CLI Tool\n');
    console.log('Usage: tenant-migration <command> [options]\n');
    console.log('Commands:');

    this.commands.forEach(command => {
      console.log(`  ${command.name.padEnd(12)} ${command.description}`);
    });

    console.log('\nOptions:');
    console.log('  --tenant <id>      Specify tenant ID');
    console.log('  --migration <id>   Specify migration ID');
    console.log('  --to <id>          Rollback to specific migration');
    console.log('  --table <name>     Specify table name');
    console.log('  --tables <list>    Specify comma-separated table names');
    console.log('  --default-tenant   Specify default tenant ID for existing data');

    console.log('\nExamples:');
    console.log('  tenant-migration create "Add user roles" "Add role column to users table"');
    console.log('  tenant-migration run --tenant 123e4567-e89b-12d3-a456-426614174000');
    console.log('  tenant-migration generate add-tenant-id --table users --default-tenant 123e4567-e89b-12d3-a456-426614174000');
    console.log('  tenant-migration status --tenant 123e4567-e89b-12d3-a456-426614174000');
    console.log('  tenant-migration rollback --migration 20231201120000_add_user_roles');
  }

  // Helper methods

  private extractTenantId(args: string[]): string | undefined {
    return this.extractOption(args, '--tenant');
  }

  private extractMigrationId(args: string[]): string | undefined {
    return this.extractOption(args, '--migration');
  }

  private extractToMigrationId(args: string[]): string | undefined {
    return this.extractOption(args, '--to');
  }

  private extractOption(args: string[], option: string): string | undefined {
    const index = args.indexOf(option);
    return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
  }

  private printMigrationResult(result: any): void {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'SUCCESS' : 'FAILED';
    
    console.log(`${icon} ${result.migrationId} - ${status} (${result.executionTime}ms)`);
    
    if (result.tenantId) {
      console.log(`   🏢 Tenant: ${result.tenantId}`);
    }
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error}`);
    }
    
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach((warning: string) => {
        console.log(`   ⚠️  Warning: ${warning}`);
      });
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅ ';
      case 'failed': return '❌ ';
      case 'running': return '🔄 ';
      case 'rolled_back': return '⏪ ';
      case 'pending': return '⏳ ';
      default: return '❓ ';
    }
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new TenantMigrationCli();
  const args = process.argv.slice(2);
  
  cli.run(args).catch(error => {
    console.error('❌ CLI Error:', error.message);
    process.exit(1);
  });
}

export { TenantMigrationCli };