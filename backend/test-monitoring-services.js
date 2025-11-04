/**
 * Test monitoring services
 */

require('dotenv').config();

// Mock the database module for testing
const mockDb = {
  query: async (sql, params) => {
    console.log('🔍 Mock DB Query:', sql.substring(0, 100) + '...');
    console.log('📋 Params:', params);
    
    // Mock responses based on query type
    if (sql.includes('tenant_alerts')) {
      return { rows: [] };
    }
    if (sql.includes('tenants')) {
      return { rows: [{ id: 'test-tenant-1', name: 'Test Tenant', limits: { maxUsers: 100 } }] };
    }
    if (sql.includes('tenant_usage_metrics')) {
      return { rows: [{ count: 0 }] };
    }
    if (sql.includes('tenant_notification_rules')) {
      return { rows: [] };
    }
    
    return { rows: [] };
  }
};

// Mock the database module
require.cache[require.resolve('./src/database')] = {
  exports: mockDb
};

async function testMonitoringServices() {
  try {
    console.log('🧪 Testing monitoring services...');
    
    // Test tenant monitoring service
    console.log('\n📊 Testing TenantMonitoringService...');
    const { tenantMonitoringService } = require('./src/services/tenantMonitoringService');
    
    // Test system health
    const systemHealth = await tenantMonitoringService.getSystemHealth();
    console.log('🏥 System Health:', systemHealth);
    
    // Test alert creation
    await tenantMonitoringService.createAlert({
      tenantId: 'test-tenant-1',
      alertType: 'test_alert',
      severity: 'medium',
      message: 'Test alert message',
      details: { test: true }
    });
    console.log('✅ Alert created successfully');
    
    // Test notification service
    console.log('\n📧 Testing TenantNotificationService...');
    const { tenantNotificationService } = require('./src/services/tenantNotificationService');
    
    // Test alert notification
    await tenantNotificationService.sendAlertNotification({
      id: 'test-alert-1',
      tenantId: 'test-tenant-1',
      alertType: 'test_notification',
      severity: 'medium',
      message: 'Test notification message',
      details: { test: true }
    });
    console.log('✅ Notification sent successfully');
    
    // Test performance monitor
    console.log('\n⚡ Testing TenantPerformanceMonitor...');
    const { tenantPerformanceMonitor } = require('./src/middleware/tenantPerformanceMiddleware');
    
    const systemStats = tenantPerformanceMonitor.getSystemStats();
    console.log('📈 System Stats:', systemStats);
    
    const performanceAlerts = tenantPerformanceMonitor.getPerformanceAlerts();
    console.log('⚠️  Performance Alerts:', performanceAlerts);
    
    console.log('\n✅ All monitoring services tested successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMonitoringServices();