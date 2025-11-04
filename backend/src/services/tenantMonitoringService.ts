/**
 * Tenant Monitoring Service
 * Handles alerting, limit violations, and system monitoring
 */

import { tenantAuditService } from './tenantAuditService';
import { tenantPerformanceMonitor } from '../middleware/tenantPerformanceMiddleware';

const db = require('../database');

export interface Alert {
  id: string;
  tenantId?: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  acknowledged: boolean;
  acknowledgedBy?: number;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface LimitViolation {
  tenantId: string;
  limitType: string;
  currentValue: number;
  limitValue: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  totalTenants: number;
  activeTenants: number;
  totalAlerts: number;
  criticalAlerts: number;
  averageResponseTime: number;
  systemLoad: {
    cpu: number;
    memory: number;
    database: number;
  };
  lastUpdated: Date;
}

export class TenantMonitoringService {

  /**
   * Check all tenant limits and generate alerts
   */
  async checkAllTenantLimits(): Promise<LimitViolation[]> {
    const violations: LimitViolation[] = [];

    try {
      // Get all active tenants
      const tenantsResult = await db.query(`
        SELECT id, limits FROM tenants 
        WHERE status = 'active'
      `);

      for (const tenant of tenantsResult.rows) {
        const tenantViolations = await this.checkTenantLimits(tenant.id, tenant.limits);
        violations.push(...tenantViolations);
      }

    } catch (error) {
      console.error('Failed to check tenant limits:', error);
    }

    return violations;
  }

  /**
   * Check limits for a specific tenant
   */
  async checkTenantLimits(tenantId: string, limits: any): Promise<LimitViolation[]> {
    const violations: LimitViolation[] = [];

    if (!limits) return violations;

    try {
      // Check user limit
      if (limits.maxUsers) {
        const userCount = await this.getTenantUserCount(tenantId);
        if (userCount >= limits.maxUsers * 0.9) { // 90% threshold
          violations.push({
            tenantId,
            limitType: 'users',
            currentValue: userCount,
            limitValue: limits.maxUsers,
            severity: userCount >= limits.maxUsers ? 'critical' : 'warning',
            timestamp: new Date()
          });
        }
      }

      // Check API rate limit
      if (limits.apiRateLimit) {
        const apiCallsPerHour = await this.getTenantApiCallsLastHour(tenantId);
        const hourlyLimit = limits.apiRateLimit * 60;
        
        if (apiCallsPerHour >= hourlyLimit * 0.9) {
          violations.push({
            tenantId,
            limitType: 'api_rate',
            currentValue: apiCallsPerHour,
            limitValue: hourlyLimit,
            severity: apiCallsPerHour >= hourlyLimit ? 'critical' : 'warning',
            timestamp: new Date()
          });
        }
      }

      // Check storage limit
      if (limits.storageLimit) {
        const storageUsed = await this.getTenantStorageUsage(tenantId);
        const storageLimit = limits.storageLimit * 1024 * 1024; // Convert MB to bytes
        
        if (storageUsed >= storageLimit * 0.9) {
          violations.push({
            tenantId,
            limitType: 'storage',
            currentValue: storageUsed,
            limitValue: storageLimit,
            severity: storageUsed >= storageLimit ? 'critical' : 'warning',
            timestamp: new Date()
          });
        }
      }

      // Generate alerts for violations
      for (const violation of violations) {
        await this.createLimitViolationAlert(violation);
      }

    } catch (error) {
      console.error(`Failed to check limits for tenant ${tenantId}:`, error);
    }

    return violations;
  }

  /**
   * Create alert for limit violation
   */
  private async createLimitViolationAlert(violation: LimitViolation): Promise<void> {
    const message = `${violation.limitType} limit ${violation.severity}: ${violation.currentValue}/${violation.limitValue}`;
    
    await this.createAlert({
      tenantId: violation.tenantId,
      alertType: 'limit_violation',
      severity: violation.severity === 'critical' ? 'critical' : 'high',
      message,
      details: violation
    });
  }

