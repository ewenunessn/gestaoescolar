-- Migration: Create notification and alerting tables
-- Description: Add tables for notification rules, logs, and enhanced monitoring

-- Create notification rules table
CREATE TABLE IF NOT EXISTS tenant_notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system-wide rules
    alert_types JSONB DEFAULT '[]', -- Array of alert types to match
    severities JSONB DEFAULT '[]', -- Array of severities to match
    channels JSONB NOT NULL DEFAULT '[]', -- Array of notification channels
    enabled BOOLEAN DEFAULT TRUE,
    conditions JSONB DEFAULT '{}', -- Additional conditions for triggering
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notification log table
CREATE TABLE IF NOT EXISTS tenant_notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    channel_type VARCHAR(50) NOT NULL, -- email, webhook, slack, teams, sms
    status VARCHAR(20) NOT NULL, -- sent, failed, pending
    error_message TEXT,
    rule_id UUID REFERENCES tenant_notification_rules(id) ON DELETE SET NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system metrics table for detailed monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL, -- cpu, memory, disk, database, etc.
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(20), -- percentage, bytes, milliseconds, etc.
    tags JSONB DEFAULT '{}', -- Additional metadata
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
    factors JSONB DEFAULT '{}', -- Factors contributing to the scores
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, DATE(calculated_at))
);
);

-- Create monitoring dashboards configuration table
CREATE TABLE IF NOT EXISTS monitoring_dashboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system dashboards
    dashboard_type VARCHAR(50) NOT NULL, -- overview, tenant, security, performance
    config JSONB NOT NULL DEFAULT '{}', -- Dashboard configuration
    widgets JSONB NOT NULL DEFAULT '[]', -- Widget configurations
    is_default BOOLEAN DEFAULT FALSE,
    created_by INTEGER, -- User ID who created the dashboard
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_notification_rules_tenant_id ON tenant_notification_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_rules_enabled ON tenant_notification_rules(enabled);

CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_alert_id ON tenant_notification_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_tenant_id ON tenant_notification_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_sent_at ON tenant_notification_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_tenant_notification_log_status ON tenant_notification_log(status);

CREATE INDEX IF NOT EXISTS idx_system_metrics_type_name ON system_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_tenant_health_scores_tenant_id ON tenant_health_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_health_scores_calculated_at ON tenant_health_scores(calculated_at);
CREATE INDEX IF NOT EXISTS idx_tenant_health_scores_overall_score ON tenant_health_scores(overall_score);

CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_tenant_id ON monitoring_dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_type ON monitoring_dashboards(dashboard_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_dashboards_default ON monitoring_dashboards(is_default);

-- Create materialized view for tenant monitoring summary
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_monitoring_summary AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    t.status as tenant_status,
    
    -- Usage metrics (last 7 days)
    COALESCE(SUM(um.api_calls), 0) as api_calls_7d,
    COALESCE(SUM(um.data_operations), 0) as data_operations_7d,
    COALESCE(AVG(um.active_users), 0) as avg_active_users_7d,
    COALESCE(SUM(um.error_count), 0) as errors_7d,
    COALESCE(SUM(um.security_events), 0) as security_events_7d,
    COALESCE(MAX(um.storage_used), 0) as current_storage_used,
    
    -- Alert counts (last 24 hours)
    COALESCE(alert_counts.total_alerts, 0) as alerts_24h,
    COALESCE(alert_counts.critical_alerts, 0) as critical_alerts_24h,
    COALESCE(alert_counts.unacknowledged_alerts, 0) as unacknowledged_alerts_24h,
    
    -- Performance metrics
    COALESCE(perf_metrics.avg_response_time, 0) as avg_response_time_24h,
    COALESCE(perf_metrics.slow_queries, 0) as slow_queries_24h,
    
    -- Health score
    COALESCE(hs.overall_score, 100) as health_score,
    
    -- Last activity
    GREATEST(
        COALESCE(um.updated_at, '1970-01-01'::timestamp),
        COALESCE(alert_counts.last_alert, '1970-01-01'::timestamp),
        COALESCE(hs.calculated_at, '1970-01-01'::timestamp)
    ) as last_activity

FROM tenants t

-- Usage metrics (last 7 days)
LEFT JOIN (
    SELECT 
        tenant_id,
        SUM(api_calls) as api_calls,
        SUM(data_operations) as data_operations,
        AVG(active_users) as active_users,
        SUM(error_count) as error_count,
        SUM(security_events) as security_events,
        MAX(storage_used) as storage_used,
        MAX(updated_at) as updated_at
    FROM tenant_usage_metrics
    WHERE period >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY tenant_id
) um ON t.id = um.tenant_id

-- Alert counts (last 24 hours)
LEFT JOIN (
    SELECT 
        tenant_id,
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE acknowledged = false) as unacknowledged_alerts,
        MAX(created_at) as last_alert
    FROM tenant_alerts
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY tenant_id
) alert_counts ON t.id = alert_counts.tenant_id

-- Performance metrics (would be populated by performance monitoring)
LEFT JOIN (
    SELECT 
        tenant_id,
        AVG(response_time) as avg_response_time,
        COUNT(*) FILTER (WHERE response_time > 1000) as slow_queries
    FROM tenant_performance_metrics
    WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY tenant_id
) perf_metrics ON t.id = perf_metrics.tenant_id

-- Latest health score
LEFT JOIN (
    SELECT DISTINCT ON (tenant_id)
        tenant_id,
        overall_score,
        calculated_at
    FROM tenant_health_scores
    ORDER BY tenant_id, calculated_at DESC
) hs ON t.id = hs.tenant_id

