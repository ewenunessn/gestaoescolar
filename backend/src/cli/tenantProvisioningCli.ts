#!/usr/bin/env node

/**
 * Tenant Provisioning CLI
 * Command-line interface for tenant provisioning automation
 */

import { Command } from 'commander';
import { tenantProvisioningService } from '../services/tenantProvisioningService';
import { tenantService } from '../services/tenantService';

const program = new Command();

program
  .name('tenant-provisioning')
  .description('CLI for tenant provisioning automation')
  .version('1.0.0');

// Template management commands
const templateCmd = program
  .command('template')
  .description('Manage tenant templates');

templateCmd
  .command('list')
  .description('List all tenant templates')
  .option('-c, --category <category>', 'Filter by category')
  .action(async (options) => {
    try {
      const templates = await tenantProvisioningService.listTemplates(options.category);
      
      console.log('\n📋 Tenant Templates:');
      console.log('===================');
      
      if (templates.length === 0) {
        console.log('No templates found.');
        return;
      }

      templates.forEach(template => {
        console.log(`\n🏷️  ${template.name} (${template.id})`);
        console.log(`   Category: ${template.category}`);
        console.log(`   Description: ${template.description}`);
        console.log(`   Created: ${template.createdAt}`);
      });
      
      console.log(`\nTotal: ${templates.length} templates\n`);
    } catch (error) {
      console.error('❌ Error listing templates:', error);
      process.exit(1);
    }
  });

templateCmd
  .command('show <templateId>')
  .description('Show template details')
  .action(async (templateId) => {
    try {
      const template = await tenantProvisioningService.getTemplate(templateId);
      
      if (!template) {
        console.log('❌ Template not found');
        process.exit(1);
      }

      console.log('\n📋 Template Details:');
      console.log('===================');
      console.log(`Name: ${template.name}`);
      console.log(`ID: ${template.id}`);
      console.log(`Category: ${template.category}`);
      console.log(`Description: ${template.description}`);
      console.log(`Created: ${template.createdAt}`);
      console.log(`Updated: ${template.updatedAt}`);
      
      console.log('\n⚙️  Settings:');
      console.log(JSON.stringify(template.settings, null, 2));
      
      console.log('\n📊 Limits:');
      console.log(JSON.stringify(template.limits, null, 2));
      
      if (template.initialData && Object.keys(template.initialData).length > 0) {
        console.log('\n📦 Initial Data:');
        console.log(JSON.stringify(template.initialData, null, 2));
      }
      
      if (template.migrations && template.migrations.length > 0) {
        console.log('\n🔄 Migrations:');
        template.migrations.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
      
      if (template.postProvisioningSteps && template.postProvisioningSteps.length > 0) {
        console.log('\n🚀 Post-Provisioning Steps:');
        template.postProvisioningSteps.forEach(step => {
          console.log(`  - ${step}`);
        });
      }
      
      console.log('');
    } catch (error) {
      console.error('❌ Error showing template:', error);
      process.exit(1);
    }
  });

templateCmd
  .command('create <name>')
  .description('Create new tenant template')
  .option('-d, --description <description>', 'Template description')
  .option('-c, --category <category>', 'Template category', 'basic')
  .option('-f, --file <file>', 'JSON file with template configuration')
  .action(async (name, options) => {
    try {
      let templateData: any = {
        name,
        description: options.description || `Template for ${name}`,
        category: options.category,
        settings: {},
        limits: {}
      };

      if (options.file) {
        const fs = require('fs');
        const fileData = JSON.parse(fs.readFileSync(options.file, 'utf8'));
        templateData = { ...templateData, ...fileData };
      }

      const template = await tenantProvisioningService.createTemplate(templateData);
      
      console.log('✅ Template created successfully!');
      console.log(`Template ID: ${template.id}`);
      console.log(`Name: ${template.name}`);
      console.log(`Category: ${template.category}`);
    } catch (error) {
      console.error('❌ Error creating template:', error);
      process.exit(1);
    }
  });

// Provisioning commands
const provisionCmd = program
  .command('provision')
  .description('Provision tenants');

provisionCmd
  .command('from-template <templateId>')
  .description('Provision tenant from template')
  .requiredOption('-s, --slug <slug>', 'Tenant slug')
  .requiredOption('-n, --name <name>', 'Tenant name')
  .requiredOption('--admin-name <adminName>', 'Admin user name')
  .requiredOption('--admin-email <adminEmail>', 'Admin user email')
  .requiredOption('--admin-password <adminPassword>', 'Admin user password')
  .option('--subdomain <subdomain>', 'Tenant subdomain')
  .option('--domain <domain>', 'Tenant custom domain')
  .action(async (templateId, options) => {
    try {
      const tenantData = {
        slug: options.slug,
        name: options.name,
        subdomain: options.subdomain,
        domain: options.domain
      };

      const adminUser = {
        nome: options.adminName,
        email: options.adminEmail,
        senha: options.adminPassword
      };

      console.log('🚀 Starting tenant provisioning...');
      console.log(`Template: ${templateId}`);
      console.log(`Tenant: ${tenantData.name} (${tenantData.slug})`);
      console.log(`Admin: ${adminUser.nome} <${adminUser.email}>`);

      const progress = await tenantProvisioningService.provisionFromTemplate(
        templateId,
        tenantData,
        adminUser
      );

      console.log(`✅ Provisioning started successfully!`);
      console.log(`Progress ID: ${progress.id}`);
      console.log(`Status: ${progress.status}`);
      console.log(`\nUse 'tenant-provisioning progress show ${progress.id}' to track progress.`);
    } catch (error) {
      console.error('❌ Error starting provisioning:', error);
      process.exit(1);
    }
  });

// Progress tracking commands
const progressCmd = program
  .command('progress')
  .description('Track provisioning progress');

progressCmd
  .command('list')
  .description('List provisioning progress records')
  .option('-s, --status <status>', 'Filter by status')
  .option('-t, --tenant <tenantId>', 'Filter by tenant ID')
  .action(async (options) => {
    try {
      const filters: any = {};
      if (options.status) filters.status = options.status;
      if (options.tenant) filters.tenantId = options.tenant;

      const progressList = await tenantProvisioningService.listProvisioningProgress(filters);
      
      console.log('\n📊 Provisioning Progress:');
      console.log('========================');
      
      if (progressList.length === 0) {
        console.log('No provisioning records found.');
        return;
      }

      progressList.forEach(progress => {
        const statusIcon = getStatusIcon(progress.status);
        console.log(`\n${statusIcon} ${progress.id}`);
        console.log(`   Status: ${progress.status}`);
        console.log(`   Current Step: ${progress.currentStep}`);
        console.log(`   Progress: ${progress.completedSteps}/${progress.totalSteps}`);
        if (progress.tenantId) {
          console.log(`   Tenant ID: ${progress.tenantId}`);
        }
        if (progress.startedAt) {
          console.log(`   Started: ${progress.startedAt}`);
        }
        if (progress.error) {
          console.log(`   Error: ${progress.error}`);
        }
      });
      
      console.log(`\nTotal: ${progressList.length} records\n`);
    } catch (error) {
      console.error('❌ Error listing progress:', error);
      process.exit(1);
    }
  });

progressCmd
  .command('show <progressId>')
  .description('Show detailed progress information')
  .action(async (progressId) => {
    try {
      const progress = await tenantProvisioningService.getProvisioningProgress(progressId);
      
      if (!progress) {
        console.log('❌ Progress record not found');
        process.exit(1);
      }

      const statusIcon = getStatusIcon(progress.status);
      
      console.log('\n📊 Provisioning Progress Details:');
      console.log('=================================');
      console.log(`${statusIcon} Status: ${progress.status}`);
      console.log(`ID: ${progress.id}`);
      if (progress.tenantId) {
        console.log(`Tenant ID: ${progress.tenantId}`);
      }
      if (progress.templateId) {
        console.log(`Template ID: ${progress.templateId}`);
      }
      console.log(`Current Step: ${progress.currentStep}`);
      console.log(`Progress: ${progress.completedSteps}/${progress.totalSteps}`);
      
      if (progress.startedAt) {
        console.log(`Started: ${progress.startedAt}`);
      }
      if (progress.completedAt) {
        console.log(`Completed: ${progress.completedAt}`);
      }
      if (progress.error) {
        console.log(`❌ Error: ${progress.error}`);
      }
      
      if (progress.warnings && progress.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        progress.warnings.forEach(warning => {
          console.log(`  - ${warning}`);
        });
      }
      
      if (progress.steps && progress.steps.length > 0) {
        console.log('\n📋 Steps:');
        progress.steps.forEach(step => {
          const stepIcon = getStatusIcon(step.status);
          console.log(`  ${stepIcon} ${step.name}`);
          console.log(`     Status: ${step.status}`);
          console.log(`     Description: ${step.description}`);
          if (step.error) {
            console.log(`     Error: ${step.error}`);
          }
          if (step.retryCount > 0) {
            console.log(`     Retries: ${step.retryCount}/${step.maxRetries}`);
          }
        });
      }
      
      console.log('');
    } catch (error) {
      console.error('❌ Error showing progress:', error);
      process.exit(1);
    }
  });

progressCmd
  .command('cancel <progressId>')
  .description('Cancel provisioning')
  .action(async (progressId) => {
    try {
      await tenantProvisioningService.cancelProvisioning(progressId);
      console.log('✅ Provisioning cancelled successfully');
    } catch (error) {
      console.error('❌ Error cancelling provisioning:', error);
      process.exit(1);
    }
  });

progressCmd
  .command('retry <progressId> <stepId>')
  .description('Retry failed step')
  .action(async (progressId, stepId) => {
    try {
      await tenantProvisioningService.retryFailedStep(progressId, stepId);
      console.log('✅ Step retry initiated successfully');
    } catch (error) {
      console.error('❌ Error retrying step:', error);
      process.exit(1);
    }
  });

// Deprovisioning commands
const deprovisionCmd = program
  .command('deprovision')
  .description('Deprovision tenants');

deprovisionCmd
  .command('tenant <tenantId>')
  .description('Deprovision tenant')
  .option('--preserve-audit-logs', 'Preserve audit logs')
  .option('--preserve-backups', 'Preserve backups')
  .option('--notify-users', 'Notify users about deprovisioning')
  .option('--grace-period <hours>', 'Grace period in hours', '0')
  .action(async (tenantId, options) => {
    try {
      // Get tenant info first
      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        console.log('❌ Tenant not found');
        process.exit(1);
      }

      console.log(`⚠️  WARNING: This will deprovision tenant "${tenant.name}" (${tenant.slug})`);
      console.log('This action cannot be undone!');
      
      // In a real CLI, you would prompt for confirmation here
      console.log('Proceeding with deprovisioning...');

      const deprovisionOptions = {
        preserveAuditLogs: options.preserveAuditLogs,
        preserveBackups: options.preserveBackups,
        notifyUsers: options.notifyUsers,
        gracePeriodHours: parseInt(options.gracePeriod)
      };

      const progress = await tenantProvisioningService.deprovisionTenant(tenantId, deprovisionOptions);
      
      console.log('✅ Deprovisioning started successfully!');
      console.log(`Progress ID: ${progress.id}`);
      console.log(`Status: ${progress.status}`);
      console.log(`\nUse 'tenant-provisioning progress show ${progress.id}' to track progress.`);
    } catch (error) {
      console.error('❌ Error starting deprovisioning:', error);
      process.exit(1);
    }
  });

// Utility functions
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'running': return '🔄';
    case 'pending': return '⏳';
    case 'cancelled': return '🚫';
    case 'skipped': return '⏭️';
    default: return '❓';
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Parse command line arguments
program.parse();

export default program;