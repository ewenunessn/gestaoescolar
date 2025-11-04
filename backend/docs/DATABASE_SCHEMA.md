# Database Schema Documentation

## Overview

This document describes the database schema for the multi-tenant school management system. The schema implements a row-level security (RLS) approach for tenant isolation while maintaining performance and data integrity.

## Database Design Principles

### Multi-Tenancy Strategy
- **Row-Level Security (RLS)**: Each table includes a `tenant_id` column with RLS policies
- **Shared Database**: All tenants share the same database with logical separation
- **Tenant Isolation**: Complete data isolation enforced at the database level
- **Performance Optimization**: Composite indexes with `tenant_id` for optimal query performance

### Naming Conventions
- **Tables**: Lowercase with underscores (e.g., `tenant_users`)
- **Columns**: Lowercase with underscores (e.g., `created_at`)
- **Indexes**: Prefixed with `idx_` (e.g., `idx_escolas_tenant_nome`)
- **Foreign Keys**: Prefixed with `fk_` (e.g., `fk_escolas_tenant_id`)
- **Constraints**: Prefixed with `chk_` (e.g., `chk_tenant_status`)

## Core Tenant Tables

### tenants

Central registry for all tenants in the system.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deprovisioning')),
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Constraints
ALTER TABLE tenants ADD CONSTRAINT chk_tenant_slug_format 
    CHECK (slug ~ '^[a-z0-9-]+$');
```

**Columns:**
- `id`: Unique tenant identifier (UUID)
- `slug`: URL-friendly identifier for tenant
- `name`: Display name of the tenant organization
- `domain`: Custom domain (optional)
- `subdomain`: Subdomain for multi-tenant access
- `status`: Current status of the tenant
- `settings`: JSON configuration for features, branding, etc.
- `limits`: JSON configuration for resource limits
- `created_at`: Timestamp when tenant was created
- `updated_at`: Timestamp when tenant was last updated

### tenant_configurations

Flexible configuration system for tenant-specific settings.

```sql
CREATE TABLE tenant_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, category, key)
);

-- Indexes
CREATE INDEX idx_tenant_configurations_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configurations_category ON tenant_configurations(tenant_id, category);
CREATE INDEX idx_tenant_configurations_key ON tenant_configurations(tenant_id, category, key);
```

**Columns:**
- `id`: Unique configuration identifier
- `tenant_id`: Reference to tenant
- `category`: Configuration category (features, branding, limits, etc.)
- `key`: Configuration key within category
- `value`: JSON value for the configuration
- `version`: Version number for configuration versioning
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### tenant_users

Association table linking users to tenants with roles.

```sql
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('system_admin', 'tenant_admin', 'school_admin', 'user', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(tenant_id, role);
```

**Columns:**
- `id`: Unique association identifier
- `tenant_id`: Reference to tenant
- `user_id`: Reference to user
- `role`: User role within the tenant
- `status`: Status of user in tenant
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## Multi-Tenant Business Tables

### escolas (Schools)

```sql
CREATE TABLE escolas (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(255),
    responsavel VARCHAR(255),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, codigo)
);

-- Enable RLS
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_escolas ON escolas
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX idx_escolas_tenant_id ON escolas(tenant_id);
CREATE INDEX idx_escolas_tenant_codigo ON escolas(tenant_id, codigo);
CREATE INDEX idx_escolas_tenant_nome ON escolas(tenant_id, nome);
CREATE INDEX idx_escolas_tenant_status ON escolas(tenant_id, status);
```

### produtos (Products)

```sql
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    unidade VARCHAR(10) NOT NULL,
    preco DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'descontinuado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, codigo)
);

-- Enable RLS
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_produtos ON produtos
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX idx_produtos_tenant_id ON produtos(tenant_id);
CREATE INDEX idx_produtos_tenant_codigo ON produtos(tenant_id, codigo);
CREATE INDEX idx_produtos_tenant_nome ON produtos(tenant_id, nome);
CREATE INDEX idx_produtos_tenant_categoria ON produtos(tenant_id, categoria);
```

### usuarios (Users)

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    cargo VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente', 'suspenso')),
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- RLS Policy (users can see users in their tenant or system admins)
CREATE POLICY tenant_isolation_usuarios ON usuarios
    USING (
        tenant_id = current_setting('app.current_tenant_id')::UUID OR
        current_setting('app.user_role', true) = 'system_admin'
    );

-- Indexes
CREATE INDEX idx_usuarios_tenant_id ON usuarios(tenant_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tenant_status ON usuarios(tenant_id, status);
```

