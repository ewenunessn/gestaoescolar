/**
 * Enhanced tenant configuration service
 * Handles configuration management with validation, inheritance, and versioning
 */

import {
  TenantConfigurationVersion,
  ConfigurationChangeRequest,
  ConfigurationChange,
  ConfigurationRollbackRequest,
  TenantConfigurationTemplate,
  ConfigurationValidationResult
} from '../types/tenantConfiguration';
import { TenantConfiguration, CreateTenantConfigurationInput, UpdateTenantConfigurationInput } from '../types/tenant';
import { tenantConfigurationValidator } from './tenantConfigurationValidator';
import { tenantConfigurationInheritance } from './tenantConfigurationInheritance';

const db = require('../database');

export interface TenantConfigurationServiceInterface {
  // Configuration management
  getTenantConfiguration(tenantId: string, includeInheritance?: boolean): Promise<Record<string, any>>;
  updateTenantConfiguration(tenantId: string, configurations: Record<string, any>, options?: {
    description?: string;
    userId?: number;
    validateOnly?: boolean;
  }): Promise<ConfigurationValidationResult | TenantConfigurationVersion>;
  
  // Versioning
  getConfigurationVersions(tenantId: string): Promise<TenantConfigurationVersion[]>;
  getConfigurationVersion(tenantId: string, version: number): Promise<TenantConfigurationVersion | null>;
  rollbackConfiguration(request: ConfigurationRollbackRequest): Promise<TenantConfigurationVersion>;
  
  // Change management
  requestConfigurationChange(request: ConfigurationChangeRequest): Promise<string>;
  approveConfigurationChange(requestId: string, approverId: number): Promise<void>;
  rejectConfigurationChange(requestId: string, approverId: number, reason: string): Promise<void>;
  
  // Templates
  getConfigurationTemplates(tenantType?: string): Promise<TenantConfigurationTemplate[]>;
  applyTemplate(tenantId: string, templateId: string, userId?: number): Promise<TenantConfigurationVersion>;
  
  // Validation
  validateConfiguration(configurations: Record<string, any>, tenantId?: string): Promise<ConfigurationValidationResult>;
}

export class TenantConfigurationService implements TenantConfigurationServiceInterface {

  /**
   * Get tenant configuration with optional inheritance
   */
  async getTenantConfiguration(tenantId: string, includeInheritance = true): Promise<Record<string, any>> {
    try {
      // Get current configuration from database
      const result = await db.query(`
        SELECT category, key, value
        FROM tenant_configurations
        WHERE tenant_id = $1
        ORDER BY category, key
      `, [tenantId]);

      // Build configuration object
      const configuration: Record<string, any> = {};
      for (const row of result.rows) {
        if (!configuration[row.category]) {
          configuration[row.category] = {};
        }
        configuration[row.category][row.key] = JSON.parse(row.value);
      }

      // Apply inheritance if requested
      if (includeInheritance) {
        return await tenantConfigurationInheritance.getInheritedConfiguration(
          tenantId,
          configuration,
          { includeDefaults: true }
        );
      }

      return configuration;
    } catch (error) {
      console.error('Error getting tenant configuration:', error);
      throw error;
    }
  }

  /**
   * Update tenant configuration with validation and versioning
   */
  async updateTenantConfiguration(
    tenantId: string,
    configurations: Record<string, any>,
    options: {
      description?: string;
      userId?: number;
      validateOnly?: boolean;
    } = {}
  ): Promise<ConfigurationValidationResult | TenantConfigurationVersion> {
    try {
      // Get current configuration
      const currentConfiguration = await this.getTenantConfiguration(tenantId, false);

      // Validate new configuration
      const validationResult = await this.validateConfiguration(configurations, tenantId);
      
      if (!validationResult.isValid || options.validateOnly) {
        return validationResult;
      }

      // Merge with current configuration
      const mergedConfiguration = { ...currentConfiguration };
      for (const [category, categoryConfig] of Object.entries(configurations)) {
        if (typeof categoryConfig === 'object' && categoryConfig !== null) {
          mergedConfiguration[category] = { ...mergedConfiguration[category], ...categoryConfig };
        } else {
          mergedConfiguration[category] = categoryConfig;
        }
      }

      // Create new version
      const version = await this.createConfigurationVersion(
        tenantId,
        mergedConfiguration,
        options.description,
        options.userId
      );

      return version;
    } catch (error) {
      console.error('Error updating tenant configuration:', error);
      throw error;
    }
  }

