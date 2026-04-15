-- Migration: Create notification and alerting tables (simplified)
-- Description: Add tables for notification rules, logs, and enhanced monitoring

-- Create notification rules table
CREATE TABLE IF NOT EXISTS tenant_notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    alert_types JSONB DEFAULT '[]',
    severities JSONB DEFAULT '[]',
    channels JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN DEFAULT TRUE,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification log table
CREATE TABLE IF NOT EXISTS tenant_notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    channel_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    rule_id UUID REFERENCES tenant_notification_rules(id) ON DELETE SET NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tenant health scores table
CREATE TABLE IF NOT EXISTS tenant_health_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    performance_score INTEGER NOT NULL CHECK (performance_score >= 0 AND performance_score <= 100),
    security_score INTEGER NOT NULL CHECK (security_score >= 0 AND security_score <= 100),
    usage_score INTEGER NOT NULL CHECK (usage_score >= 0 AND usage_score <= 100),
    factors JSONB DEFAULT '{}',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, DATE(calculated_at))
);

-- Create monitoring dashboards table
CREATE TABLE IF NOT EXISTS monitoring_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    dashboard_type VARCHAR(50) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    widgets JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenant_notification_rules_tenant_id ON tenant_notification_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_rules_enabled ON tenant_notification_rules(enabled);

CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_alert_id ON tenant_notification_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_tenant_id ON tenant_notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_sent_at ON tenant_notification_log(sent_at);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type_name ON system_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_tenant_health_scores_tenant_id ON tenant_health_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_health_scores_calculated_at ON tenant_health_scores(calculated_at);

CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_tenant_id ON monitoring_dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_type ON monitoring_dashboards(dashboard_type);

-- Insert default notification rules
INSERT INTO tenant_notification_rules (
    tenant_id, alert_types, severities, channels, enabled
) VALUES 
(
    NULL,
    '["security_violation", "provisioning_failure", "system_health"]',
    '["critical", "high"]',
    '[{"type": "email", "config": {"recipients": ["admin@sistema.com.br"]}, "enabled": true}]',
    true
) ON CONFLICT DO NOTHING;

-- Insert default system dashboard
INSERT INTO monitoring_dashboards (
    name, tenant_id, dashboard_type, config, widgets, is_default
) VALUES (
    'System Overview',
    NULL,
    'overview',
    '{"refreshInterval": 30, "theme": "dark"}',
    '[
        {"type": "system_health", "position": {"x": 0, "y": 0, "w": 6, "h": 4}},
        {"type": "tenant_count", "position": {"x": 6, "y": 0, "w": 3, "h": 2}},
        {"type": "alert_count", "position": {"x": 9, "y": 0, "w": 3, "h": 2}},
        {"type": "performance_chart", "position": {"x": 0, "y": 4, "w": 12, "h": 6}}
    ]',
    true
) ON CONFLICT DO NOTHING;