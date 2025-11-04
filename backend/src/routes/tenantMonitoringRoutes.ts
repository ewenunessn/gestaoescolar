/**
 * Tenant Monitoring Dashboard Routes
 * Comprehensive monitoring and alerting API endpoints
 */

import { Router, Request, Response } from 'express';
import { tenantMonitoringService } from '../services/tenantMonitoringService';
import { tenantAuditService } from '../services/tenantAuditService';
import { tenantPerformanceMonitor } from '../middleware/tenantPerformanceMiddleware';
import { tenantMonitoringController } from '../controllers/tenantMonitoringController';
import { requireTenant, noTenant } from '../middleware/tenantMiddleware';

const router = Router();

// ============================================================================
// DASHBOARD OVERVIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/monitoring/dashboard/overview
 * Get system-wide monitoring overview
 */
router.get('/dashboard/overview', noTenant(), tenantMonitoringController.getSystemDashboard.bind(tenantMonitoringController));

/**
 * GET /api/monitoring/dashboard/tenant/:tenantId
 * Get tenant-specific monitoring dashboard
 */
router.get('/dashboard/tenant/:tenantId', requireTenant(), tenantMonitoringController.getTenantDashboard.bind(tenantMonitoringController));

// ============================================================================
// ALERTS MANAGEMENT
// ============================================================================

/**
 * GET /api/monitoring/alerts
 * Get system alerts with filtering
 */
router.get('/alerts', noTenant(), async (req: Request, res: Response) => {
  try {
    const {
      limit = 50,
      offset = 0,
      severity,
      acknowledged,
      tenantId
    } = req.query;

    let alerts;
    if (tenantId) {
      alerts = await tenantMonitoringService.getTenantAlerts(tenantId as string, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        severity: severity as string,
        acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined
      });
    } else {
      alerts = await tenantMonitoringService.getSystemAlerts({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        severity: severity as string,
        acknowledged: acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined
      });
    }

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

/**
 * POST /api/monitoring/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', noTenant(), async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = req.user?.id; // Assuming user is attached to request

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    await tenantMonitoringService.acknowledgeAlert(alertId, userId);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * POST /api/monitoring/alerts/bulk-acknowledge
 * Acknowledge multiple alerts
 */
router.post('/alerts/bulk-acknowledge', noTenant(), async (req: Request, res: Response) => {
  try {
    const { alertIds } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!Array.isArray(alertIds)) {
      return res.status(400).json({
        success: false,
        error: 'alertIds must be an array'
      });
    }

    const results = [];
    for (const alertId of alertIds) {
      try {
        await tenantMonitoringService.acknowledgeAlert(alertId, userId);
        results.push({ alertId, status: 'acknowledged' });
      } catch (error) {
        results.push({ alertId, status: 'error', error: error.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk acknowledging alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk acknowledge alerts'
    });
  }
});

// ============================================================================
// USAGE METRICS AND ANALYTICS
// ============================================================================

/**
 * GET /api/monitoring/usage/tenants
 * Get usage metrics for all tenants
 */
router.get('/usage/tenants', noTenant(), async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days as string) * 24 * 60 * 60 * 1000));

    // This would be implemented with a more complex query in a real system
    const db = require('../database');
    
    const result = await db.query(`
      SELECT 
        t.id,
        t.name,
        t.slug,
        t.status,
        COALESCE(SUM(um.api_calls), 0) as total_api_calls,
        COALESCE(SUM(um.data_operations), 0) as total_data_operations,
        COALESCE(AVG(um.active_users), 0) as avg_active_users,
        COALESCE(SUM(um.error_count), 0) as total_errors,
        COALESCE(SUM(um.security_events), 0) as total_security_events,
        COALESCE(MAX(um.storage_used), 0) as current_storage_used
      FROM tenants t
      LEFT JOIN tenant_usage_metrics um ON t.id = um.tenant_id 
        AND um.period >= $1 AND um.period <= $2
      WHERE t.status = 'active'
      GROUP BY t.id, t.name, t.slug, t.status
      ORDER BY total_api_calls DESC
    `, [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

    res.json({
      success: true,
      data: {
        tenants: result.rows,
        period: {
          startDate,
          endDate,
          days: parseInt(days as string)
        }
      }
    });
  } catch (error) {
    console.error('Error getting tenant usage metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant usage metrics'
    });
  }
});

/**
 * GET /api/monitoring/usage/tenant/:tenantId/trends
 * Get usage trends for a specific tenant
 */
router.get('/usage/tenant/:tenantId/trends', requireTenant(), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days as string) * 24 * 60 * 60 * 1000));

    const usageMetrics = await tenantAuditService.getTenantUsageMetrics(tenantId, startDate, endDate);

    // Calculate trends
    const trends = calculateUsageTrends(usageMetrics);

    res.json({
      success: true,
      data: {
        tenantId,
        metrics: usageMetrics,
        trends,
        period: {
          startDate,
          endDate,
          days: parseInt(days as string)
        }
      }
    });
  } catch (error) {
    console.error('Error getting tenant usage trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tenant usage trends'
    });
  }
});

// ============================================================================
// SECURITY MONITORING
// ============================================================================

/**
 * GET /api/monitoring/security/events
 * Get security events across all tenants
 */