WHERE t.status = 'active'
ORDER BY t.name;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_monitoring_summary_tenant_id 
ON tenant_monitoring_summary(tenant_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_tenant_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_monitoring_summary;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate tenant health scores
CREATE OR REPLACE FUNCTION calculate_tenant_health_score(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    performance_score INTEGER := 100;
    security_score INTEGER := 100;
    usage_score INTEGER := 100;
    overall_score INTEGER;
    
    -- Performance factors
    avg_response_time NUMERIC;
    error_rate NUMERIC;
    
    -- Security factors
    security_events_count INTEGER;
    
    -- Usage factors
    api_calls_count INTEGER;
    storage_usage_percent NUMERIC;
    
BEGIN
    -- Calculate performance score
    SELECT AVG(response_time) INTO avg_response_time
    FROM tenant_performance_metrics
    WHERE tenant_id = p_tenant_id 
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    IF avg_response_time > 2000 THEN
        performance_score := performance_score - 30;
    ELSIF avg_response_time > 1000 THEN
        performance_score := performance_score - 15;
    END IF;
    
    -- Calculate error rate
    SELECT 
        CASE 
            WHEN SUM(api_calls) > 0 THEN (SUM(error_count)::NUMERIC / SUM(api_calls)) * 100
            ELSE 0
        END INTO error_rate
    FROM tenant_usage_metrics
    WHERE tenant_id = p_tenant_id 
      AND period >= CURRENT_DATE - INTERVAL '7 days';
    
    IF error_rate > 5 THEN
        performance_score := performance_score - 25;
    ELSIF error_rate > 2 THEN
        performance_score := performance_score - 10;
    END IF;
    
    -- Calculate security score
    SELECT COUNT(*) INTO security_events_count
    FROM tenant_security_events
    WHERE tenant_id = p_tenant_id 
      AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    IF security_events_count > 10 THEN
        security_score := security_score - 40;
    ELSIF security_events_count > 5 THEN
        security_score := security_score - 20;
    ELSIF security_events_count > 0 THEN
        security_score := security_score - 10;
    END IF;
    
    -- Calculate usage score (based on limits compliance)
    -- This would be more sophisticated in a real implementation
    usage_score := 100; -- Placeholder
    
    -- Calculate overall score (weighted average)
    overall_score := (performance_score * 0.4 + security_score * 0.4 + usage_score * 0.2)::INTEGER;
    
    -- Ensure scores are within bounds
    performance_score := GREATEST(0, LEAST(100, performance_score));
    security_score := GREATEST(0, LEAST(100, security_score));
    usage_score := GREATEST(0, LEAST(100, usage_score));
    overall_score := GREATEST(0, LEAST(100, overall_score));
    
    -- Insert or update health score
    INSERT INTO tenant_health_scores (
        tenant_id, overall_score, performance_score, security_score, usage_score,
        factors
    ) VALUES (
        p_tenant_id, overall_score, performance_score, security_score, usage_score,
        jsonb_build_object(
            'avg_response_time', COALESCE(avg_response_time, 0),
            'error_rate', COALESCE(error_rate, 0),
            'security_events', COALESCE(security_events_count, 0)
        )
    )
    ON CONFLICT (tenant_id, DATE(calculated_at))
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        performance_score = EXCLUDED.performance_score,
        security_score = EXCLUDED.security_score,
        usage_score = EXCLUDED.usage_score,
        factors = EXCLUDED.factors,
        calculated_at = CURRENT_TIMESTAMP;
    
    RETURN overall_score;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE tenant_notification_rules IS 'Rules for sending notifications based on alerts';
COMMENT ON TABLE tenant_notification_log IS 'Log of all notification attempts';
COMMENT ON TABLE system_metrics IS 'System-wide performance and health metrics';
COMMENT ON TABLE tenant_health_scores IS 'Calculated health scores for tenants';
COMMENT ON TABLE monitoring_dashboards IS 'Custom monitoring dashboard configurations';

COMMENT ON MATERIALIZED VIEW tenant_monitoring_summary IS 'Aggregated monitoring data for all tenants';
COMMENT ON FUNCTION refresh_tenant_materialized_views() IS 'Refresh all tenant monitoring materialized views';
COMMENT ON FUNCTION calculate_tenant_health_score(UUID) IS 'Calculate health score for a specific tenant';

-- Insert default notification rules for system administrators
INSERT INTO tenant_notification_rules (
    tenant_id, alert_types, severities, channels, enabled
) VALUES 
(
    NULL, -- System-wide rule
    '["security_violation", "provisioning_failure", "system_health"]',
    '["critical", "high"]',
    '[{
        "type": "email",
        "config": {"recipients": ["admin@sistema.com.br"]},
        "enabled": true
    }]',
    true
),
(
    NULL, -- System-wide rule for all critical alerts
    '[]', -- All alert types
    '["critical"]',
    '[{
        "type": "webhook",
        "config": {"url": "http://localhost:3000/api/webhooks/alerts"},
        "enabled": false
    }]',
    false -- Disabled by default, can be enabled when webhook is configured
);

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
        {"type": "performance_chart", "position": {"x": 0, "y": 4, "w": 12, "h": 6}},
        {"type": "recent_alerts", "position": {"x": 0, "y": 10, "w": 6, "h": 6}},
        {"type": "security_events", "position": {"x": 6, "y": 10, "w": 6, "h": 6}}
    ]',
    true
);