### contratos (Contracts)

```sql
CREATE TABLE contratos (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL,
    fornecedor_id INTEGER REFERENCES fornecedores(id),
    valor_total DECIMAL(12,2) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'vencido', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, numero)
);

-- Enable RLS
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_contratos ON contratos
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX idx_contratos_tenant_id ON contratos(tenant_id);
CREATE INDEX idx_contratos_tenant_numero ON contratos(tenant_id, numero);
CREATE INDEX idx_contratos_tenant_status ON contratos(tenant_id, status);
CREATE INDEX idx_contratos_tenant_datas ON contratos(tenant_id, data_inicio, data_fim);
```

### estoque_escolas (School Inventory)

```sql
CREATE TABLE estoque_escolas (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    escola_id INTEGER NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    quantidade DECIMAL(10,3) DEFAULT 0,
    quantidade_minima DECIMAL(10,3) DEFAULT 0,
    validade DATE,
    lote VARCHAR(50),
    preco_unitario DECIMAL(10,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, escola_id, produto_id, lote)
);

-- Enable RLS
ALTER TABLE estoque_escolas ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_estoque_escolas ON estoque_escolas
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX idx_estoque_escolas_tenant_id ON estoque_escolas(tenant_id);
CREATE INDEX idx_estoque_escolas_tenant_escola ON estoque_escolas(tenant_id, escola_id);
CREATE INDEX idx_estoque_escolas_tenant_produto ON estoque_escolas(tenant_id, produto_id);
CREATE INDEX idx_estoque_escolas_tenant_validade ON estoque_escolas(tenant_id, validade);
CREATE INDEX idx_estoque_escolas_tenant_quantidade ON estoque_escolas(tenant_id, quantidade);
```

### pedidos (Orders)

```sql
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL,
    escola_id INTEGER NOT NULL REFERENCES escolas(id),
    contrato_id INTEGER REFERENCES contratos(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    data_pedido DATE DEFAULT CURRENT_DATE,
    data_entrega_prevista DATE,
    valor_total DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'entregue', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, numero)
);

-- Enable RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_pedidos ON pedidos
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX idx_pedidos_tenant_id ON pedidos(tenant_id);
CREATE INDEX idx_pedidos_tenant_numero ON pedidos(tenant_id, numero);
CREATE INDEX idx_pedidos_tenant_escola ON pedidos(tenant_id, escola_id);
CREATE INDEX idx_pedidos_tenant_status ON pedidos(tenant_id, status);
CREATE INDEX idx_pedidos_tenant_data ON pedidos(tenant_id, data_pedido);
```

### itens_pedido (Order Items)

```sql
CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id),
    quantidade DECIMAL(10,3) NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    valor_total DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    observacoes TEXT
);

-- Enable RLS
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY tenant_isolation_itens_pedido ON itens_pedido
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Indexes
CREATE INDEX idx_itens_pedido_tenant_id ON itens_pedido(tenant_id);
CREATE INDEX idx_itens_pedido_tenant_pedido ON itens_pedido(tenant_id, pedido_id);
CREATE INDEX idx_itens_pedido_tenant_produto ON itens_pedido(tenant_id, produto_id);
```

## Audit and Monitoring Tables

### tenant_audit_logs

Comprehensive audit logging for all tenant operations.

```sql
CREATE TABLE tenant_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES usuarios(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenant_audit_logs_tenant_id ON tenant_audit_logs(tenant_id);
CREATE INDEX idx_tenant_audit_logs_user_id ON tenant_audit_logs(tenant_id, user_id);
CREATE INDEX idx_tenant_audit_logs_action ON tenant_audit_logs(tenant_id, action);
CREATE INDEX idx_tenant_audit_logs_resource ON tenant_audit_logs(tenant_id, resource_type, resource_id);
CREATE INDEX idx_tenant_audit_logs_created_at ON tenant_audit_logs(tenant_id, created_at);
```

### tenant_performance_metrics

Performance monitoring data per tenant.

```sql
CREATE TABLE tenant_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenant_performance_metrics_tenant_id ON tenant_performance_metrics(tenant_id);
CREATE INDEX idx_tenant_performance_metrics_name ON tenant_performance_metrics(tenant_id, metric_name);
CREATE INDEX idx_tenant_performance_metrics_recorded_at ON tenant_performance_metrics(tenant_id, recorded_at);
```

### tenant_notifications

Notification system for tenant events.

