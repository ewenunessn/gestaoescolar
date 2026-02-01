/**
 * Tenant Provisioning Controller
 * Handles automated tenant provisioning workflows, templates, and progress tracking
 */

import { Request, Response } from 'express';
import { tenantProvisioningService } from '../services/tenantProvisioningService';

/**
 * List tenant templates
 */
export async function listTenantTemplates(req: Request, res: Response) {
  try {
    const { category } = req.query;
    
    const templates = await tenantProvisioningService.listTemplates(category as string);

    res.json({
      success: true,
      data: templates,
      total: templates.length
    });
  } catch (error) {
    console.error('Error listing tenant templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing tenant templates',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get tenant template by ID
 */
export async function getTenantTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const template = await tenantProvisioningService.getTemplate(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error getting tenant template:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting tenant template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create new tenant template
 */
export async function createTenantTemplate(req: Request, res: Response) {
  try {
    const templateData = req.body;

    const template = await tenantProvisioningService.createTemplate(templateData);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });
  } catch (error) {
    console.error('Error creating tenant template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating tenant template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update tenant template
 */
export async function updateTenantTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await tenantProvisioningService.updateTemplate(id, updates);

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  } catch (error) {
    console.error('Error updating tenant template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tenant template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Delete tenant template
 */
export async function deleteTenantTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await tenantProvisioningService.deleteTemplate(id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tenant template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Provision tenant from template
 */
export async function provisionFromTemplate(req: Request, res: Response) {
  try {
    const { templateId } = req.params;
    const { tenantData, adminUser } = req.body;

    if (!tenantData || !adminUser) {
      return res.status(400).json({
        success: false,
        message: 'tenantData and adminUser are required'
      });
    }

    const progress = await tenantProvisioningService.provisionFromTemplate(
      templateId,
      tenantData,
      adminUser
    );

    res.status(202).json({
      success: true,
      message: 'Provisioning started successfully',
      data: progress
    });
  } catch (error) {
    console.error('Error provisioning from template:', error);
    res.status(500).json({
      success: false,
      message: 'Error provisioning from template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Provision tenant with custom configuration
 */
export async function provisionCustomTenant(req: Request, res: Response) {
  try {
    const request = req.body;

    const progress = await tenantProvisioningService.provisionCustom(request);

    res.status(202).json({
      success: true,
      message: 'Custom provisioning started successfully',
      data: progress
    });
  } catch (error) {
    console.error('Error provisioning custom tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error provisioning custom tenant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get provisioning progress
 */
export async function getProvisioningProgress(req: Request, res: Response) {
  try {
    const { progressId } = req.params;

    const progress = await tenantProvisioningService.getProvisioningProgress(progressId);
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Provisioning progress not found'
      });
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting provisioning progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting provisioning progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * List provisioning progress records
 */
export async function listProvisioningProgress(req: Request, res: Response) {
  try {
    const filters = req.query;

    const progressList = await tenantProvisioningService.listProvisioningProgress(filters);

    res.json({
      success: true,
      data: progressList,
      total: progressList.length
    });
  } catch (error) {
    console.error('Error listing provisioning progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing provisioning progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Cancel provisioning
 */
export async function cancelProvisioning(req: Request, res: Response) {
  try {
    const { progressId } = req.params;

    await tenantProvisioningService.cancelProvisioning(progressId);

    res.json({
      success: true,
      message: 'Provisioning cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling provisioning:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling provisioning',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Retry failed provisioning step
 */
export async function retryFailedStep(req: Request, res: Response) {
  try {
    const { progressId, stepId } = req.params;

    await tenantProvisioningService.retryFailedStep(progressId, stepId);

    res.json({
      success: true,
      message: 'Step retry initiated successfully'
    });
  } catch (error) {
    console.error('Error retrying failed step:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrying failed step',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Deprovision tenant
 */
export async function deprovisionTenant(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const options = req.body || {};

    const progress = await tenantProvisioningService.deprovisionTenant(options);

    res.status(202).json({
      success: true,
      message: 'Deprovisioning started successfully',
      data: progress
    });
  } catch (error) {
    console.error('Error deprovisioning tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error deprovisioning tenant',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Schedule tenant deprovisioning
 */
export async function scheduleDeprovisioning(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;
    const { scheduledAt, options = {} } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'scheduledAt is required'
      });
    }

    await tenantProvisioningService.scheduleDeprovisioning(
      new Date(scheduledAt),
      options
    );

    res.json({
      success: true,
      message: 'Deprovisioning scheduled successfully'
    });
  } catch (error) {
    console.error('Error scheduling deprovisioning:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling deprovisioning',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Recover failed provisioning
 */
export async function recoverFailedProvisioning(req: Request, res: Response) {
  try {
    const { progressId } = req.params;

    const progress = await tenantProvisioningService.recoverFailedProvisioning(progressId);

    res.json({
      success: true,
      message: 'Provisioning recovery initiated successfully',
      data: progress
    });
  } catch (error) {
    console.error('Error recovering failed provisioning:', error);
    res.status(500).json({
      success: false,
      message: 'Error recovering failed provisioning',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Cleanup failed provisioning
 */
export async function cleanupFailedProvisioning(req: Request, res: Response) {
  try {
    const { progressId } = req.params;

    await tenantProvisioningService.cleanupFailedProvisioning(progressId);

    res.json({
      success: true,
      message: 'Failed provisioning cleaned up successfully'
    });
  } catch (error) {
    console.error('Error cleaning up failed provisioning:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up failed provisioning',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get provisioning statistics
 */
export async function getProvisioningStats(req: Request, res: Response) {
  try {
    // Get basic statistics about provisioning
    const db = require('../database');
    
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_provisioning,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'running') as running,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE metadata->>'type' = 'deprovisioning') as deprovisioning,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_completion_time
      FROM tenant_provisioning_progress
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    const templateStatsResult = await db.query(`
      SELECT 
        tt.name,
        tt.category,
        COUNT(tpp.id) as usage_count,
        COUNT(*) FILTER (WHERE tpp.status = 'completed') as success_count,
        COUNT(*) FILTER (WHERE tpp.status = 'failed') as failure_count
      FROM tenant_templates tt
      LEFT JOIN tenant_provisioning_progress tpp ON tt.id = tpp.template_id
      WHERE tpp.created_at >= NOW() - INTERVAL '30 days' OR tpp.created_at IS NULL
      GROUP BY tt.id, tt.name, tt.category
      ORDER BY usage_count DESC
    `);

    const stats = statsResult.rows[0];
    const templateStats = templateStatsResult.rows;

    res.json({
      success: true,
      data: {
        overview: {
          totalProvisioning: parseInt(stats.total_provisioning) || 0,
          completed: parseInt(stats.completed) || 0,
          failed: parseInt(stats.failed) || 0,
          running: parseInt(stats.running) || 0,
          pending: parseInt(stats.pending) || 0,
          deprovisioning: parseInt(stats.deprovisioning) || 0,
          avgCompletionTime: parseFloat(stats.avg_completion_time) || 0
        },
        templateUsage: templateStats.map(row => ({
          templateName: row.name,
          category: row.category,
          usageCount: parseInt(row.usage_count) || 0,
          successCount: parseInt(row.success_count) || 0,
          failureCount: parseInt(row.failure_count) || 0,
          successRate: row.usage_count > 0 
            ? ((parseInt(row.success_count) || 0) / parseInt(row.usage_count) * 100).toFixed(1)
            : '0.0'
        }))
      }
    });
  } catch (error) {
    console.error('Error getting provisioning stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting provisioning stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}