router.get('/security/events', noTenant(), async (req: Request, res: Response) => {
  try {
    const {
      limit = 100,
      offset = 0,
      severity,
      eventType,
      tenantId,
      days = 7
    } = req.query;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days as string) * 24 * 60 * 60 * 1000));

    const db = require('../database');
    
    let whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
    const params: any[] = [startDate, endDate];
    let paramIndex = 3;

    if (tenantId) {
      whereClause += ` AND tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (eventType) {
      whereClause += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    const result = await db.query(`
      SELECT 
        se.*,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM tenant_security_events se
      LEFT JOIN tenants t ON se.tenant_id = t.id
      ${whereClause}
      ORDER BY se.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit as string), parseInt(offset as string)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security events'
    });
  }
});

/**
 * GET /api/monitoring/security/summary
 * Get security summary statistics
 */
router.get('/security/summary', noTenant(), async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (parseInt(days as string) * 24 * 60 * 60 * 1000));

    const db = require('../database');
    
    const result = await db.query(`
      SELECT 
        event_type,
        severity,
        COUNT(*) as count,
        COUNT(DISTINCT tenant_id) as affected_tenants
      FROM tenant_security_events
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY event_type, severity
      ORDER BY count DESC
    `, [startDate, endDate]);

    res.json({
      success: true,
      data: {
        summary: result.rows,
        period: {
          startDate,
          endDate,
          days: parseInt(days as string)
        }
      }
    });
  } catch (error) {
    console.error('Error getting security summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security summary'
    });
  }
});

// ============================================================================
// SYSTEM HEALTH MONITORING
// ============================================================================

/**
 * GET /api/monitoring/health/detailed
 * Get detailed system health information
 */
router.get('/health/detailed', noTenant(), async (req: Request, res: Response) => {
  try {
    const systemHealth = await tenantMonitoringService.getSystemHealth();
    const systemStats = tenantPerformanceMonitor.getSystemStats();
    const performanceAlerts = tenantPerformanceMonitor.getPerformanceAlerts();

    // Get database health
    const db = require('../database');
    const dbHealthResult = await db.query(`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const dbHealth = dbHealthResult.rows[0];

    res.json({
      success: true,
      data: {
        systemHealth,
        systemStats,
        performanceAlerts,
        databaseHealth: {
          totalConnections: parseInt(dbHealth.total_connections),
          activeConnections: parseInt(dbHealth.active_connections),
          idleConnections: parseInt(dbHealth.idle_connections)
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting detailed health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get detailed health information'
    });
  }
});

// ============================================================================
// ENHANCED MONITORING ENDPOINTS
// ============================================================================

/**
 * GET /api/monitoring/dashboard/system
 * Get comprehensive system monitoring dashboard
 */
router.get('/dashboard/system', noTenant(), tenantMonitoringController.getSystemDashboard.bind(tenantMonitoringController));

/**
 * GET /api/monitoring/alerts/summary
 * Get alerts summary with statistics
 */
router.get('/alerts/summary', noTenant(), tenantMonitoringController.getAlertsSummary.bind(tenantMonitoringController));

/**
 * POST /api/monitoring/alerts/test
 * Test alert notification system
 */
router.post('/alerts/test', noTenant(), tenantMonitoringController.testAlertNotification.bind(tenantMonitoringController));

/**
 * GET /api/monitoring/health/tenants
 * Get health scores for all tenants
 */
router.get('/health/tenants', noTenant(), tenantMonitoringController.getTenantsHealth.bind(tenantMonitoringController));

/**
 * POST /api/monitoring/health/calculate/:tenantId
 * Recalculate health score for a tenant
 */
router.post('/health/calculate/:tenantId', requireTenant(), tenantMonitoringController.recalculateHealthScore.bind(tenantMonitoringController));

/**
 * GET /api/monitoring/reports/daily
 * Generate daily monitoring report
 */
router.get('/reports/daily', noTenant(), tenantMonitoringController.getDailyReport.bind(tenantMonitoringController));

/**
 * POST /api/monitoring/maintenance/refresh-views
 * Refresh materialized views
 */
router.post('/maintenance/refresh-views', noTenant(), tenantMonitoringController.refreshMaterializedViews.bind(tenantMonitoringController));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateUsageTrends(metrics: any[]): any {
  if (metrics.length < 2) {
    return {
      apiCalls: { trend: 'stable', change: 0 },
      dataOperations: { trend: 'stable', change: 0 },
      activeUsers: { trend: 'stable', change: 0 },
      errors: { trend: 'stable', change: 0 }
    };
  }

  const latest = metrics[0];
  const previous = metrics[1];

  const calculateTrend = (current: number, prev: number) => {
    if (prev === 0) return { trend: 'stable', change: 0 };
    const change = ((current - prev) / prev) * 100;
    const trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
    return { trend, change: Math.round(change * 100) / 100 };
  };

  return {
    apiCalls: calculateTrend(latest.api_calls, previous.api_calls),
    dataOperations: calculateTrend(latest.data_operations, previous.data_operations),
    activeUsers: calculateTrend(latest.active_users, previous.active_users),
    errors: calculateTrend(latest.error_count, previous.error_count)
  };
}

export default router;