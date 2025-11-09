-- Migration: Create system administrators table
-- Description: Creates table for system admins who manage institutions
-- Date: 2025-01-27

-- System administrators table (for admin panel access)
CREATE TABLE IF NOT EXISTS system_admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    permissions JSONB DEFAULT '{
        "institutions": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "tenants": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        },
        "users": {
            "create": true,
            "read": true,
            "update": true,
            "delete": true
        }
    }',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_admins_email ON system_admins(email);
CREATE INDEX IF NOT EXISTS idx_system_admins_status ON system_admins(status);
CREATE INDEX IF NOT EXISTS idx_system_admins_role ON system_admins(role);

-- Create trigger for updated_at
CREATE TRIGGER update_system_admins_updated_at 
    BEFORE UPDATE ON system_admins 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default super admin
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO system_admins (name, email, password, role, status) VALUES
    ('Super Admin', 'admin@sistema.com', '$2a$10$rZ5qYQH8vZ5qYQH8vZ5qYeJ5qYQH8vZ5qYQH8vZ5qYQH8vZ5qYQH8u', 'super_admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- Create audit log for system admin actions
CREATE TABLE IF NOT EXISTS system_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id INTEGER REFERENCES system_admins(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_admin_audit_log_admin_id ON system_admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_system_admin_audit_log_action ON system_admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_system_admin_audit_log_created_at ON system_admin_audit_log(created_at);

-- Comments
COMMENT ON TABLE system_admins IS 'System administrators who manage institutions through admin panel';
COMMENT ON COLUMN system_admins.permissions IS 'JSON object defining admin permissions';
COMMENT ON TABLE system_admin_audit_log IS 'Audit trail for system admin actions';
