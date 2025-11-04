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