  /**
   * Create a new configuration version
   */
  private async createConfigurationVersion(
    tenantId: string,
    configurations: Record<string, any>,
    description?: string,
    userId?: number
  ): Promise<TenantConfigurationVersion> {
    try {
      const result = await db.query(`
        SELECT create_tenant_configuration_version($1, $2, $3, $4) as version
      `, [tenantId, JSON.stringify(configurations), description, userId]);

      const version = result.rows[0].version;

      // Get the created version
      const versionResult = await db.query(`
        SELECT 
          id,
          tenant_id as "tenantId",
          version,
          configurations,
          description,
          created_by as "createdBy",
          created_at as "createdAt",
          is_active as "isActive"
        FROM tenant_configuration_versions
        WHERE tenant_id = $1 AND version = $2
      `, [tenantId, version]);

      const versionData = versionResult.rows[0];
      return {
        ...versionData,
        configurations: versionData.configurations
      };
    } catch (error) {
      console.error('Error creating configuration version:', error);
      throw error;
    }
  }

  /**
   * Get configuration versions for a tenant
   */
  async getConfigurationVersions(tenantId: string): Promise<TenantConfigurationVersion[]> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          tenant_id as "tenantId",
          version,
          configurations,
          description,
          created_by as "createdBy",
          created_at as "createdAt",
          is_active as "isActive"
        FROM tenant_configuration_versions
        WHERE tenant_id = $1
        ORDER BY version DESC
      `, [tenantId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting configuration versions:', error);
      return [];
    }
  }

  /**
   * Get specific configuration version
   */
  async getConfigurationVersion(tenantId: string, version: number): Promise<TenantConfigurationVersion | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          tenant_id as "tenantId",
          version,
          configurations,
          description,
          created_by as "createdBy",
          created_at as "createdAt",
          is_active as "isActive"
        FROM tenant_configuration_versions
        WHERE tenant_id = $1 AND version = $2
      `, [tenantId, version]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting configuration version:', error);
      return null;
    }
  }

  /**
   * Rollback configuration to a specific version
   */
  async rollbackConfiguration(request: ConfigurationRollbackRequest): Promise<TenantConfigurationVersion> {
    try {
      // Verify target version exists
      const targetVersion = await this.getConfigurationVersion(request.tenantId, request.targetVersion);
      if (!targetVersion) {
        throw new Error(`Version ${request.targetVersion} not found for tenant ${request.tenantId}`);
      }

      // Execute rollback
      await db.query(`
        SELECT rollback_tenant_configuration($1, $2, $3, $4)
      `, [request.tenantId, request.targetVersion, request.reason, request.requestedBy]);

      // Get the new version created by rollback
      const versions = await this.getConfigurationVersions(request.tenantId);
      return versions[0]; // Latest version (the rollback)
    } catch (error) {
      console.error('Error rolling back configuration:', error);
      throw error;
    }
  }

  /**
   * Request configuration change (for approval workflow)
   */
  async requestConfigurationChange(request: ConfigurationChangeRequest): Promise<string> {
    try {
      // Validate changes
      const currentConfiguration = await this.getTenantConfiguration(request.tenantId, false);
      const validationResult = await tenantConfigurationValidator.validateChanges(
        request.changes,
        currentConfiguration
      );

      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Create change request
      const result = await db.query(`
        INSERT INTO tenant_configuration_change_requests (
          tenant_id, requested_by, changes, description, auto_apply
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        request.tenantId,
        request.requestedBy,
        JSON.stringify(request.changes),
        request.description,
        request.autoApply || false
      ]);

      const requestId = result.rows[0].id;

      // Auto-apply if requested
      if (request.autoApply) {
        await this.applyConfigurationChanges(requestId);
      }

      return requestId;
    } catch (error) {
      console.error('Error requesting configuration change:', error);
      throw error;
    }
  }

  /**
   * Approve configuration change request
   */
  async approveConfigurationChange(requestId: string, approverId: number): Promise<void> {
    try {
      // Update request status
      await db.query(`
        UPDATE tenant_configuration_change_requests
        SET status = 'approved', approved_by = $1, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'pending'
      `, [approverId, requestId]);

      // Apply changes
      await this.applyConfigurationChanges(requestId);
    } catch (error) {
      console.error('Error approving configuration change:', error);
      throw error;
    }
  }

  /**
   * Reject configuration change request
   */
  async rejectConfigurationChange(requestId: string, approverId: number, reason: string): Promise<void> {
    try {
      await db.query(`
        UPDATE tenant_configuration_change_requests
        SET status = 'rejected', approved_by = $1, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $2
        WHERE id = $3 AND status = 'pending'
      `, [approverId, reason, requestId]);
    } catch (error) {
      console.error('Error rejecting configuration change:', error);
      throw error;
    }
  }

  /**
   * Apply configuration changes from a request
   */
  private async applyConfigurationChanges(requestId: string): Promise<void> {
    try {
      // Get request details
      const requestResult = await db.query(`
        SELECT tenant_id, changes, requested_by, description
        FROM tenant_configuration_change_requests
        WHERE id = $1
      `, [requestId]);

      if (requestResult.rows.length === 0) {
        throw new Error('Configuration change request not found');
      }

      const request = requestResult.rows[0];
      const changes: ConfigurationChange[] = request.changes;

      // Get current configuration
      const currentConfiguration = await this.getTenantConfiguration(request.tenant_id, false);

      // Apply changes
      const newConfiguration = { ...currentConfiguration };
      for (const change of changes) {
        if (!newConfiguration[change.category]) {
          newConfiguration[change.category] = {};
        }

        switch (change.operation) {
          case 'create':
          case 'update':
            newConfiguration[change.category][change.key] = change.newValue;
            break;
          case 'delete':
            delete newConfiguration[change.category][change.key];
            break;
        }
      }

      // Create new version
      await this.createConfigurationVersion(
        request.tenant_id,
        newConfiguration,
        request.description || 'Applied configuration changes',
        request.requested_by
      );

      // Update request status
      await db.query(`
        UPDATE tenant_configuration_change_requests
        SET status = 'applied', applied_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [requestId]);
    } catch (error) {
      console.error('Error applying configuration changes:', error);
      throw error;
    }
  }

  /**
   * Get configuration templates
   */
  async getConfigurationTemplates(tenantType?: string): Promise<TenantConfigurationTemplate[]> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (tenantType) {
        whereClause += ' AND (is_default = true OR $1 = ANY(target_tenant_types))';
        params.push(tenantType);
      }

      const result = await db.query(`
        SELECT 
          id,
          name,
          description,
          configurations,
          target_tenant_types as "targetTenantTypes",
          is_default as "isDefault",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_configuration_templates
        ${whereClause}
        ORDER BY is_default DESC, name
      `, params);

      return result.rows;
    } catch (error) {
      console.error('Error getting configuration templates:', error);
      return [];
    }
  }

  /**
   * Apply configuration template to tenant
   */
  async applyTemplate(tenantId: string, templateId: string, userId?: number): Promise<TenantConfigurationVersion> {
    try {
      // Get template
      const templateResult = await db.query(`
        SELECT configurations, name
        FROM tenant_configuration_templates
        WHERE id = $1
      `, [templateId]);

      if (templateResult.rows.length === 0) {
        throw new Error('Configuration template not found');
      }

      const template = templateResult.rows[0];

      // Apply template configuration
      const version = await this.createConfigurationVersion(
        tenantId,
        template.configurations,
        `Applied template: ${template.name}`,
        userId
      );

      return version;
    } catch (error) {
      console.error('Error applying configuration template:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(configurations: Record<string, any>, tenantId?: string): Promise<ConfigurationValidationResult> {
    try {
      let existingConfiguration: Record<string, any> = {};
      
      if (tenantId) {
        existingConfiguration = await this.getTenantConfiguration(tenantId, false);
      }

      return await tenantConfigurationValidator.validateConfiguration(configurations, existingConfiguration);
    } catch (error) {
      console.error('Error validating configuration:', error);
      return {
        isValid: false,
        errors: [{
          category: 'system',
          key: 'validation',
          message: 'Validation service error',
          code: 'VALIDATION_SERVICE_ERROR'
        }],
        warnings: []
      };
    }
  }

  /**
   * Get configuration diff between versions
   */
  async getConfigurationDiff(tenantId: string, fromVersion: number, toVersion: number): Promise<any> {
    try {
      const fromConfig = await this.getConfigurationVersion(tenantId, fromVersion);
      const toConfig = await this.getConfigurationVersion(tenantId, toVersion);

      if (!fromConfig || !toConfig) {
        throw new Error('One or both versions not found');
      }

      return tenantConfigurationInheritance.calculateDiff(
        fromConfig.configurations,
        toConfig.configurations
      );
    } catch (error) {
      console.error('Error getting configuration diff:', error);
      throw error;
    }
  }

  /**
   * Export tenant configuration
   */
  async exportConfiguration(tenantId: string, version?: number): Promise<any> {
    try {
      let configuration: Record<string, any>;

      if (version) {
        const versionData = await this.getConfigurationVersion(tenantId, version);
        if (!versionData) {
          throw new Error(`Version ${version} not found`);
        }
        configuration = versionData.configurations;
      } else {
        configuration = await this.getTenantConfiguration(tenantId, false);
      }

      return {
        tenantId,
        version,
        exportedAt: new Date().toISOString(),
        configuration
      };
    } catch (error) {
      console.error('Error exporting configuration:', error);
      throw error;
    }
  }

  /**
   * Import tenant configuration
   */
  async importConfiguration(
    tenantId: string,
    configurationData: any,
    options: {
      validateOnly?: boolean;
      userId?: number;
      description?: string;
    } = {}
  ): Promise<ConfigurationValidationResult | TenantConfigurationVersion> {
    try {
      const configuration = configurationData.configuration || configurationData;

      return await this.updateTenantConfiguration(tenantId, configuration, {
        description: options.description || 'Imported configuration',
        userId: options.userId,
        validateOnly: options.validateOnly
      });
    } catch (error) {
      console.error('Error importing configuration:', error);
      throw error;
    }
  }
}

// Singleton instance
export const tenantConfigurationService = new TenantConfigurationService();