```sql
CREATE TABLE tenant_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES usuarios(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'read')),
    scheduled_at TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenant_notifications_tenant_id ON tenant_notifications(tenant_id);
CREATE INDEX idx_tenant_notifications_user_id ON tenant_notifications(tenant_id, user_id);
CREATE INDEX idx_tenant_notifications_type ON tenant_notifications(tenant_id, type);
CREATE INDEX idx_tenant_notifications_status ON tenant_notifications(tenant_id, status);
```

## Migration and Backup Tables

### tenant_migrations

Track migration status per tenant.

```sql
CREATE TABLE tenant_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    migration_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, migration_name, version)
);

-- Indexes
CREATE INDEX idx_tenant_migrations_tenant_id ON tenant_migrations(tenant_id);
CREATE INDEX idx_tenant_migrations_status ON tenant_migrations(tenant_id, status);
CREATE INDEX idx_tenant_migrations_version ON tenant_migrations(tenant_id, version);
```

### tenant_backups

Backup management per tenant.

```sql
CREATE TABLE tenant_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
    file_path TEXT NOT NULL,
    file_size BIGINT,
    compression_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_tenant_backups_tenant_id ON tenant_backups(tenant_id);
CREATE INDEX idx_tenant_backups_type ON tenant_backups(tenant_id, backup_type);
CREATE INDEX idx_tenant_backups_status ON tenant_backups(tenant_id, status);
CREATE INDEX idx_tenant_backups_created_at ON tenant_backups(tenant_id, created_at);
```

## Views and Functions

### Tenant Context Functions

```sql
-- Function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to validate tenant access
CREATE OR REPLACE FUNCTION validate_tenant_access(resource_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN resource_tenant_id = get_current_tenant_id();
END;
$$ LANGUAGE plpgsql;
```

### Useful Views

```sql
-- View for tenant statistics
CREATE VIEW tenant_statistics AS
SELECT 
    t.id,
    t.slug,
    t.name,
    t.status,
    COUNT(DISTINCT tu.user_id) as user_count,
    COUNT(DISTINCT e.id) as school_count,
    COUNT(DISTINCT p.id) as product_count,
    COUNT(DISTINCT c.id) as contract_count,
    t.created_at
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.status = 'active'
LEFT JOIN escolas e ON t.id = e.tenant_id AND e.status = 'ativo'
LEFT JOIN produtos p ON t.id = p.tenant_id AND p.status = 'ativo'
LEFT JOIN contratos c ON t.id = c.tenant_id AND c.status = 'ativo'
GROUP BY t.id, t.slug, t.name, t.status, t.created_at;

-- View for inventory summary
CREATE VIEW inventory_summary AS
SELECT 
    ee.tenant_id,
    e.id as escola_id,
    e.nome as escola_nome,
    p.id as produto_id,
    p.nome as produto_nome,
    p.categoria,
    SUM(ee.quantidade) as quantidade_total,
    MIN(ee.validade) as proxima_validade,
    COUNT(*) as lotes_count
FROM estoque_escolas ee
JOIN escolas e ON ee.escola_id = e.id
JOIN produtos p ON ee.produto_id = p.id
WHERE ee.quantidade > 0
GROUP BY ee.tenant_id, e.id, e.nome, p.id, p.nome, p.categoria;
```

## Triggers and Constraints

### Automatic Timestamp Updates

```sql
-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_tenants_updated_at 
    BEFORE UPDATE ON tenants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escolas_updated_at 
    BEFORE UPDATE ON escolas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (apply to other tables)
```

### Tenant Validation Triggers

```sql
-- Function to validate tenant context on insert/update
CREATE OR REPLACE FUNCTION validate_tenant_context()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id != get_current_tenant_id() AND 
       current_setting('app.user_role', true) != 'system_admin' THEN
        RAISE EXCEPTION 'Cross-tenant operation not allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to multi-tenant tables
CREATE TRIGGER validate_escolas_tenant_context
    BEFORE INSERT OR UPDATE ON escolas
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

-- ... (apply to other multi-tenant tables)
```

## Performance Optimization

### Composite Indexes

All multi-tenant tables have composite indexes with `tenant_id` as the first column:

```sql
-- Examples of optimized indexes
CREATE INDEX idx_escolas_tenant_nome_gin ON escolas USING gin(tenant_id, nome gin_trgm_ops);
CREATE INDEX idx_produtos_tenant_search ON produtos(tenant_id, nome, categoria, codigo);
CREATE INDEX idx_pedidos_tenant_date_status ON pedidos(tenant_id, data_pedido DESC, status);
CREATE INDEX idx_estoque_tenant_escola_produto ON estoque_escolas(tenant_id, escola_id, produto_id);
```

