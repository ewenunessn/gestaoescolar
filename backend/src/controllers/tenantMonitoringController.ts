/**
 * Tenant Monitoring Controller
 * Handles monitoring dashboard, alerts, and system health endpoints
 */

import { Request, Response } from 'express';
import { tenantMonitoringService } from '../services/tenantMonitoringService';
import { tenantNotificationService } from '../services/tenantNotificationService';
import { tenantAuditService } from '../services/tenantAuditService';
import { tenantPerformanceMonitor } from '../middleware/tenantPerformanceMiddleware';

const db = require('../database');

export class TenantMonitoringController {

  /**
   * GET /api/monitoring/dashboard/system
   * Get comprehensive system monitoring dashboard
   */
  async getSystemDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '24h' } = req.query;

      // Get system health
      const systemHealth = await tenantMonitoringService.getSystemHealth();
      
      // Get performance metrics
      const performanceMetrics = tenantPerformanceMonitor.getSystemStats();
      const performanceAlerts = tenantPerformanceMonitor.getPerformanceAlerts();
      
      // Get recent alerts
      const recentAlerts = await tenantMonitoringService.getSystemAlerts({
        limit: 20,
        acknowledged: false
      });
      
      // Get tenant summary from materialized view
      const tenantSummary = await db.query(`
        SELECT 
          COUNT(*) as total_tenants,
          COUNT(*) FILTER (WHERE health_score < 70) as unhealthy_tenants,
          COUNT(*) FILTER (WHERE critical_alerts_24h > 0) as tenants_with_alerts,
          AVG(health_score) as avg_health_score,
          SUM(api_calls_7d) as total_api_calls_7d,
          SUM(errors_7d) as total_errors_7d
        FROM tenant_monitoring_summary
      `);

      // Get security events summary
      const securitySummary = await this.getSecurityEventsSummary(timeRange as string);

      res.json({
        success: true,
        data: {
          systemHealth,
          performanceMetrics,
          performanceAlerts: performanceAlerts.filter(alert => alert.severity === 'critical'),
          recentAlerts,
          tenantSummary: tenantSummary.rows[0],
          securitySummary,
          timeRange,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting system dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system dashboard'
      });
    }
  }

  /**
   * GET /api/monitoring/dashboard/tenant/:tenantId
   * Get tenant-specific monitoring dashboard
   */
  async getTenantDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { timeRange = '7d' } = req.query;

      // Get tenant info
      const tenantInfo = await db.query(
        'SELECT name, slug, status, limits FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (!tenantInfo.rows.length) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // Get tenant performance metrics
      const performanceMetrics = tenantPerformanceMonitor.getTenantMetrics(tenantId);
      
      // Get usage trends
      const endDate = new Date();
      const days = this.parseTimeRange(timeRange as string);
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const usageMetrics = await tenantAuditService.getTenantUsageMetrics(startDate, endDate);
      
      // Get alerts
      const alerts = await tenantMonitoringService.getTenantAlerts({
        limit: 50,
        acknowledged: false
      });
      
      // Get security events
      const securityEvents = await tenantAuditService.getTenantSecurityEvents({
        limit: 20,
        startDate,
        endDate
      });

      // Check limit violations
      const limitViolations = await tenantAuditService.checkTenantLimits(tenantId);

      // Get health score
      const healthScore = await this.getTenantHealthScore(tenantId);

      res.json({
        success: true,
        data: {
          tenant: tenantInfo.rows[0],
          performanceMetrics,
          usageMetrics,
          alerts,
          securityEvents,
          limitViolations,
          healthScore,
          timeRange,
          period: { startDate, endDate },
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      console.error('Error getting tenant dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenant dashboard'
      });
    }
  }

  /**
   * GET /api/monitoring/alerts/summary
   * Get alerts summary with statistics
   */
  async getAlertsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = '24h' } = req.query;
      const hours = this.parseTimeRange(timeRange as string) * 24;
      const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

      const alertsSummary = await db.query(`
        SELECT 
          alert_type,
          severity,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
          COUNT(DISTINCT tenant_id) as affected_tenants,
          MIN(created_at) as first_occurrence,
          MAX(created_at) as last_occurrence
        FROM tenant_alerts
        WHERE created_at >= $1
        GROUP BY alert_type, severity
        ORDER BY count DESC
      `, [startTime]);

      const totalAlerts = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical,
          COUNT(*) FILTER (WHERE severity = 'high') as high,
          COUNT(DISTINCT tenant_id) as affected_tenants
        FROM tenant_alerts
        WHERE created_at >= $1
      `, [startTime]);

      res.json({
        success: true,
        data: {
          summary: alertsSummary.rows,
          totals: totalAlerts.rows[0],
          timeRange,
          period: {
            startTime,
            endTime: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Error getting alerts summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alerts summary'
      });
    }
  }

  /**
   * POST /api/monitoring/alerts/test
   * Test alert notification system
   */
  async testAlertNotification(req: Request, res: Response): Promise<void> {
    try {
      const { alertType = 'test', severity = 'medium' } = req.body;

      const testAlert = {
        id: `test-alert-${Date.now()}`,
        alertType,
        severity,
        message: 'This is a test alert to verify the notification system',
        details: {
          test: true,
          timestamp: new Date(),
          triggeredBy: req.user?.id || 'system'
        }
      };

      // Send test notification
      await tenantNotificationService.sendAlertNotification(testAlert);

      // Log the test alert
      await tenantMonitoringService.createAlert({
        alertType: 'test_notification',
        severity: severity as any,
        message: 'Test notification sent',
        details: testAlert
      });

      res.json({
        success: true,
        message: 'Test alert notification sent successfully',
        data: {
          alertId: testAlert.id,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Error sending test alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test alert'
      });
    }
  }

  /**
   * GET /api/monitoring/health/tenants
   * Get health scores for all tenants
   */
  async getTenantsHealth(req: Request, res: Response): Promise<void> {
    try {
      const healthScores = await db.query(`
        SELECT 
          t.id,
          t.name,
          t.slug,
          t.status,
          COALESCE(hs.overall_score, 100) as health_score,
          COALESCE(hs.performance_score, 100) as performance_score,
          COALESCE(hs.security_score, 100) as security_score,
          COALESCE(hs.usage_score, 100) as usage_score,
          hs.factors,
          hs.calculated_at
        FROM tenants t
        LEFT JOIN (
          SELECT DISTINCT ON (tenant_id)
            overall_score, performance_score, security_score, 
            usage_score, factors, calculated_at
          FROM tenant_health_scores
          ORDER BY calculated_at DESC
        ) hs ON t.id = hs.tenant_id
        WHERE t.status = 'active'
        ORDER BY COALESCE(hs.overall_score, 100) ASC
      `);

      // Calculate system health distribution
      const healthDistribution = {
        excellent: 0, // 90-100
        good: 0,      // 70-89
        fair: 0,      // 50-69
        poor: 0       // 0-49
      };

      healthScores.rows.forEach((tenant: any) => {
        const score = tenant.health_score;
        if (score >= 90) healthDistribution.excellent++;
        else if (score >= 70) healthDistribution.good++;
        else if (score >= 50) healthDistribution.fair++;
        else healthDistribution.poor++;
      });

      res.json({
        success: true,
        data: {
          tenants: healthScores.rows,
          distribution: healthDistribution,
          totalTenants: healthScores.rows.length,
          averageScore: healthScores.rows.reduce((sum: number, t: any) => sum + t.health_score, 0) / healthScores.rows.length
        }
      });
    } catch (error) {
      console.error('Error getting tenants health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tenants health'
      });
    }
  }

  /**
   * POST /api/monitoring/health/calculate/:tenantId
   * Recalculate health score for a tenant
   */
  async recalculateHealthScore(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;

      // Call the database function to calculate health score
      const result = await db.query(
        'SELECT calculate_tenant_health_score($1) as health_score',
        [tenantId]
      );

      const healthScore = result.rows[0].health_score;

      res.json({
        success: true,
        data: {
          healthScore,
          calculatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error recalculating health score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to recalculate health score'
      });
    }
  }

  /**
   * GET /api/monitoring/reports/daily
   * Generate daily monitoring report
   */
  async getDailyReport(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.query;
      const reportDate = date ? new Date(date as string) : new Date();
      const dateStr = reportDate.toISOString().split('T')[0];

      // Get daily metrics
      const dailyMetrics = await db.query(`
        SELECT 
          COUNT(DISTINCT tenant_id) as active_tenants,
          SUM(api_calls) as total_api_calls,
          SUM(data_operations) as total_data_operations,
          SUM(error_count) as total_errors,
          SUM(security_events) as total_security_events,
          AVG(active_users) as avg_active_users
        FROM tenant_usage_metrics
        WHERE period = $1
      `, [dateStr]);

      // Get alerts for the day
      const dailyAlerts = await db.query(`
        SELECT 
          alert_type,
          severity,
          COUNT(*) as count
        FROM tenant_alerts
        WHERE DATE(created_at) = $1
        GROUP BY alert_type, severity
        ORDER BY count DESC
      `, [dateStr]);

      // Get top tenants by activity
      const topTenants = await db.query(`
        SELECT 
          t.name,
          t.slug,
          um.api_calls,
          um.data_operations,
          um.active_users
        FROM tenant_usage_metrics um
        JOIN tenants t ON um.tenant_id = t.id
        WHERE um.period = $1
        ORDER BY um.api_calls DESC
        LIMIT 10
      `, [dateStr]);

      res.json({
        success: true,
        data: {
          date: dateStr,
          metrics: dailyMetrics.rows[0],
          alerts: dailyAlerts.rows,
          topTenants: topTenants.rows,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error generating daily report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate daily report'
      });
    }
  }

  /**
   * POST /api/monitoring/maintenance/refresh-views
   * Refresh materialized views
   */
  async refreshMaterializedViews(req: Request, res: Response): Promise<void> {
    try {
      await db.query('SELECT refresh_tenant_materialized_views()');

      res.json({
        success: true,
        message: 'Materialized views refreshed successfully',
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error refreshing materialized views:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh materialized views'
      });
    }
  }

  // Helper methods

  private parseTimeRange(timeRange: string): number {
    const match = timeRange.match(/^(\d+)([hdw])$/);
    if (!match) return 1; // Default to 1 day

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value / 24; // Convert hours to days
      case 'd': return value;
      case 'w': return value * 7;
      default: return 1;
    }
  }

  private async getSecurityEventsSummary(timeRange: string): Promise<any> {
    const hours = this.parseTimeRange(timeRange) * 24;
    const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

    const result = await db.query(`
      SELECT 
        event_type,
        severity,
        COUNT(*) as count,
        COUNT(DISTINCT tenant_id) as affected_tenants
      FROM tenant_security_events
      WHERE created_at >= $1
      GROUP BY event_type, severity
      ORDER BY count DESC
    `, [startTime]);

    return result.rows;
  }

  private async getTenantHealthScore(tenantId: string): Promise<any> {
    const result = await db.query(`
      SELECT 
        overall_score,
        performance_score,
        security_score,
        usage_score,
        factors,
        calculated_at
      FROM tenant_health_scores
      WHERE tenant_id = $1
      ORDER BY calculated_at DESC
      LIMIT 1
    `, [tenantId]);

    return result.rows[0] || {
      overall_score: 100,
      performance_score: 100,
      security_score: 100,
      usage_score: 100,
      factors: {},
      calculated_at: null
    };
  }
}

export const tenantMonitoringController = new TenantMonitoringController();