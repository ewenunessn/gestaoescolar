/**
 * Real-time Tenant Monitoring Service
 * Provides WebSocket-based real-time monitoring updates
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { tenantMonitoringService } from './tenantMonitoringService';
import { tenantPerformanceMonitor } from '../middleware/tenantPerformanceMiddleware';
import { tenantNotificationService } from './tenantNotificationService';

export interface MonitoringSubscription {
  socketId: string;
  tenantId?: string;
  subscriptions: string[]; // ['alerts', 'performance', 'health', 'security']
  userId?: number;
}

export class TenantRealtimeMonitoringService {
  private io: SocketIOServer | null = null;
  private subscriptions = new Map<string, MonitoringSubscription>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      path: '/socket.io/monitoring'
    });

    this.setupSocketHandlers();
    this.startPeriodicUpdates();
    
    console.log('🔄 Real-time monitoring service initialized');
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`📡 Monitoring client connected: ${socket.id}`);

      // Handle subscription requests
      socket.on('subscribe', (data: {
        tenantId?: string;
        subscriptions: string[];
        userId?: number;
      }) => {
        this.handleSubscription(socket.id, data);
        socket.emit('subscribed', {
          success: true,
          subscriptions: data.subscriptions,
          tenantId: data.tenantId
        });
      });

      // Handle unsubscription
      socket.on('unsubscribe', (data: { subscriptions?: string[] }) => {
        this.handleUnsubscription(socket.id, data.subscriptions);
        socket.emit('unsubscribed', { success: true });
      });

      // Handle real-time data requests
      socket.on('get-current-data', async (data: { type: string; tenantId?: string }) => {
        const currentData = await this.getCurrentData(data.type, data.tenantId);
        socket.emit('current-data', {
          type: data.type,
          data: currentData,
          timestamp: new Date()
        });
      });

      // Handle acknowledgment of alerts
      socket.on('acknowledge-alert', async (data: { alertId: string; userId: number }) => {
        try {
          await tenantMonitoringService.acknowledgeAlert(data.alertId, data.userId);
          
          // Broadcast alert acknowledgment to all subscribers
          this.broadcastToSubscribers('alerts', {
            type: 'alert-acknowledged',
            alertId: data.alertId,
            acknowledgedBy: data.userId,
            timestamp: new Date()
          });
        } catch (error) {
          socket.emit('error', {
            message: 'Failed to acknowledge alert',
            error: error.message
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`📡 Monitoring client disconnected: ${socket.id}`);
        this.handleDisconnection(socket.id);
      });
    });
  }

  /**
   * Handle client subscription
   */
  private handleSubscription(socketId: string, data: {
    tenantId?: string;
    subscriptions: string[];
    userId?: number;
  }): void {
    this.subscriptions.set(socketId, {
      socketId,
      tenantId: data.tenantId,
      subscriptions: data.subscriptions,
      userId: data.userId
    });

    console.log(`📡 Client ${socketId} subscribed to:`, data.subscriptions);
  }

  /**
   * Handle client unsubscription
   */
  private handleUnsubscription(socketId: string, subscriptions?: string[]): void {
    const existing = this.subscriptions.get(socketId);
    if (!existing) return;

    if (subscriptions) {
      // Remove specific subscriptions
      existing.subscriptions = existing.subscriptions.filter(
        sub => !subscriptions.includes(sub)
      );
      
      if (existing.subscriptions.length === 0) {
        this.subscriptions.delete(socketId);
      }
    } else {
      // Remove all subscriptions
      this.subscriptions.delete(socketId);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socketId: string): void {
    this.subscriptions.delete(socketId);
  }

  /**
   * Start periodic updates for real-time data
   */
  private startPeriodicUpdates(): void {
    // System health updates every 30 seconds
    this.updateIntervals.set('system-health', setInterval(async () => {
      const systemHealth = await tenantMonitoringService.getSystemHealth();
      this.broadcastToSubscribers('health', {
        type: 'system-health-update',
        data: systemHealth,
        timestamp: new Date()
      });
    }, 30000));

    // Performance metrics updates every 15 seconds
    this.updateIntervals.set('performance', setInterval(() => {
      const performanceAlerts = tenantPerformanceMonitor.getPerformanceAlerts();
      const systemStats = tenantPerformanceMonitor.getSystemStats();
      
      this.broadcastToSubscribers('performance', {
        type: 'performance-update',
        data: {
          alerts: performanceAlerts,
          systemStats
        },
        timestamp: new Date()
      });
    }, 15000));

    // Alert updates every 10 seconds
    this.updateIntervals.set('alerts', setInterval(async () => {
      const recentAlerts = await tenantMonitoringService.getSystemAlerts({
        limit: 10,
        acknowledged: false
      });
      
      this.broadcastToSubscribers('alerts', {
        type: 'alerts-update',
        data: recentAlerts,
        timestamp: new Date()
      });
    }, 10000));

    console.log('🔄 Periodic monitoring updates started');
  }

  /**
   * Broadcast data to subscribers
   */
  private broadcastToSubscribers(subscriptionType: string, data: any, tenantId?: string): void {
    if (!this.io) return;

    for (const [socketId, subscription] of this.subscriptions.entries()) {
      // Check if client is subscribed to this type
      if (!subscription.subscriptions.includes(subscriptionType)) continue;

      // Check tenant filtering
      if (tenantId && subscription.tenantId && subscription.tenantId !== tenantId) continue;

      // Send data to client
      this.io.to(socketId).emit('monitoring-update', data);
    }
  }

  /**
   * Send alert notification in real-time
   */
  async sendRealtimeAlert(alert: {
    id: string;
    tenantId?: string;
    alertType: string;
    severity: string;
    message: string;
    details: any;
  }): Promise<void> {
    // Send to notification service first
    await tenantNotificationService.sendAlertNotification(alert);

    // Broadcast to real-time subscribers
    this.broadcastToSubscribers('alerts', {
      type: 'new-alert',
      data: alert,
      timestamp: new Date()
    }, alert.tenantId);

    // If critical, also broadcast to all system administrators
    if (alert.severity === 'critical') {
      this.broadcastToSubscribers('alerts', {
        type: 'critical-alert',
        data: alert,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send real-time security event notification
   */
  sendRealtimeSecurityEvent(event: {
    type: string;
    tenantId?: string;
    severity: string;
    details: any;
  }): void {
    this.broadcastToSubscribers('security', {
      type: 'security-event',
      data: event,
      timestamp: new Date()
    }, event.tenantId);
  }

  /**
   * Send real-time performance alert
   */
  sendRealtimePerformanceAlert(alert: {
    tenantId: string;
    type: string;
    message: string;
    severity: string;
  }): void {
    this.broadcastToSubscribers('performance', {
      type: 'performance-alert',
      data: alert,
      timestamp: new Date()
    }, alert.tenantId);
  }

  /**
   * Get current data for a specific type
   */
  private async getCurrentData(type: string, tenantId?: string): Promise<any> {
    switch (type) {
      case 'system-health':
        return await tenantMonitoringService.getSystemHealth();
      
      case 'performance':
        if (tenantId) {
          return tenantPerformanceMonitor.getTenantMetrics(tenantId);
        } else {
          return {
            systemStats: tenantPerformanceMonitor.getSystemStats(),
            alerts: tenantPerformanceMonitor.getPerformanceAlerts()
          };
        }
      
      case 'alerts':
        if (tenantId) {
          return await tenantMonitoringService.getTenantAlerts(tenantId, {
            limit: 20,
            acknowledged: false
          });
        } else {
          return await tenantMonitoringService.getSystemAlerts({
            limit: 50,
            acknowledged: false
          });
        }
      
      case 'tenant-summary':
        const db = require('../database');
        const result = await db.query(`
          SELECT 
            COUNT(*) as total_tenants,
            COUNT(*) FILTER (WHERE health_score < 70) as unhealthy_tenants,
            COUNT(*) FILTER (WHERE critical_alerts_24h > 0) as tenants_with_alerts,
            AVG(health_score) as avg_health_score
          FROM tenant_monitoring_summary
        `);
        return result.rows[0];
      
      default:
        return null;
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    subscriptionsByType: Record<string, number>;
    tenantSubscriptions: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.subscriptions.size,
      subscriptionsByType: {} as Record<string, number>,
      tenantSubscriptions: {} as Record<string, number>
    };

    for (const subscription of this.subscriptions.values()) {
      // Count subscriptions by type
      for (const subType of subscription.subscriptions) {
        stats.subscriptionsByType[subType] = (stats.subscriptionsByType[subType] || 0) + 1;
      }

      // Count tenant subscriptions
      if (subscription.tenantId) {
        stats.tenantSubscriptions[subscription.tenantId] = 
          (stats.tenantSubscriptions[subscription.tenantId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    // Clear subscriptions
    this.subscriptions.clear();

    // Close socket server
    if (this.io) {
      this.io.close();
      this.io = null;
    }

    console.log('🔄 Real-time monitoring service cleaned up');
  }
}

// Export singleton instance
export const tenantRealtimeMonitoringService = new TenantRealtimeMonitoringService();