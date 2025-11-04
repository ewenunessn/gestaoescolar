/**
 * Tenant Audit Routes
 * API endpoints for accessing audit logs and monitoring data
 */

import { Router, Request, Response } from 'express';
import { tenantAuditService } from '../services/tenantAuditService';
import { tenantMonitoringService } from '../services/tenantMonitoringService';
import { tenantAuthMiddleware } from '../middlewares/tenantAuthMiddleware';

const router = Router();

// Apply tenant authentication to all routes
router.use(tenantAuthMiddleware({ required: true }));

/**
 * GET /api/audit/logs
 * Get audit logs for current tenant
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      operation,
      category,
      severity
    } = req.query;

    const options: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (operation) options.operation = operation as string;
    if (category) options.category = category as string;
    if (severity) options.severity = severity as string;

    const logs = await tenantAuditService.getTenantAuditLogs(tenantId, options);

    res.json({
      success: true,
      data: logs,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: logs.length
      }
    });

  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs'
    });
  }
});

/**
 * GET /api/audit/security-events
 * Get security events for current tenant
 */
router.get('/security-events', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      eventType,
      severity
    } = req.query;

    const options: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (eventType) options.eventType = eventType as string;
    if (severity) options.severity = severity as string;

    const events = await tenantAuditService.getTenantSecurityEvents(tenantId, options);

    res.json({
      success: true,
      data: events,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: events.length
      }
    });

  } catch (error) {
    console.error('Failed to get security events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events'
    });
  }
});

/**
 * GET /api/audit/usage-metrics
 * Get usage metrics for current tenant
 */
router.get('/usage-metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const metrics = await tenantAuditService.getTenantUsageMetrics(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Failed to get usage metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve usage metrics'
    });
  }
});

/**
 * GET /api/audit/limit-violations
 * Check current tenant limit violations
 */
router.get('/limit-violations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const violations = await tenantAuditService.checkTenantLimits(tenantId);

    res.json({
      success: true,
      data: violations
    });

  } catch (error) {
    console.error('Failed to check limit violations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check limit violations'
    });
  }
});

/**
 * GET /api/audit/alerts
 * Get alerts for current tenant
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant context required'
      });
    }

    const {
      limit = 50,
      offset = 0,
      severity,
      acknowledged
    } = req.query;

    const options: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (severity) options.severity = severity as string;
    if (acknowledged !== undefined) options.acknowledged = acknowledged === 'true';

    const alerts = await tenantMonitoringService.getTenantAlerts(tenantId, options);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: alerts.length
      }
    });

  } catch (error) {
    console.error('Failed to get alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve alerts'
    });
  }
});

/**
 * POST /api/audit/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    await tenantMonitoringService.acknowledgeAlert(alertId, userId);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });

  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert'
    });
  }
});

// System admin routes (require system admin role)
const systemAdminMiddleware = (req: Request, res: Response, next: any) => {
  if (!req.user?.isSystemAdmin) {
    return res.status(403).json({
      success: false,
      message: 'System administrator access required'
    });
  }
  next();
};

/**
 * GET /api/audit/system/health
 * Get system health status (system admin only)
 */
router.get('/system/health', systemAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const health = await tenantMonitoringService.getSystemHealth();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('Failed to get system health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system health'
    });
  }
});

/**
 * GET /api/audit/system/alerts
 * Get system-wide alerts (system admin only)
 */
router.get('/system/alerts', systemAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const {
      limit = 100,
      offset = 0,
      severity,
      acknowledged
    } = req.query;

    const options: any = {
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    if (severity) options.severity = severity as string;
    if (acknowledged !== undefined) options.acknowledged = acknowledged === 'true';

    const alerts = await tenantMonitoringService.getSystemAlerts(options);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: alerts.length
      }
    });

  } catch (error) {
    console.error('Failed to get system alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system alerts'
    });
  }
});

/**
 * POST /api/audit/system/generate-report
 * Generate daily monitoring report (system admin only)
 */
router.post('/system/generate-report', systemAdminMiddleware, async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    const reportDate = date ? new Date(date) : new Date();

    await tenantMonitoringService.generateDailyReport(reportDate);

    res.json({
      success: true,
      message: 'Daily report generated successfully'
    });

  } catch (error) {
    console.error('Failed to generate daily report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily report'
    });
  }
});

export default router;