### Partitioning (Future Enhancement)

For very large deployments, consider partitioning by tenant:

```sql
-- Example partitioned table (future enhancement)
CREATE TABLE audit_logs_partitioned (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    -- other columns
) PARTITION BY HASH (tenant_id);

-- Create partitions
CREATE TABLE audit_logs_p0 PARTITION OF audit_logs_partitioned
    FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE audit_logs_p1 PARTITION OF audit_logs_partitioned
    FOR VALUES WITH (modulus 4, remainder 1);
-- ... etc
```

## Security Considerations

### Row Level Security Policies

All multi-tenant tables implement RLS policies that:
1. Filter data based on current tenant context
2. Allow system administrators to access all data
3. Prevent accidental cross-tenant access
4. Log security violations

### Data Encryption

Sensitive data is encrypted at rest:
- Password hashes use bcrypt
- Personal information can be encrypted using pgcrypto
- Backup files are encrypted

### Access Control

Database access is restricted through:
- Role-based permissions
- Connection limits
- IP restrictions
- SSL/TLS encryption

## Backup and Recovery

### Backup Strategy

1. **Full Backups**: Complete database backup daily
2. **Incremental Backups**: Transaction log backups every 15 minutes
3. **Tenant-Specific Backups**: Individual tenant data backups on demand
4. **Point-in-Time Recovery**: Ability to restore to any point in time

### Recovery Procedures

```sql
-- Restore specific tenant data
SELECT restore_tenant_data('tenant-uuid', '2024-01-01 12:00:00');

-- Verify data integrity after restore
SELECT verify_tenant_data_integrity('tenant-uuid');
```

## Monitoring and Maintenance

### Database Health Checks

```sql
-- Check RLS policy status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' AND tablename LIKE '%tenant%';

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
```

### Performance Monitoring

```sql
-- Monitor slow queries
SELECT 
    query,
    mean_exec_time,
    calls,
    total_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Monitor tenant-specific performance
SELECT 
    tenant_id,
    COUNT(*) as query_count,
    AVG(mean_exec_time) as avg_exec_time
FROM pg_stat_statements pss
JOIN (
    SELECT DISTINCT tenant_id::text as tenant_filter 
    FROM tenants
) t ON pss.query LIKE '%' || t.tenant_filter || '%'
GROUP BY tenant_id
ORDER BY avg_exec_time DESC;
```

## Migration Scripts

### Adding New Multi-Tenant Table

```sql
-- Template for new multi-tenant table
CREATE TABLE new_table (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- other columns
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_new_table ON new_table
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create indexes
CREATE INDEX idx_new_table_tenant_id ON new_table(tenant_id);

-- Add update trigger
CREATE TRIGGER update_new_table_updated_at 
    BEFORE UPDATE ON new_table 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add tenant validation trigger
CREATE TRIGGER validate_new_table_tenant_context
    BEFORE INSERT OR UPDATE ON new_table
    FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();
```

### Adding tenant_id to Existing Table

```sql
-- Add tenant_id column
ALTER TABLE existing_table 
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Update existing records (requires manual data assignment)
-- UPDATE existing_table SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;

-- Make column NOT NULL after data migration
ALTER TABLE existing_table ALTER COLUMN tenant_id SET NOT NULL;

-- Enable RLS
ALTER TABLE existing_table ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY tenant_isolation_existing_table ON existing_table
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Create tenant-aware indexes
CREATE INDEX idx_existing_table_tenant_id ON existing_table(tenant_id);
-- Recreate other indexes with tenant_id as first column
```

## Best Practices

### Query Patterns

1. **Always include tenant_id in WHERE clauses**
2. **Use composite indexes with tenant_id first**
3. **Set tenant context before executing queries**
4. **Use prepared statements for better performance**

### Schema Changes

1. **Always test migrations on a copy of production data**
2. **Use transactions for complex migrations**
3. **Create indexes concurrently to avoid locks**
4. **Validate data integrity after migrations**

### Security

1. **Never bypass RLS policies in application code**
2. **Always validate tenant context in triggers**
3. **Use least privilege principle for database users**
4. **Regularly audit database access logs**

For additional information, refer to:
- [Multi-Tenant Architecture Documentation](./MULTI_TENANT_ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API_DOCUMENTATION.md)