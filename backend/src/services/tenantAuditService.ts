/**
 * Tenant Audit Service
 * Comprehensive audit logging and monitoring for multi-tenant operations
 */

import { Request } from 'express';
import { TenantAuditLog } from '../types/tenant';

const db = require('../database');

export interface AuditLogEntry {
  tenantId?: string;
  operation: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  userId?: number;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'tenant_management' | 'user_management' | 'data_access' | 'security' | 'configuration' | 'system';
  metadata?: any;
}

export interface SecurityEvent {
  type: 'cross_tenant_access' | 'unauthorized_access' | 'privilege_escalation' | 'suspicious_activity' | 'data_breach_attempt';
  tenantId?: string;
  userId?: number;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface TenantUsageMetrics {
  tenantId: string;
  period: string; // YYYY-MM-DD format
  apiCalls: number;
  dataOperations: number;
  storageUsed: number;
  activeUsers: number;
  errorCount: number;
  securityEvents: number;
}

export class TenantAuditService {
  
  /**
   * Log a general audit event
   */
  async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      await db.query(`
        INSERT INTO tenant_audit_log (
          tenant_id, operation, entity_type, entity_id, 
          old_values, new_values, user_id, ip_address, 
          user_agent, severity, category, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        entry.tenantId || null,
        entry.operation,
        entry.entityType || null,
        entry.entityId || null,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.userId || null,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.severity || 'medium',
        entry.category || 'system',
        entry.metadata ? JSON.stringify(entry.metadata) : null
      ]);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to audit table
      await this.logAuditEvent({
        tenantId: event.tenantId,
        operation: `security_event_${event.type}`,
        category: 'security',
        severity: event.severity,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: {
          eventType: event.type,
          details: event.details
        }
      });

      // Log to security events table
      await db.query(`
        INSERT INTO tenant_security_events (
          tenant_id, event_type, user_id, ip_address, 
          user_agent, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        event.tenantId || null,
        event.type,
        event.userId || null,
        event.ipAddress || null,
        event.userAgent || null,
        JSON.stringify(event.details),
        event.severity
      ]);

