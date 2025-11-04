-- Migration: Create audit monitoring tables
-- Description: Add tables for security events, usage metrics, and alerts

-- Create security events table
CREATE TABLE IF NOT EXISTS tenant_security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create usage metrics table
CREATE TABLE IF NOT EXISTS tenant_usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period DATE NOT NULL,
    api_calls INTEGER DEFAULT 0,
    data_operations INTEGER DEFAULT 0,
    storage_used BIGINT DEFAULT 0, -- in bytes
    active_users INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    security_events INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, period)
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS tenant_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by INTEGER,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS tenant_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time INTEGER NOT NULL, -- in milliseconds
    status_code INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_security_events_tenant_id ON tenant_security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_security_events_created_at ON tenant_security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_security_events_event_type ON tenant_security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tenant_security_events_severity ON tenant_security_events(severity);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_metrics_tenant_id ON tenant_usage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_metrics_period ON tenant_usage_metrics(period);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_metrics_tenant_period ON tenant_usage_metrics(tenant_id, period);

CREATE INDEX IF NOT EXISTS idx_tenant_alerts_tenant_id ON tenant_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_alerts_created_at ON tenant_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_alerts_severity ON tenant_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_tenant_alerts_acknowledged ON tenant_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_tenant_performance_metrics_tenant_id ON tenant_performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_performance_metrics_created_at ON tenant_performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_performance_metrics_endpoint ON tenant_performance_metrics(endpoint);

-- Add comments for documentation
COMMENT ON TABLE tenant_security_events IS 'Security events and violations for tenant monitoring';
COMMENT ON TABLE tenant_usage_metrics IS 'Daily usage metrics aggregated per tenant';
COMMENT ON TABLE tenant_alerts IS 'System alerts for tenant administrators';
COMMENT ON TABLE tenant_performance_metrics IS 'Performance metrics for tenant endpoints';

COMMENT ON COLUMN tenant_security_events.event_type IS 'Type of security event (cross_tenant_access, unauthorized_access, etc.)';
COMMENT ON COLUMN tenant_security_events.severity IS 'Event severity (low, medium, high, critical)';
COMMENT ON COLUMN tenant_usage_metrics.period IS 'Date for which metrics are aggregated (YYYY-MM-DD)';
COMMENT ON COLUMN tenant_usage_metrics.storage_used IS 'Storage used in bytes';
COMMENT ON COLUMN tenant_alerts.alert_type IS 'Type of alert (security, performance, limit_violation, etc.)';
COMMENT ON COLUMN tenant_performance_metrics.response_time IS 'Response time in milliseconds';