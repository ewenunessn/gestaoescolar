/**
 * Tenant Migration Controller
 * API endpoints for managing tenant migrations
 */

import { Request, Response } from 'express';
import { tenantMigrationService } from '../services/tenantMigrationService';
import { generateMigrationFromTemplate, generateBulkTenantIdMigration, generateBulkRLSMigration } from '../services/migrationTemplates';

export class TenantMigrationController {
  
  /**
   * Get migration status for tenant or all migrations
   */
  async getMigrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      
      const statuses = await tenantMigrationService.getMigrationStatus(tenantId as string);
      
      res.json({
        success: true,
        data: statuses
      });
    } catch (error: any) {
      console.error('Error getting migration status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(req: Request, res: Response): Promise<void> {
    try {
      const { migrationId } = req.body;
      
      let results;
      
      if (migrationId) {
        // Run specific migration
        const result = await tenantMigrationService.runMigration(migrationId);
        results = [result];
      } else {
        // Run all pending migrations
        results = await tenantMigrationService.runAllPendingMigrations(tenantId);
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        success: failed === 0,
        data: {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        }
      });
    } catch (error: any) {
      console.error('Error running migrations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(req: Request, res: Response): Promise<void> {
    try {
      const { migrationId, toMigrationId } = req.body;
      
      let results;
      
      if (migrationId) {
        // Rollback specific migration
        const result = await tenantMigrationService.rollbackMigration(migrationId);
        results = [result];
      } else if (tenantId) {
        // Rollback tenant migrations
        results = await tenantMigrationService.rollbackTenantMigrations(toMigrationId);
      } else {
        res.status(400).json({
          success: false,
          error: 'Either migrationId or tenantId must be provided'
        });
        return;
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        success: failed === 0,
        data: {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        }
      });
    } catch (error: any) {
      console.error('Error rolling back migrations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create new migration
   */
  async createMigration(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, upSql, downSql, tenantSpecific, dependencies } = req.body;
      
      if (!name || !description || !upSql || !downSql) {
        res.status(400).json({
          success: false,
          error: 'name, description, upSql, and downSql are required'
        });
        return;
      }
      
      const migration = await tenantMigrationService.createMigration({
        name,
        description,
        upSql,
        downSql,
        tenantSpecific: tenantSpecific || false,
        dependencies: dependencies || []
      });
      
      res.json({
        success: true,
        data: migration
      });
    } catch (error: any) {
      console.error('Error creating migration:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Generate migration from template
   */
  async generateFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { template, params, name, description } = req.body;
      
      if (!template || !params) {
        res.status(400).json({
          success: false,
          error: 'template and params are required'
        });
        return;
      }
      
      let upSql: string;
      let downSql: string;
      
      // Handle special bulk templates
      if (template === 'bulk-tenant-id') {
        const result = generateBulkTenantIdMigration(params.tableNames, params.defaultTenantId);
        upSql = result.upSql;
        downSql = result.downSql;
      } else if (template === 'bulk-rls') {
        const result = generateBulkRLSMigration(params.tableNames);
        upSql = result.upSql;
        downSql = result.downSql;
      } else {
        // Use regular template
        const result = generateMigrationFromTemplate(template, params);
        upSql = result.upSql;
        downSql = result.downSql;
      }
      
      // Create migration if name and description provided
      if (name && description) {
        const migration = await tenantMigrationService.createMigration({
          name,
          description,
          upSql,
          downSql,
          tenantSpecific: params.tenantSpecific || false,
          dependencies: params.dependencies || []
        });
        
        res.json({
          success: true,
          data: {
            migration,
            upSql,
            downSql
          }
        });
      } else {
        // Just return generated SQL
        res.json({
          success: true,
          data: {
            upSql,
            downSql
          }
        });
      }
    } catch (error: any) {
      console.error('Error generating migration from template:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get migration definition
   */
  async getMigrationDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { migrationId } = req.params;
      
      const migration = await tenantMigrationService.getMigrationDefinition(migrationId);
      
      if (!migration) {
        res.status(404).json({
          success: false,
          error: 'Migration not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: migration
      });
    } catch (error: any) {
      console.error('Error getting migration definition:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Run tenant-specific migrations
   */
  async runTenantMigrations(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      
      const results = await tenantMigrationService.runTenantMigrations(tenantId);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        success: failed === 0,
        data: {
          results,
          summary: {
            total: results.length,
            successful,
            failed
          }
        }
      });
    } catch (error: any) {
      console.error('Error running tenant migrations:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Recover failed migration
   */
  async recoverMigration(req: Request, res: Response): Promise<void> {
    try {
      const { migrationId } = req.body;
      
      if (!migrationId) {
        res.status(400).json({
          success: false,
          error: 'migrationId is required'
        });
        return;
      }
      
      const result = await tenantMigrationService.recoverFailedMigration(migrationId);
      
      res.json({
        success: result.success,
        data: result
      });
    } catch (error: any) {
      console.error('Error recovering migration:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Validate migration integrity
   */
  async validateIntegrity(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      
      const isValid = await tenantMigrationService.validateMigrationIntegrity(tenantId as string);
      
      res.json({
        success: true,
        data: {
          valid: isValid: tenantId || null
        }
      });
    } catch (error: any) {
      console.error('Error validating migration integrity:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get available migration templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const templates = [
        {
          name: 'addTenantId',
          description: 'Add tenant_id column to existing table',
          parameters: [
            { name: 'tableName', type: 'string', required: true },
            { name: 'defaultTenantId', type: 'string', required: false },
            { name: 'nullable', type: 'boolean', required: false },
            { name: 'addIndex', type: 'boolean', required: false },
            { name: 'addForeignKey', type: 'boolean', required: false }
          ]
        },
        {
          name: 'enableRLS',
          description: 'Enable Row Level Security with tenant isolation',
          parameters: [
            { name: 'tableName', type: 'string', required: true },
            { name: 'policyName', type: 'string', required: false },
            { name: 'customPolicy', type: 'string', required: false }
          ]
        },
        {
          name: 'createTenantTable',
          description: 'Create new table with tenant_id column',
          parameters: [
            { name: 'tableName', type: 'string', required: true },
            { name: 'columns', type: 'array', required: true },
            { name: 'indexes', type: 'array', required: false }
          ]
        },
        {
          name: 'bulk-tenant-id',
          description: 'Add tenant_id to multiple tables',
          parameters: [
            { name: 'tableNames', type: 'array', required: true },
            { name: 'defaultTenantId', type: 'string', required: false }
          ]
        },
        {
          name: 'bulk-rls',
          description: 'Enable RLS on multiple tables',
          parameters: [
            { name: 'tableNames', type: 'array', required: true }
          ]
        }
      ];
      
      res.json({
        success: true,
        data: templates
      });
    } catch (error: any) {
      console.error('Error getting templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const tenantMigrationController = new TenantMigrationController();