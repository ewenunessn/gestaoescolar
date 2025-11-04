/**
 * Tenant Provisioning Automation Service
 * Handles automated tenant provisioning workflows with templates, progress tracking, and error recovery
 */

import { tenantService } from './tenantService';
import { tenantMigrationService } from './tenantMigrationService';
import { tenantConfigurationService } from './tenantConfigurationService';
import { 
  Tenant, 
  TenantProvisioningRequest, 
  TenantProvisioningResult,
  CreateTenantInput,
  TenantSettings,
  TenantLimits
} from '../types/tenant';
const db = require('../database');

export interface TenantTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'school_district' | 'municipality' | 'enterprise' | 'custom';
  settings: Partial<TenantSettings>;
  limits: Partial<TenantLimits>;
  initialData?: {
    schools?: any[];
    products?: any[];
    users?: any[];
    configurations?: any[];
  };
  migrations?: string[];
  postProvisioningSteps?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvisioningProgress {
  id: string;
  tenantId?: string;
  templateId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  steps: ProvisioningStep[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  warnings: string[];
  metadata?: any;
}

export interface ProvisioningStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  retryCount: number;
  maxRetries: number;
}

export interface DeprovisioningOptions {
  preserveAuditLogs?: boolean;
  preserveBackups?: boolean;
  notifyUsers?: boolean;
  gracePeriodHours?: number;
}

export class TenantProvisioningService {
  
  constructor() {
    this.initializeProvisioningTables();
  }

  /**
   * Initialize provisioning tracking tables
   */
  private async initializeProvisioningTables(): Promise<void> {
    try {
      // Create tenant templates table
      await db.query(`
        CREATE TABLE IF NOT EXISTS tenant_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50) DEFAULT 'basic',
          settings JSONB DEFAULT '{}',
          limits JSONB DEFAULT '{}',
          initial_data JSONB DEFAULT '{}',
          migrations JSONB DEFAULT '[]',
          post_provisioning_steps JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name)
        )
      `);

      // Create provisioning progress table
      await db.query(`
        CREATE TABLE IF NOT EXISTS tenant_provisioning_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          template_id UUID REFERENCES tenant_templates(id) ON DELETE SET NULL,
          status VARCHAR(20) DEFAULT 'pending',
          current_step VARCHAR(255),
          total_steps INTEGER DEFAULT 0,
          completed_steps INTEGER DEFAULT 0,
          steps JSONB DEFAULT '[]',
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          error TEXT,
          warnings JSONB DEFAULT '[]',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_provisioning_progress_tenant 
        ON tenant_provisioning_progress(tenant_id, status)
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_provisioning_progress_template 
        ON tenant_provisioning_progress(template_id, status)
      `);

      // Create default templates
      await this.createDefaultTemplates();

    } catch (error) {
      console.error('Error initializing provisioning tables:', error);
      throw error;
    }
  }