      // Send alert for critical events
      if (event.severity === 'critical') {
        await this.sendSecurityAlert(event);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log tenant usage metrics
   */
  async logUsageMetrics(metrics: TenantUsageMetrics): Promise<void> {
    try {
      await db.query(`
        INSERT INTO tenant_usage_metrics (
          tenant_id, period, api_calls, data_operations,
          storage_used, active_users, error_count, security_events
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tenant_id, period) 
        DO UPDATE SET
          api_calls = EXCLUDED.api_calls,
          data_operations = EXCLUDED.data_operations,
          storage_used = EXCLUDED.storage_used,
          active_users = EXCLUDED.active_users,
          error_count = EXCLUDED.error_count,
          security_events = EXCLUDED.security_events,
          updated_at = CURRENT_TIMESTAMP
      `, [
        metrics.tenantId,
        metrics.period,
        metrics.apiCalls,
        metrics.dataOperations,
        metrics.storageUsed,
        metrics.activeUsers,
        metrics.errorCount,
        metrics.securityEvents
      ]);
    } catch (error) {
      console.error('Failed to log usage metrics:', error);
    }
  }

  /**
   * Get audit logs for a tenant
   */
  async getTenantAuditLogs(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      operation?: string;
      category?: string;
      severity?: string;
    } = {}
  ): Promise<TenantAuditLog[]> {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      operation,
      category,
      severity
    } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (operation) {
      whereClause += ` AND operation = $${paramIndex}`;
      params.push(operation);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    const result = await db.query(`
      SELECT * FROM tenant_audit_log
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return result.rows;
  }

  /**
   * Get security events for a tenant
   */
  async getTenantSecurityEvents(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      eventType?: string;
      severity?: string;
    } = {}
  ): Promise<any[]> {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      eventType,
      severity
    } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (eventType) {
      whereClause += ` AND event_type = $${paramIndex}`;
      params.push(eventType);
      paramIndex++;
    }

    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    const result = await db.query(`
      SELECT * FROM tenant_security_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return result.rows;
  }

  /**
   * Get usage metrics for a tenant
   */
  async getTenantUsageMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TenantUsageMetrics[]> {
    const result = await db.query(`
      SELECT * FROM tenant_usage_metrics
      WHERE tenant_id = $1 
        AND period >= $2 
        AND period <= $3
      ORDER BY period DESC
    `, [tenantId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);

    return result.rows;
  }

  /**
   * Check for tenant limit violations
   */
  async checkTenantLimits(tenantId: string): Promise<{
    violations: Array<{
      type: string;
      current: number;
      limit: number;
      severity: 'warning' | 'critical';
    }>;
  }> {
    const violations: any[] = [];

    try {
      // Get tenant limits
      const tenantResult = await db.query(
        'SELECT limits FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (!tenantResult.rows.length) {
        return { violations };
      }

      const limits = tenantResult.rows[0].limits || {};

      // Check user count
      if (limits.maxUsers) {
        const userCountResult = await db.query(
          'SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = $1 AND status = $2',
          [tenantId, 'active']
        );
        const currentUsers = parseInt(userCountResult.rows[0].count);
        
        if (currentUsers >= limits.maxUsers) {
          violations.push({
            type: 'user_limit',
            current: currentUsers,
            limit: limits.maxUsers,
            severity: currentUsers > limits.maxUsers ? 'critical' : 'warning'
          });
        }
      }

      // Check API rate limit (from recent metrics)
      if (limits.apiRateLimit) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        const apiCallsResult = await db.query(`
          SELECT SUM(api_calls) as total_calls
          FROM tenant_usage_metrics
          WHERE tenant_id = $1 AND updated_at >= $2
        `, [tenantId, oneHourAgo]);

        const currentApiCalls = parseInt(apiCallsResult.rows[0]?.total_calls || 0);
        const hourlyLimit = limits.apiRateLimit * 60; // Convert per-minute to per-hour
        
        if (currentApiCalls >= hourlyLimit) {
          violations.push({
            type: 'api_rate_limit',
            current: currentApiCalls,
            limit: hourlyLimit,
            severity: currentApiCalls > hourlyLimit ? 'critical' : 'warning'
          });
        }
      }

      // Check storage limit
      if (limits.storageLimit) {
        const storageResult = await db.query(`
          SELECT storage_used
          FROM tenant_usage_metrics
          WHERE tenant_id = $1
          ORDER BY updated_at DESC
          LIMIT 1
        `, [tenantId]);

        if (storageResult.rows.length) {
          const currentStorage = storageResult.rows[0].storage_used;
          
          if (currentStorage >= limits.storageLimit) {
            violations.push({
              type: 'storage_limit',
              current: currentStorage,
              limit: limits.storageLimit,
              severity: currentStorage > limits.storageLimit ? 'critical' : 'warning'
            });
          }
        }
      }

    } catch (error) {
      console.error('Failed to check tenant limits:', error);
    }

    return { violations };
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // In a real implementation, this would send alerts via email, Slack, etc.
    console.error('🚨 SECURITY ALERT:', {
      type: event.type,
      tenantId: event.tenantId,
      userId: event.userId,
      severity: event.severity,
      details: event.details,
      timestamp: new Date().toISOString()
    });

    // Store alert for dashboard
    try {
      await db.query(`
        INSERT INTO tenant_alerts (
          tenant_id, alert_type, severity, message, details
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        event.tenantId,
        'security',
        event.severity,
        `Security event: ${event.type}`,
        JSON.stringify(event.details)
      ]);
    } catch (error) {
      console.error('Failed to store security alert:', error);
    }
  }

  /**
   * Generate daily usage report
   */
  async generateDailyUsageReport(tenantId: string, date: Date): Promise<void> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Count API calls from audit logs
      const apiCallsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM tenant_audit_log
        WHERE tenant_id = $1 
          AND DATE(created_at) = $2
          AND category IN ('data_access', 'system')
      `, [tenantId, dateStr]);

      // Count data operations
      const dataOpsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM tenant_audit_log
        WHERE tenant_id = $1 
          AND DATE(created_at) = $2
          AND operation IN ('create', 'update', 'delete')
      `, [tenantId, dateStr]);

      // Count active users
      const activeUsersResult = await db.query(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM tenant_audit_log
        WHERE tenant_id = $1 
          AND DATE(created_at) = $2
          AND user_id IS NOT NULL
      `, [tenantId, dateStr]);

      // Count errors
      const errorsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM tenant_audit_log
        WHERE tenant_id = $1 
          AND DATE(created_at) = $2
          AND severity IN ('high', 'critical')
      `, [tenantId, dateStr]);

      // Count security events
      const securityEventsResult = await db.query(`
        SELECT COUNT(*) as count
        FROM tenant_security_events
        WHERE tenant_id = $1 
          AND DATE(created_at) = $2
      `, [tenantId, dateStr]);

      // Calculate storage used (simplified - in real implementation would query actual storage)
      const storageUsed = 0; // Placeholder

      await this.logUsageMetrics({
        tenantId,
        period: dateStr,
        apiCalls: parseInt(apiCallsResult.rows[0].count),
        dataOperations: parseInt(dataOpsResult.rows[0].count),
        storageUsed,
        activeUsers: parseInt(activeUsersResult.rows[0].count),
        errorCount: parseInt(errorsResult.rows[0].count),
        securityEvents: parseInt(securityEventsResult.rows[0].count)
      });

    } catch (error) {
      console.error('Failed to generate daily usage report:', error);
    }
  }
}

// Export singleton instance
export const tenantAuditService = new TenantAuditService();