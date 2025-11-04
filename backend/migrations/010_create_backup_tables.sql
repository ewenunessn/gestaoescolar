-- Migration: Create backup and disaster recovery tables
-- Description: Add tables to support tenant-specific backup and recovery operations

-- Create tenant_backups table to store backup metadata
CREATE TABLE IF NOT EXISTS tenant_backups (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    size BIGINT NOT NULL DEFAULT 0,
    checksum VARCHAR(64) NOT NULL DEFAULT '',
    tables JSONB NOT NULL DEFAULT '[]',
    compression BOOLEAN NOT NULL DEFAULT false,
    encryption BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant_id ON tenant_backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backups_timestamp ON tenant_backups(timestamp);
CREATE INDEX IF NOT EXISTS idx_tenant_backups_status ON tenant_backups(status);
CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant_timestamp ON tenant_backups(tenant_id, timestamp DESC);

-- Create tenant_restore_points table for point-in-time recovery
CREATE TABLE IF NOT EXISTS tenant_restore_points (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    backup_id VARCHAR(255) NOT NULL REFERENCES tenant_backups(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for restore points
CREATE INDEX IF NOT EXISTS idx_tenant_restore_points_tenant_id ON tenant_restore_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_restore_points_timestamp ON tenant_restore_points(timestamp);
CREATE INDEX IF NOT EXISTS idx_tenant_restore_points_backup_id ON tenant_restore_points(backup_id);

-- Create tenant_backup_schedules table for automated backups
CREATE TABLE IF NOT EXISTS tenant_backup_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    schedule_cron VARCHAR(100) NOT NULL, -- Cron expression for scheduling
    backup_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'differential')),
    retention_days INTEGER NOT NULL DEFAULT 30,
    compression BOOLEAN NOT NULL DEFAULT true,
    encryption BOOLEAN NOT NULL DEFAULT false,
    include_tables JSONB DEFAULT NULL, -- Specific tables to backup, null means all
    exclude_tables JSONB DEFAULT '[]', -- Tables to exclude from backup
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run TIMESTAMP,
    next_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for backup schedules
CREATE INDEX IF NOT EXISTS idx_tenant_backup_schedules_tenant_id ON tenant_backup_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_schedules_active ON tenant_backup_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_schedules_next_run ON tenant_backup_schedules(next_run) WHERE is_active = true;

-- Create tenant_backup_logs table for backup operation logging
CREATE TABLE IF NOT EXISTS tenant_backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    backup_id VARCHAR(255) REFERENCES tenant_backups(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES tenant_backup_schedules(id) ON DELETE SET NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('backup', 'restore', 'validate', 'cleanup')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    error_message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for backup logs
CREATE INDEX IF NOT EXISTS idx_tenant_backup_logs_tenant_id ON tenant_backup_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_logs_backup_id ON tenant_backup_logs(backup_id);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_logs_operation_type ON tenant_backup_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_logs_status ON tenant_backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_tenant_backup_logs_start_time ON tenant_backup_logs(start_time);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_tenant_backups_updated_at 
    BEFORE UPDATE ON tenant_backups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_backup_schedules_updated_at 
    BEFORE UPDATE ON tenant_backup_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for tenant isolation
ALTER TABLE tenant_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_restore_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_backup_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_backup_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation_backups ON tenant_backups
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_restore_points ON tenant_restore_points
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_backup_schedules ON tenant_backup_schedules
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_backup_logs ON tenant_backup_logs
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create system admin policies (bypass tenant isolation for system operations)
CREATE POLICY system_admin_backups ON tenant_backups
    USING (current_setting('app.current_user_role', true) = 'system_admin');

CREATE POLICY system_admin_restore_points ON tenant_restore_points
    USING (current_setting('app.current_user_role', true) = 'system_admin');

CREATE POLICY system_admin_backup_schedules ON tenant_backup_schedules
    USING (current_setting('app.current_user_role', true) = 'system_admin');

CREATE POLICY system_admin_backup_logs ON tenant_backup_logs
    USING (current_setting('app.current_user_role', true) = 'system_admin');

-- Insert default backup schedules for existing tenants
INSERT INTO tenant_backup_schedules (tenant_id, name, schedule_cron, backup_type, retention_days)
SELECT 
    id,
    'Daily Full Backup',
    '0 2 * * *', -- Daily at 2 AM
    'full',
    30
FROM tenants 
WHERE status = 'active'
ON CONFLICT DO NOTHING;

-- Create view for backup statistics
CREATE OR REPLACE VIEW tenant_backup_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(tb.id) as total_backups,
    COUNT(CASE WHEN tb.status = 'completed' THEN 1 END) as successful_backups,
    COUNT(CASE WHEN tb.status = 'failed' THEN 1 END) as failed_backups,
    MAX(tb.timestamp) as last_backup,
    SUM(CASE WHEN tb.status = 'completed' THEN tb.size ELSE 0 END) as total_backup_size,
    AVG(CASE WHEN tb.status = 'completed' THEN tb.size ELSE NULL END) as avg_backup_size
FROM tenants t
LEFT JOIN tenant_backups tb ON t.id = tb.tenant_id
GROUP BY t.id, t.name;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_backups TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_restore_points TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_backup_schedules TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_backup_logs TO postgres;
GRANT SELECT ON tenant_backup_stats TO postgres;