  /**
   * Create default tenant templates
   */
  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        name: 'Basic School System',
        description: 'Basic template for small schools with essential features',
        category: 'basic' as const,
        settings: {
          features: {
            inventory: true,
            contracts: true,
            deliveries: true,
            reports: true,
            mobile: true,
            analytics: false
          },
          branding: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e'
          },
          notifications: {
            email: true,
            sms: false,
            push: true
          }
        },
        limits: {
          maxUsers: 50,
          maxSchools: 10,
          maxProducts: 500,
          storageLimit: 512,
          apiRateLimit: 60,
          maxContracts: 20,
          maxOrders: 500
        }
      },
      {
        name: 'School District',
        description: 'Template for school districts with multiple schools',
        category: 'school_district' as const,
        settings: {
          features: {
            inventory: true,
            contracts: true,
            deliveries: true,
            reports: true,
            mobile: true,
            analytics: true
          },
          branding: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e'
          },
          notifications: {
            email: true,
            sms: true,
            push: true
          }
        },
        limits: {
          maxUsers: 200,
          maxSchools: 50,
          maxProducts: 2000,
          storageLimit: 2048,
          apiRateLimit: 200,
          maxContracts: 100,
          maxOrders: 2000
        }
      },
      {
        name: 'Municipality',
        description: 'Template for municipal education systems',
        category: 'municipality' as const,
        settings: {
          features: {
            inventory: true,
            contracts: true,
            deliveries: true,
            reports: true,
            mobile: true,
            analytics: true
          },
          branding: {
            primaryColor: '#1976d2',
            secondaryColor: '#dc004e'
          },
          notifications: {
            email: true,
            sms: true,
            push: true
          },
          integrations: {
            whatsapp: true,
            email: true,
            sms: true
          }
        },
        limits: {
          maxUsers: 500,
          maxSchools: 200,
          maxProducts: 5000,
          storageLimit: 5120,
          apiRateLimit: 500,
          maxContracts: 200,
          maxOrders: 5000
        }
      }
    ];

    for (const template of defaultTemplates) {
      try {
        const existing = await db.query(
          'SELECT id FROM tenant_templates WHERE name = $1',
          [template.name]
        );

        if (existing.rows.length === 0) {
          await db.query(`
            INSERT INTO tenant_templates (name, description, category, settings, limits)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            template.name,
            template.description,
            template.category,
            JSON.stringify(template.settings),
            JSON.stringify(template.limits)
          ]);
        }
      } catch (error) {
        console.warn(`Failed to create default template ${template.name}:`, error);
      }
    }
  }

  /**
   * Create a new tenant template
   */
  async createTemplate(template: Omit<TenantTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<TenantTemplate> {
    try {
      const result = await db.query(`
        INSERT INTO tenant_templates (
          name, description, category, settings, limits, 
          initial_data, migrations, post_provisioning_steps
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING 
          id,
          name,
          description,
          category,
          settings,
          limits,
          initial_data as "initialData",
          migrations,
          post_provisioning_steps as "postProvisioningSteps",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [
        template.name,
        template.description,
        template.category,
        JSON.stringify(template.settings || {}),
        JSON.stringify(template.limits || {}),
        JSON.stringify(template.initialData || {}),
        JSON.stringify(template.migrations || []),
        JSON.stringify(template.postProvisioningSteps || [])
      ]);

      return this.mapTemplateFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating tenant template:', error);
      throw error;
    }
  }

  /**
   * Get a tenant template by ID
   */
  async getTemplate(id: string): Promise<TenantTemplate | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          name,
          description,
          category,
          settings,
          limits,
          initial_data as "initialData",
          migrations,
          post_provisioning_steps as "postProvisioningSteps",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_templates
        WHERE id = $1
      `, [id]);

      return result.rows.length > 0 ? this.mapTemplateFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting tenant template:', error);
      return null;
    }
  }

  /**
   * List tenant templates
   */
  async listTemplates(category?: string): Promise<TenantTemplate[]> {
    try {
      let query = `
        SELECT 
          id,
          name,
          description,
          category,
          settings,
          limits,
          initial_data as "initialData",
          migrations,
          post_provisioning_steps as "postProvisioningSteps",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_templates
      `;

      const params: any[] = [];

      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }

      query += ' ORDER BY category, name';

      const result = await db.query(query, params);
      return result.rows.map(row => this.mapTemplateFromDb(row));
    } catch (error) {
      console.error('Error listing tenant templates:', error);
      return [];
    }
  }

  /**
   * Update an existing tenant template
   */
  async updateTemplate(id: string, updates: Partial<TenantTemplate>): Promise<TenantTemplate> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(updates.description);
      }
      if (updates.category !== undefined) {
        updateFields.push(`category = $${paramIndex++}`);
        updateValues.push(updates.category);
      }
      if (updates.settings !== undefined) {
        updateFields.push(`settings = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.settings));
      }
      if (updates.limits !== undefined) {
        updateFields.push(`limits = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updates.limits));
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await db.query(`
        UPDATE tenant_templates SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id,
          name,
          description,
          category,
          settings,
          limits,
          initial_data as "initialData",
          migrations,
          post_provisioning_steps as "postProvisioningSteps",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      return this.mapTemplateFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error updating tenant template:', error);
      throw error;
    }
  }

  /**
   * Delete a tenant template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      const result = await db.query('DELETE FROM tenant_templates WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }
    } catch (error) {
      console.error('Error deleting tenant template:', error);
      throw error;
    }
  }

  /**
   * Provision tenant from template
   */
  async provisionFromTemplate(
    templateId: string, 
    tenantData: CreateTenantInput, 
    adminUser: any
  ): Promise<ProvisioningProgress> {
    try {
      // Get template
      const template = await this.getTemplate(templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Create provisioning progress record
      const progress = await this.createProvisioningProgress({
        templateId,
        status: 'pending',
        currentStep: 'Initializing',
        totalSteps: 0,
        completedSteps: 0,
        steps: [],
        warnings: []
      });

      // Start provisioning in background (simplified for now)
      setTimeout(async () => {
        try {
          await this.executeProvisioningWorkflow(progress.id, template, tenantData, adminUser);
        } catch (error: any) {
          console.error('Provisioning workflow failed:', error);
          await this.updateProvisioningProgress(progress.id, {
            status: 'failed',
            error: error.message
          });
        }
      }, 100);

      return progress;
    } catch (error) {
      console.error('Error starting provisioning from template:', error);
      throw error;
    }
  }

  /**
   * Provision tenant with custom configuration
   */
  async provisionCustom(request: TenantProvisioningRequest): Promise<ProvisioningProgress> {
    try {
      // Create provisioning progress record
      const progress = await this.createProvisioningProgress({
        status: 'pending',
        currentStep: 'Initializing',
        totalSteps: 0,
        completedSteps: 0,
        steps: [],
        warnings: []
      });

      // Start provisioning in background (simplified for now)
      setTimeout(async () => {
        try {
          const result = await tenantService.provisionTenant(request);
          
          if (result.success) {
            await this.updateProvisioningProgress(progress.id, {
              status: 'completed',
              tenantId: result.tenant?.id,
              completedAt: new Date(),
              warnings: result.warnings || []
            });
          } else {
            await this.updateProvisioningProgress(progress.id, {
              status: 'failed',
              error: result.errors?.join(', ') || 'Unknown error',
              completedAt: new Date(),
              warnings: result.warnings || []
            });
          }
        } catch (error: any) {
          await this.updateProvisioningProgress(progress.id, {
            status: 'failed',
            error: error.message,
            completedAt: new Date()
          });
        }
      }, 100);

      return progress;
    } catch (error) {
      console.error('Error starting custom provisioning:', error);
      throw error;
    }
  }

  /**
   * Execute provisioning workflow from template (simplified implementation)
   */
  private async executeProvisioningWorkflow(
    progressId: string,
    template: TenantTemplate,
    tenantData: CreateTenantInput,
    adminUser: any
  ): Promise<void> {
    try {
      // Update status to running
      await this.updateProvisioningProgress(progressId, {
        status: 'running',
        startedAt: new Date(),
        currentStep: 'Creating tenant'
      });

      // Merge template settings with tenant data
      const mergedTenantData = {
        ...tenantData,
        settings: { ...template.settings, ...tenantData.settings },
        limits: { ...template.limits, ...tenantData.limits }
      };

      // Create tenant
      const tenant = await tenantService.createTenant(mergedTenantData);
      
      // Update progress with tenant ID
      await this.updateProvisioningProgress(progressId, { 
        tenantId: tenant.id,
        currentStep: 'Creating admin user'
      });

      // Create admin user (simplified)
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminUser.senha, 10);

      const userResult = await db.query(`
        INSERT INTO usuarios (nome, email, senha, tipo, ativo, tenant_id)
        VALUES ($1, $2, $3, 'admin', true, $4)
        RETURNING id
      `, [adminUser.nome, adminUser.email, hashedPassword, tenant.id]);

      const userId = userResult.rows[0].id;

      await tenantService.addTenantUser({
        tenantId: tenant.id,
        userId,
        role: 'tenant_admin'
      });

      // Mark as completed
      await this.updateProvisioningProgress(progressId, {
        status: 'completed',
        completedAt: new Date(),
        currentStep: 'Completed',
        completedSteps: 1,
        totalSteps: 1
      });

    } catch (error: any) {
      console.error('Provisioning workflow failed:', error);
      
      await this.updateProvisioningProgress(progressId, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });

      throw error;
    }
  }

  /**
   * Get provisioning progress
   */
  async getProvisioningProgress(progressId: string): Promise<ProvisioningProgress | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          tenant_id as "tenantId",
          template_id as "templateId",
          status,
          current_step as "currentStep",
          total_steps as "totalSteps",
          completed_steps as "completedSteps",
          steps,
          started_at as "startedAt",
          completed_at as "completedAt",
          error,
          warnings,
          metadata
        FROM tenant_provisioning_progress
        WHERE id = $1
      `, [progressId]);

      return result.rows.length > 0 ? this.mapProgressFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting provisioning progress:', error);
      return null;
    }
  }

  /**
   * List provisioning progress records
   */
  async listProvisioningProgress(filters: any = {}): Promise<ProvisioningProgress[]> {
    try {
      let query = `
        SELECT 
          id,
          tenant_id as "tenantId",
          template_id as "templateId",
          status,
          current_step as "currentStep",
          total_steps as "totalSteps",
          completed_steps as "completedSteps",
          steps,
          started_at as "startedAt",
          completed_at as "completedAt",
          error,
          warnings,
          metadata
        FROM tenant_provisioning_progress
      `;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }

      if (filters.tenantId) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        params.push(filters.tenantId);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      return result.rows.map(row => this.mapProgressFromDb(row));
    } catch (error) {
      console.error('Error listing provisioning progress:', error);
      return [];
    }
  }

  /**
   * Cancel provisioning
   */
  async cancelProvisioning(progressId: string): Promise<void> {
    try {
      await this.updateProvisioningProgress(progressId, {
        status: 'cancelled',
        completedAt: new Date()
      });
    } catch (error) {
      console.error('Error cancelling provisioning:', error);
      throw error;
    }
  }

  /**
   * Retry failed step (simplified implementation)
   */
  async retryFailedStep(progressId: string, stepId: string): Promise<void> {
    try {
      const progress = await this.getProvisioningProgress(progressId);
      if (!progress) {
        throw new Error('Provisioning progress not found');
      }

      // Reset progress status if it was failed
      if (progress.status === 'failed') {
        await this.updateProvisioningProgress(progressId, {
          status: 'running',
          error: undefined
        });
      }
    } catch (error) {
      console.error('Error retrying failed step:', error);
      throw error;
    }
  }

  /**
   * Deprovision tenant (simplified implementation)
   */
  async deprovisionTenant(tenantId: string, options: DeprovisioningOptions = {}): Promise<ProvisioningProgress> {
    try {
      // Create deprovisioning progress record
      const progress = await this.createProvisioningProgress({
        tenantId,
        status: 'pending',
        currentStep: 'Initializing Deprovisioning',
        totalSteps: 1,
        completedSteps: 0,
        steps: [],
        warnings: [],
        metadata: { type: 'deprovisioning', options }
      });

      // Start deprovisioning in background (simplified)
      setTimeout(async () => {
        try {
          await this.updateProvisioningProgress(progress.id, {
            status: 'running',
            startedAt: new Date(),
            currentStep: 'Removing tenant data'
          });

          // Remove tenant data
          await tenantService.deprovisionTenant(tenantId);

          await this.updateProvisioningProgress(progress.id, {
            status: 'completed',
            completedAt: new Date(),
            completedSteps: 1
          });
        } catch (error: any) {
          await this.updateProvisioningProgress(progress.id, {
            status: 'failed',
            error: error.message,
            completedAt: new Date()
          });
        }
      }, 100);

      return progress;
    } catch (error) {
      console.error('Error starting deprovisioning:', error);
      throw error;
    }
  }

  /**
   * Schedule deprovisioning (placeholder implementation)
   */
  async scheduleDeprovisioning(
    tenantId: string, 
    scheduledAt: Date, 
    options: DeprovisioningOptions = {}
  ): Promise<void> {
    try {
      // Create scheduled deprovisioning record
      await db.query(`
        INSERT INTO tenant_provisioning_progress (
          tenant_id, status, current_step, metadata
        ) VALUES ($1, 'pending', 'Scheduled for Deprovisioning', $2)
      `, [
        tenantId,
        JSON.stringify({
          type: 'scheduled_deprovisioning',
          scheduledAt: scheduledAt.toISOString(),
          options
        })
      ]);

      console.log(`Deprovisioning scheduled for tenant ${tenantId} at ${scheduledAt}`);
    } catch (error) {
      console.error('Error scheduling deprovisioning:', error);
      throw error;
    }
  }

  /**
   * Recover failed provisioning (simplified implementation)
   */
  async recoverFailedProvisioning(progressId: string): Promise<ProvisioningProgress> {
    try {
      const progress = await this.getProvisioningProgress(progressId);
      if (!progress) {
        throw new Error('Provisioning progress not found');
      }

      if (progress.status !== 'failed') {
        throw new Error('Provisioning is not in failed state');
      }

      await this.updateProvisioningProgress(progressId, {
        status: 'running',
        error: undefined
      });

      return await this.getProvisioningProgress(progressId) as ProvisioningProgress;
    } catch (error) {
      console.error('Error recovering failed provisioning:', error);
      throw error;
    }
  }

  /**
   * Cleanup failed provisioning
   */
  async cleanupFailedProvisioning(progressId: string): Promise<void> {
    try {
      const progress = await this.getProvisioningProgress(progressId);
      if (!progress) {
        throw new Error('Provisioning progress not found');
      }

      // If tenant was created, remove it
      if (progress.tenantId) {
        try {
          await tenantService.deprovisionTenant(progress.tenantId);
        } catch (error) {
          console.warn('Failed to cleanup tenant during provisioning cleanup:', error);
        }
      }

      // Mark progress as cleaned up
      await this.updateProvisioningProgress(progressId, {
        status: 'cancelled',
        error: 'Cleaned up after failure',
        completedAt: new Date()
      });
    } catch (error) {
      console.error('Error cleaning up failed provisioning:', error);
      throw error;
    }
  }

  // Helper methods

  private async createProvisioningProgress(data: Partial<ProvisioningProgress>): Promise<ProvisioningProgress> {
    const result = await db.query(`
      INSERT INTO tenant_provisioning_progress (
        tenant_id, template_id, status, current_step, total_steps, 
        completed_steps, steps, started_at, warnings, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        tenant_id as "tenantId",
        template_id as "templateId",
        status,
        current_step as "currentStep",
        total_steps as "totalSteps",
        completed_steps as "completedSteps",
        steps,
        started_at as "startedAt",
        completed_at as "completedAt",
        error,
        warnings,
        metadata
    `, [
      data.tenantId || null,
      data.templateId || null,
      data.status || 'pending',
      data.currentStep || '',
      data.totalSteps || 0,
      data.completedSteps || 0,
      JSON.stringify(data.steps || []),
      data.startedAt || null,
      JSON.stringify(data.warnings || []),
      JSON.stringify(data.metadata || {})
    ]);

    return this.mapProgressFromDb(result.rows[0]);
  }

  private async updateProvisioningProgress(progressId: string, updates: Partial<ProvisioningProgress>): Promise<void> {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updates.tenantId !== undefined) {
      updateFields.push(`tenant_id = $${paramIndex++}`);
      updateValues.push(updates.tenantId);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(updates.status);
    }
    if (updates.currentStep !== undefined) {
      updateFields.push(`current_step = $${paramIndex++}`);
      updateValues.push(updates.currentStep);
    }
    if (updates.totalSteps !== undefined) {
      updateFields.push(`total_steps = $${paramIndex++}`);
      updateValues.push(updates.totalSteps);
    }
    if (updates.completedSteps !== undefined) {
      updateFields.push(`completed_steps = $${paramIndex++}`);
      updateValues.push(updates.completedSteps);
    }
    if (updates.startedAt !== undefined) {
      updateFields.push(`started_at = $${paramIndex++}`);
      updateValues.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      updateFields.push(`completed_at = $${paramIndex++}`);
      updateValues.push(updates.completedAt);
    }
    if (updates.error !== undefined) {
      updateFields.push(`error = $${paramIndex++}`);
      updateValues.push(updates.error);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(progressId);

    await db.query(`
      UPDATE tenant_provisioning_progress 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateValues);
  }

  private mapTemplateFromDb(row: any): TenantTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      settings: row.settings || {},
      limits: row.limits || {},
      initialData: row.initialData || {},
      migrations: row.migrations || [],
      postProvisioningSteps: row.postProvisioningSteps || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  private mapProgressFromDb(row: any): ProvisioningProgress {
    return {
      id: row.id,
      tenantId: row.tenantId,
      templateId: row.templateId,
      status: row.status,
      currentStep: row.currentStep,
      totalSteps: row.totalSteps,
      completedSteps: row.completedSteps,
      steps: row.steps || [],
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      error: row.error,
      warnings: row.warnings || [],
      metadata: row.metadata || {}
    };
  }
}

// Singleton instance
export const tenantProvisioningService = new TenantProvisioningService();