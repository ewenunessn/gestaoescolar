/**
 * Tenant configuration controller
 * API endpoints for tenant configuration management
 */

import { Request, Response } from 'express';
import { tenantConfigurationService } from '../services/tenantConfigurationService';
import { ConfigurationChangeRequest, ConfigurationRollbackRequest } from '../types/tenantConfiguration';

export class TenantConfigurationController {

  /**
   * Get tenant configuration
   * GET /api/tenants/:tenantId/configuration
   */
  async getConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const includeInheritance = req.query.includeInheritance !== 'false';

      const configuration = await tenantConfigurationService.getTenantConfiguration(
        includeInheritance
      );

      res.json({
        success: true,
        data: configuration
      });
    } catch (error) {
      console.error('Error getting tenant configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant configuration',
        message: error.message
      });
    }
  }

  /**
   * Update tenant configuration
   * PUT /api/tenants/:tenantId/configuration
   */
  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { configurations, description, validateOnly } = req.body;
      const userId = req.user?.id;

      const result = await tenantConfigurationService.updateTenantConfiguration(
        configurations,
        {
          description,
          userId,
          validateOnly
        }
      );

      if ('isValid' in result) {
        // Validation result
        res.json({
          success: result.isValid,
          validation: result
        });
      } else {
        // Configuration version created
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      console.error('Error updating tenant configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update tenant configuration',
        message: error.message
      });
    }
  }

  /**
   * Get configuration versions
   * GET /api/tenants/:tenantId/configuration/versions
   */
  async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;

      const versions = await tenantConfigurationService.getConfigurationVersions(tenantId);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('Error getting configuration versions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration versions',
        message: error.message
      });
    }
  }

  /**
   * Get specific configuration version
   * GET /api/tenants/:tenantId/configuration/versions/:version
   */
  async getVersion(req: Request, res: Response): Promise<void> {
    try {
      const { version } = req.params;

      const versionData = await tenantConfigurationService.getConfigurationVersion(
        parseInt(version)
      );

      if (!versionData) {
        res.status(404).json({
          success: false,
          error: 'Configuration version not found'
        });
        return;
      }

      res.json({
        success: true,
        data: versionData
      });
    } catch (error) {
      console.error('Error getting configuration version:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration version',
        message: error.message
      });
    }
  }

  /**
   * Rollback configuration
   * POST /api/tenants/:tenantId/configuration/rollback
   */
  async rollbackConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { targetVersion, reason } = req.body;
      const userId = req.user?.id;

      const rollbackRequest: ConfigurationRollbackRequest = {
        targetVersion,
        reason,
        requestedBy: userId
      };

      const result = await tenantConfigurationService.rollbackConfiguration(rollbackRequest);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error rolling back configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rollback configuration',
        message: error.message
      });
    }
  }

  /**
   * Request configuration change
   * POST /api/tenants/:tenantId/configuration/change-requests
   */
  async requestChange(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { changes, description, autoApply } = req.body;
      const userId = req.user?.id;

      const changeRequest: ConfigurationChangeRequest = {
        changes,
        description,
        requestedBy: userId,
        autoApply
      };

      const requestId = await tenantConfigurationService.requestConfigurationChange(changeRequest);

      res.json({
        success: true,
        data: { requestId }
      });
    } catch (error) {
      console.error('Error requesting configuration change:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request configuration change',
        message: error.message
      });
    }
  }

  /**
   * Approve configuration change
   * POST /api/configuration/change-requests/:requestId/approve
   */
  async approveChange(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      await tenantConfigurationService.approveConfigurationChange(requestId, userId);

      res.json({
        success: true,
        message: 'Configuration change approved and applied'
      });
    } catch (error) {
      console.error('Error approving configuration change:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve configuration change',
        message: error.message
      });
    }
  }

  /**
   * Reject configuration change
   * POST /api/configuration/change-requests/:requestId/reject
   */
  async rejectChange(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'User authentication required'
        });
        return;
      }

      await tenantConfigurationService.rejectConfigurationChange(requestId, userId, reason);

      res.json({
        success: true,
        message: 'Configuration change rejected'
      });
    } catch (error) {
      console.error('Error rejecting configuration change:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject configuration change',
        message: error.message
      });
    }
  }

  /**
   * Get configuration templates
   * GET /api/configuration/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { tenantType } = req.query;

      const templates = await tenantConfigurationService.getConfigurationTemplates(
        tenantType as string
      );

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error getting configuration templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration templates',
        message: error.message
      });
    }
  }

  /**
   * Apply configuration template
   * POST /api/tenants/:tenantId/configuration/apply-template
   */
  async applyTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { templateId } = req.body;
      const userId = req.user?.id;

      const result = await tenantConfigurationService.applyTemplate(templateId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error applying configuration template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to apply configuration template',
        message: error.message
      });
    }
  }

  /**
   * Validate configuration
   * POST /api/tenants/:tenantId/configuration/validate
   */
  async validateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { configurations } = req.body;

      const validationResult = await tenantConfigurationService.validateConfiguration(
        configurations
      );

      res.json({
        success: true,
        data: validationResult
      });
    } catch (error) {
      console.error('Error validating configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate configuration',
        message: error.message
      });
    }
  }

  /**
   * Get configuration diff between versions
   * GET /api/tenants/:tenantId/configuration/diff/:fromVersion/:toVersion
   */
  async getConfigurationDiff(req: Request, res: Response): Promise<void> {
    try {
      const { fromVersion, toVersion } = req.params;

      const diff = await tenantConfigurationService.getConfigurationDiff(
        parseInt(fromVersion),
        parseInt(toVersion)
      );

      res.json({
        success: true,
        data: diff
      });
    } catch (error) {
      console.error('Error getting configuration diff:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration diff',
        message: error.message
      });
    }
  }

  /**
   * Export configuration
   * GET /api/tenants/:tenantId/configuration/export
   */
  async exportConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { version } = req.query;

      const exportData = await tenantConfigurationService.exportConfiguration(
        version ? parseInt(version as string) : undefined
      );

      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      console.error('Error exporting configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export configuration',
        message: error.message
      });
    }
  }

  /**
   * Import configuration
   * POST /api/tenants/:tenantId/configuration/import
   */
  async importConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { configurationData, validateOnly, description } = req.body;
      const userId = req.user?.id;

      const result = await tenantConfigurationService.importConfiguration(
        configurationData,
        {
          validateOnly,
          userId,
          description
        }
      );

      if ('isValid' in result) {
        // Validation result
        res.json({
          success: result.isValid,
          validation: result
        });
      } else {
        // Configuration version created
        res.json({
          success: true,
          data: result
        });
      }
    } catch (error) {
      console.error('Error importing configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import configuration',
        message: error.message
      });
    }
  }
}

// Create controller instance
export const tenantConfigurationController = new TenantConfigurationController();