  /**
   * Create a new alert
   */
  async createAlert(alert: {
    tenantId?: string;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details: any;
  }): Promise<void> {
    try {
      await db.query(`
        INSERT INTO tenant_alerts (
          tenant_id, alert_type, severity, message, details
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        alert.tenantId || null,
        alert.alertType,
        alert.severity,
        alert.message,
        JSON.stringify(alert.details)
      ]);

      // Send notification for critical alerts
      if (alert.severity === 'critical') {
        await this.sendCriticalAlertNotification(alert);
      }

    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Get alerts for a tenant
   */
  async getTenantAlerts(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      severity?: string;
      acknowledged?: boolean;
    } = {}
  ): Promise<Alert[]> {
    const { limit = 50, offset = 0, severity, acknowledged } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (acknowledged !== undefined) {
      whereClause += ` AND acknowledged = $${paramIndex}`;
      params.push(acknowledged);
      paramIndex++;
    }

    const result = await db.query(`
      SELECT * FROM tenant_alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return result.rows;
  }

  /**
   * Get system-wide alerts
   */
  async getSystemAlerts(
    options: {
      limit?: number;
      offset?: number;
      severity?: string;
      acknowledged?: boolean;
    } = {}
  ): Promise<Alert[]> {
    const { limit = 100, offset = 0, severity, acknowledged } = options;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (acknowledged !== undefined) {
      whereClause += ` AND acknowledged = $${paramIndex}`;
      params.push(acknowledged);
      paramIndex++;
    }

    const result = await db.query(`
      SELECT * FROM tenant_alerts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return result.rows;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: number): Promise<void> {
    await db.query(`
      UPDATE tenant_alerts
      SET acknowledged = true, acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [userId, alertId]);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Get tenant counts
      const tenantStats = await db.query(`
        SELECT 
          COUNT(*) as total_tenants,
          COUNT(*) FILTER (WHERE status = 'active') as active_tenants
        FROM tenants
      `);

      // Get alert counts
      const alertStats = await db.query(`
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(*) FILTER (WHERE severity = 'critical' AND acknowledged = false) as critical_alerts
        FROM tenant_alerts
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);

      // Get performance metrics
      const performanceStats = tenantPerformanceMonitor.getSystemStats();

      // Determine system status
      const criticalAlerts = parseInt(alertStats.rows[0]?.critical_alerts || 0);
      const averageResponseTime = performanceStats.averageResponseTime;
      
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      
      if (criticalAlerts > 0 || averageResponseTime > 2000) {
        status = 'critical';
      } else if (averageResponseTime > 1000) {
        status = 'degraded';
      }

      return {
        status,
        totalTenants: parseInt(tenantStats.rows[0]?.total_tenants || 0),
        activeTenants: parseInt(tenantStats.rows[0]?.active_tenants || 0),
        totalAlerts: parseInt(alertStats.rows[0]?.total_alerts || 0),
        criticalAlerts,
        averageResponseTime,
        systemLoad: {
          cpu: 0, // Would be implemented with actual system monitoring
          memory: 0,
          database: 0
        },
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        status: 'critical',
        totalTenants: 0,
        activeTenants: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        averageResponseTime: 0,
        systemLoad: { cpu: 0, memory: 0, database: 0 },
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Generate daily monitoring report
   */
  async generateDailyReport(date: Date = new Date()): Promise<void> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Get all active tenants
      const tenantsResult = await db.query(`
        SELECT id FROM tenants WHERE status = 'active'
      `);

      for (const tenant of tenantsResult.rows) {
        // Generate usage report
        await tenantAuditService.generateDailyUsageReport(tenant.id, date);

        // Check limits
        await this.checkTenantLimits(tenant.id, tenant.limits);
      }

      // Create system health report
      const systemHealth = await this.getSystemHealth();
      
      console.log(`📊 Daily Report for ${dateStr}:`, {
        totalTenants: systemHealth.totalTenants,
        activeTenants: systemHealth.activeTenants,
        systemStatus: systemHealth.status,
        criticalAlerts: systemHealth.criticalAlerts,
        averageResponseTime: `${systemHealth.averageResponseTime}ms`
      });

    } catch (error) {
      console.error('Failed to generate daily report:', error);
    }
  }

  /**
   * Helper methods for limit checking
   */
  private async getTenantUserCount(tenantId: string): Promise<number> {
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM tenant_users
      WHERE tenant_id = $1 AND status = 'active'
    `, [tenantId]);

    return parseInt(result.rows[0]?.count || 0);
  }

  private async getTenantApiCallsLastHour(tenantId: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM tenant_audit_log
      WHERE tenant_id = $1 
        AND created_at >= $2
        AND category IN ('data_access', 'system')
    `, [tenantId, oneHourAgo]);

    return parseInt(result.rows[0]?.count || 0);
  }

  private async getTenantStorageUsage(tenantId: string): Promise<number> {
    // This would be implemented based on actual storage calculation
    // For now, return from usage metrics table
    const result = await db.query(`
      SELECT storage_used
      FROM tenant_usage_metrics
      WHERE tenant_id = $1
      ORDER BY updated_at DESC
      LIMIT 1
    `, [tenantId]);

    return parseInt(result.rows[0]?.storage_used || 0);
  }

  private async sendCriticalAlertNotification(alert: any): Promise<void> {
    // In a real implementation, this would send notifications via:
    // - Email
    // - Slack/Teams
    // - SMS
    // - Push notifications
    // - Webhook calls

    console.error('🚨 CRITICAL ALERT:', {
      tenantId: alert.tenantId,
      type: alert.alertType,
      message: alert.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const tenantMonitoringService = new TenantMonitoringService();

// Schedule periodic monitoring tasks
setInterval(async () => {
  try {
    await tenantMonitoringService.checkAllTenantLimits();
  } catch (error) {
    console.error('Periodic limit check failed:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Schedule daily reports
setInterval(async () => {
  const now = new Date();
  // Run at midnight
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    await tenantMonitoringService.generateDailyReport();
  }
}, 60 * 1000); // Check every minute