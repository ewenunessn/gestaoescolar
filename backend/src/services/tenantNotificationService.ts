/**
 * Tenant Notification Service
 * Handles sending notifications for critical alerts and system events
 */

import { tenantAuditService } from './tenantAuditService';

const db = require('../database');

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'sms';
  config: any;
  enabled: boolean;
}

export interface NotificationRule {
  id: string;
  tenantId?: string; // null for system-wide rules
  alertTypes: string[];
  severities: string[];
  channels: NotificationChannel[];
  enabled: boolean;
  conditions?: any; // Additional conditions for triggering
}

export interface NotificationTemplate {
  type: string;
  subject: string;
  body: string;
  variables: string[];
}

export class TenantNotificationService {
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Send notification for an alert
   */
  async sendAlertNotification(alert: {
    id: string;
    tenantId?: string;
    alertType: string;
    severity: string;
    message: string;
    details: any;
  }): Promise<void> {
    try {
      // Get notification rules for this alert
      const rules = await this.getApplicableRules(alert.tenantId, alert.alertType, alert.severity);

      for (const rule of rules) {
        if (!rule.enabled) continue;

        // Check additional conditions
        if (rule.conditions && !this.evaluateConditions(rule.conditions, alert)) {
          continue;
        }

        // Send to each enabled channel
        for (const channel of rule.channels) {
          if (!channel.enabled) continue;

          try {
            await this.sendToChannel(channel, alert, rule);
            
            // Log successful notification
            await this.logNotification({
              alertId: alert.id,
              tenantId: alert.tenantId,
              channelType: channel.type,
              status: 'sent',
              ruleId: rule.id
            });
          } catch (error) {
            console.error(`Failed to send notification via ${channel.type}:`, error);
            
            // Log failed notification
            await this.logNotification({
              alertId: alert.id,
              tenantId: alert.tenantId,
              channelType: channel.type,
              status: 'failed',
              error: error.message,
              ruleId: rule.id
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Send tenant provisioning failure notification
   */
  async sendProvisioningFailureNotification(tenantId: string, error: any): Promise<void> {
    const alert = {
      id: `provisioning-failure-${Date.now()}`,
      tenantId,
      alertType: 'provisioning_failure',
      severity: 'critical' as const,
      message: `Tenant provisioning failed: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
        operation: 'tenant_provisioning'
      }
    };

    await this.sendAlertNotification(alert);

    // Also log as security event since provisioning failures can indicate attacks
    await tenantAuditService.logSecurityEvent({
      type: 'suspicious_activity',
      tenantId,
      details: {
        operation: 'tenant_provisioning',
        error: error.message,
        possibleAttack: true
      },
      severity: 'high'
    });
  }

  /**
   * Send security violation notification
   */
  async sendSecurityViolationNotification(violation: {
    type: string;
    tenantId?: string;
    userId?: number;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<void> {
    const alert = {
      id: `security-violation-${Date.now()}`,
      tenantId: violation.tenantId,
      alertType: 'security_violation',
      severity: violation.severity,
      message: `Security violation detected: ${violation.type}`,
      details: violation.details
    };

    await this.sendAlertNotification(alert);
  }

  /**
   * Send system health degradation notification
   */
  async sendSystemHealthNotification(healthStatus: {
    status: 'healthy' | 'degraded' | 'critical';
    details: any;
  }): Promise<void> {
    if (healthStatus.status === 'healthy') return; // Don't notify for healthy status

    const alert = {
      id: `system-health-${Date.now()}`,
      alertType: 'system_health',
      severity: healthStatus.status === 'critical' ? 'critical' as const : 'high' as const,
      message: `System health is ${healthStatus.status}`,
      details: healthStatus.details
    };

    await this.sendAlertNotification(alert);
  }

  /**
   * Get applicable notification rules for an alert
   */
  private async getApplicableRules(
    tenantId?: string, 
    alertType?: string, 
    severity?: string
  ): Promise<NotificationRule[]> {
    try {
      let whereClause = 'WHERE enabled = true';
      const params: any[] = [];
      let paramIndex = 1;

      // Include system-wide rules and tenant-specific rules
      if (tenantId) {
        whereClause += ` AND (tenant_id IS NULL OR tenant_id = $${paramIndex})`;
        params.push(tenantId);
        paramIndex++;
      } else {
        whereClause += ` AND tenant_id IS NULL`;
      }

      const result = await db.query(`
        SELECT * FROM tenant_notification_rules
        ${whereClause}
        ORDER BY tenant_id NULLS LAST, created_at DESC
      `, params);

      const rules: NotificationRule[] = result.rows.map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        alertTypes: row.alert_types || [],
        severities: row.severities || [],
        channels: row.channels || [],
        enabled: row.enabled,
        conditions: row.conditions
      }));

      // Filter rules based on alert type and severity
      return rules.filter(rule => {
        if (alertType && rule.alertTypes.length > 0 && !rule.alertTypes.includes(alertType)) {
          return false;
        }
        if (severity && rule.severities.length > 0 && !rule.severities.includes(severity)) {
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Failed to get notification rules:', error);
      return [];
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel, 
    alert: any, 
    rule: NotificationRule
  ): Promise<void> {
    const template = this.getTemplate(alert.alertType);
    const message = this.renderTemplate(template, alert);

    switch (channel.type) {
      case 'email':
        await this.sendEmail(channel.config, message, alert);
        break;
      case 'webhook':
        await this.sendWebhook(channel.config, alert);
        break;
      case 'slack':
        await this.sendSlack(channel.config, message, alert);
        break;
      case 'teams':
        await this.sendTeams(channel.config, message, alert);
        break;
      case 'sms':
        await this.sendSMS(channel.config, message, alert);
        break;
      default:
        throw new Error(`Unsupported notification channel: ${channel.type}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(config: any, message: any, alert: any): Promise<void> {
    // In a real implementation, this would use a service like SendGrid, AWS SES, etc.
    console.log('📧 EMAIL NOTIFICATION:', {
      to: config.recipients,
      subject: message.subject,
      body: message.body,
      alert: {
        id: alert.id,
        type: alert.alertType,
        severity: alert.severity
      }
    });

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(config: any, alert: any): Promise<void> {
    // In a real implementation, this would make HTTP POST requests
    console.log('🔗 WEBHOOK NOTIFICATION:', {
      url: config.url,
      method: 'POST',
      headers: config.headers || {},
      payload: {
        alert,
        timestamp: new Date(),
        source: 'tenant-monitoring-system'
      }
    });

    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(config: any, message: any, alert: any): Promise<void> {
    const slackMessage = {
      channel: config.channel,
      text: message.subject,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        fields: [
          { title: 'Alert Type', value: alert.alertType, short: true },
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Tenant', value: alert.tenantId || 'System-wide', short: true },
          { title: 'Time', value: new Date().toISOString(), short: true }
        ],
        text: message.body
      }]
    };

    console.log('💬 SLACK NOTIFICATION:', slackMessage);
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  /**
   * Send Microsoft Teams notification
   */
  private async sendTeams(config: any, message: any, alert: any): Promise<void> {
    const teamsMessage = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: this.getSeverityColor(alert.severity),
      summary: message.subject,
      sections: [{
        activityTitle: message.subject,
        activitySubtitle: `${alert.alertType} - ${alert.severity.toUpperCase()}`,
        facts: [
          { name: 'Alert ID', value: alert.id },
          { name: 'Tenant', value: alert.tenantId || 'System-wide' },
          { name: 'Time', value: new Date().toISOString() }
        ],
        text: message.body
      }]
    };

    console.log('📢 TEAMS NOTIFICATION:', teamsMessage);
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(config: any, message: any, alert: any): Promise<void> {
    const smsText = `${message.subject}\n\n${message.body}\n\nAlert ID: ${alert.id}`;
    
    console.log('📱 SMS NOTIFICATION:', {
      to: config.phoneNumbers,
      message: smsText,
      alert: {
        id: alert.id,
        severity: alert.severity
      }
    });

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * Get template for alert type
   */
  private getTemplate(alertType: string): NotificationTemplate {
    return this.templates.get(alertType) || this.templates.get('default')!;
  }

  /**
   * Render template with alert data
   */
  private renderTemplate(template: NotificationTemplate, alert: any): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    // Replace variables in template
    const variables = {
      alertId: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      tenantId: alert.tenantId || 'System-wide',
      timestamp: new Date().toISOString(),
      details: JSON.stringify(alert.details, null, 2)
    };

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      body = body.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject, body };
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#FF0000';
      case 'high': return '#FF8C00';
      case 'medium': return '#FFD700';
      case 'low': return '#32CD32';
      default: return '#808080';
    }
  }

  /**
   * Evaluate notification conditions
   */
  private evaluateConditions(conditions: any, alert: any): boolean {
    // Simple condition evaluation - in a real system this would be more sophisticated
    if (conditions.minSeverityLevel) {
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      const alertLevel = severityLevels[alert.severity as keyof typeof severityLevels] || 0;
      const minLevel = severityLevels[conditions.minSeverityLevel as keyof typeof severityLevels] || 0;
      
      if (alertLevel < minLevel) return false;
    }

    if (conditions.timeWindow) {
      // Check if we should throttle notifications based on time window
      // This would require checking recent notification history
    }

    return true;
  }

  /**
   * Log notification attempt
   */
  private async logNotification(log: {
    alertId: string;
    tenantId?: string;
    channelType: string;
    status: 'sent' | 'failed';
    error?: string;
    ruleId: string;
  }): Promise<void> {
    try {
      await db.query(`
        INSERT INTO tenant_notification_log (
          alert_id, tenant_id, channel_type, status, error_message, rule_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        log.alertId,
        log.tenantId || null,
        log.channelType,
        log.status,
        log.error || null,
        log.ruleId
      ]);
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    this.templates.set('default', {
      type: 'default',
      subject: '[{{severity}}] {{alertType}} - {{tenantId}}',
      body: `Alert Details:
- ID: {{alertId}}
- Type: {{alertType}}
- Severity: {{severity}}
- Tenant: {{tenantId}}
- Message: {{message}}
- Time: {{timestamp}}

Details:
{{details}}`,
      variables: ['alertId', 'alertType', 'severity', 'tenantId', 'message', 'timestamp', 'details']
    });

    this.templates.set('security_violation', {
      type: 'security_violation',
      subject: '🚨 SECURITY ALERT: {{alertType}} - {{tenantId}}',
      body: `SECURITY VIOLATION DETECTED

Alert ID: {{alertId}}
Tenant: {{tenantId}}
Severity: {{severity}}
Time: {{timestamp}}

Description: {{message}}

This requires immediate attention. Please investigate and take appropriate action.

Details:
{{details}}`,
      variables: ['alertId', 'alertType', 'severity', 'tenantId', 'message', 'timestamp', 'details']
    });

    this.templates.set('provisioning_failure', {
      type: 'provisioning_failure',
      subject: '⚠️ Tenant Provisioning Failed - {{tenantId}}',
      body: `Tenant provisioning has failed and requires manual intervention.

Tenant ID: {{tenantId}}
Time: {{timestamp}}
Error: {{message}}

Please check the system logs and resolve the issue.

Details:
{{details}}`,
      variables: ['tenantId', 'message', 'timestamp', 'details']
    });

    this.templates.set('system_health', {
      type: 'system_health',
      subject: '🏥 System Health Alert - {{severity}}',
      body: `System health status has changed to {{severity}}.

Time: {{timestamp}}
Description: {{message}}

Please check the monitoring dashboard for more details.

System Details:
{{details}}`,
      variables: ['severity', 'message', 'timestamp', 'details']
    });

    this.templates.set('limit_violation', {
      type: 'limit_violation',
      subject: '📊 Tenant Limit Violation - {{tenantId}}',
      body: `A tenant has exceeded or is approaching their usage limits.

Tenant: {{tenantId}}
Time: {{timestamp}}
Issue: {{message}}

Please review the tenant's usage and consider adjusting limits or contacting the tenant.

Details:
{{details}}`,
      variables: ['tenantId', 'message', 'timestamp', 'details']
    });
  }

  /**
   * Create or update notification rule
   */
  async createNotificationRule(rule: Omit<NotificationRule, 'id'>): Promise<string> {
    const result = await db.query(`
      INSERT INTO tenant_notification_rules (
        tenant_id, alert_types, severities, channels, enabled, conditions
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      rule.tenantId || null,
      JSON.stringify(rule.alertTypes),
      JSON.stringify(rule.severities),
      JSON.stringify(rule.channels),
      rule.enabled,
      rule.conditions ? JSON.stringify(rule.conditions) : null
    ]);

    return result.rows[0].id;
  }

  /**
   * Get notification rules for a tenant
   */
  async getNotificationRules(tenantId?: string): Promise<NotificationRule[]> {
    let whereClause = '';
    const params: any[] = [];

    if (tenantId) {
      whereClause = 'WHERE tenant_id = $1 OR tenant_id IS NULL';
      params.push(tenantId);
    } else {
      whereClause = 'WHERE tenant_id IS NULL';
    }

    const result = await db.query(`
      SELECT * FROM tenant_notification_rules
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      alertTypes: row.alert_types || [],
      severities: row.severities || [],
      channels: row.channels || [],
      enabled: row.enabled,
      conditions: row.conditions
    }));
  }
}

// Export singleton instance
export const tenantNotificationService = new TenantNotificationService();