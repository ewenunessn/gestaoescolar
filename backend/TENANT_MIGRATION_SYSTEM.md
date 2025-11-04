# Tenant Migration System

A comprehensive database migration system designed for multi-tenant applications with support for tenant-specific migrations, rollbacks, and recovery mechanisms.

## Features

- ✅ **Tenant-specific migrations**: Run migrations for specific tenants or globally
- ✅ **Migration templates**: Pre-built templates for common operations
- ✅ **Rollback support**: Full rollback capabilities with dependency tracking
- ✅ **Recovery mechanisms**: Recover from failed migrations
- ✅ **Status tracking**: Track migration status per tenant
- ✅ **Bulk operations**: Apply migrations to multiple tables at once
- ✅ **CLI interface**: Command-line tools for migration management
- ✅ **API endpoints**: REST API for programmatic migration management
- ✅ **Integrity validation**: Validate migration consistency and dependencies

## Quick Start

### 1. Initialize the Migration System

```bash
# Build the project first
npm run build

# Initialize migration tracking tables
npm run init:tenant-migrations
```

### 2. Create Your First Migration

```bash
# Create a new migration
npm run migrate:tenant-system create "Add user roles" "Add role column to users table"

# Or generate from template
npm run migrate:tenant-system generate add-tenant-id --table users --default-tenant 00000000-0000-0000-0000-000000000000
```

### 3. Run Migrations

```bash
# Run all pending migrations
npm run migrate:tenant-system run

# Run migrations for specific tenant
npm run migrate:tenant-system run --tenant 123e4567-e89b-12d3-a456-426614174000

# Run specific migration
npm run migrate:tenant-system run --migration 20231201120000_add_user_roles
```

### 4. Check Migration Status

```bash
# Check global migration status
npm run migrate:tenant-system status

# Check tenant-specific status
npm run migrate:tenant-system status --tenant 123e4567-e89b-12d3-a456-426614174000
```

## Migration Templates

The system includes several pre-built templates for common operations:

### Add Tenant ID Column

```bash
npm run migrate:tenant-system generate add-tenant-id --table products --default-tenant 00000000-0000-0000-0000-000000000000
```

### Enable Row Level Security

```bash
npm run migrate:tenant-system generate enable-rls --table products
```

### Bulk Operations

```bash
# Add tenant_id to multiple tables
npm run migrate:tenant-system generate bulk-tenant-id --tables "users,products,orders" --default-tenant 00000000-0000-0000-0000-000000000000

# Enable RLS on multiple tables
npm run migrate:tenant-system generate bulk-rls --tables "users,products,orders"
```

## CLI Commands

### Migration Management

```bash
# Create new migration
migrate:tenant-system create <name> <description> [--tenant-specific]

# Generate from template
migrate:tenant-system generate <template> [options]

# Run migrations
migrate:tenant-system run [--tenant <id>] [--migration <id>]

# Rollback migrations
migrate:tenant-system rollback --migration <id> [--tenant <id>]
migrate:tenant-system rollback --tenant <id> [--to <migration-id>]

# Check status
migrate:tenant-system status [--tenant <id>]

# Recover failed migration
migrate:tenant-system recover --migration <id> [--tenant <id>]

# Validate integrity
migrate:tenant-system validate [--tenant <id>]
```

### Available Templates

- `add-tenant-id`: Add tenant_id column to existing table
- `enable-rls`: Enable Row Level Security with tenant isolation
- `bulk-tenant-id`: Add tenant_id to multiple tables
- `bulk-rls`: Enable RLS on multiple tables
- `create-tenant-table`: Create new table with tenant support

## API Endpoints

The migration system also provides REST API endpoints:

### Migration Status and Information

```http
GET /api/tenant-migrations/status?tenantId=<id>
GET /api/tenant-migrations/definition/:migrationId
GET /api/tenant-migrations/templates
```

### Migration Execution

```http
POST /api/tenant-migrations/run
POST /api/tenant-migrations/rollback
POST /api/tenant-migrations/recover
```

### Migration Creation

```http
POST /api/tenant-migrations/create
POST /api/tenant-migrations/generate
```

### Tenant-specific Operations

```http
POST /api/tenant-migrations/tenant/:tenantId/run
```

### Validation

```http
GET /api/tenant-migrations/validate?tenantId=<id>
```

## Migration Structure

### Migration Definition

```typescript
interface MigrationDefinition {
  id: string;                    // Unique migration identifier
  name: string;                  // Human-readable name
  description: string;           // Detailed description
  upSql: string;                // SQL to apply migration
  downSql: string;              // SQL to rollback migration
  tenantSpecific: boolean;      // Whether migration is tenant-specific
  dependencies?: string[];      // Migration dependencies
  createdAt: Date;              // Creation timestamp
}
```

### Migration Status

```typescript
interface MigrationStatus {
  id: string;                    // Status record ID
  migrationId: string;          // Migration identifier
  tenantId?: string;            // Tenant ID (null for global)
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  appliedAt?: Date;             // When migration was applied
  rolledBackAt?: Date;          // When migration was rolled back
  error?: string;               // Error message if failed
  executionTime?: number;       // Execution time in milliseconds
}
```

## Directory Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── tenantMigrationService.ts    # Core migration service
│   │   └── migrationTemplates.ts        # Migration templates
│   ├── controllers/
│   │   └── tenantMigrationController.ts # API controller
│   ├── routes/
│   │   └── tenantMigrationRoutes.ts     # API routes
│   └── cli/
│       └── tenantMigrationCli.ts        # CLI interface
├── migrations/
│   └── tenant/                          # Tenant migration files
│       ├── system/                      # System-wide migrations
│       ├── tenant-specific/             # Tenant-specific migrations
│       └── data/                        # Data migrations
├── run-tenant-migrations.js             # Migration runner script
├── init-tenant-migration-system.js      # System initialization
└── test-tenant-migration-system.js      # Test suite
```

## Best Practices

### 1. Migration Naming

Use descriptive names with timestamps:
```
20231201120000_add_tenant_id_to_users
20231201130000_enable_rls_products
20231201140000_migrate_legacy_data
```

### 2. Rollback Safety

Always provide rollback SQL:
```sql
-- Up migration
ALTER TABLE users ADD COLUMN tenant_id UUID;

-- Down migration  
ALTER TABLE users DROP COLUMN tenant_id;
```

### 3. Tenant Context

For tenant-specific migrations, use the tenant context:
```sql
-- Use current tenant setting
INSERT INTO configurations (tenant_id, key, value)
VALUES (current_setting('app.current_tenant_id')::UUID, 'feature', 'enabled');
```

### 4. Dependencies

Specify migration dependencies:
```typescript
{
  name: 'Enable RLS on Users',
  dependencies: ['20231201120000_add_tenant_id_to_users']
}
```

### 5. Testing

Always test migrations:
```bash
# Test the migration system
npm run test:tenant-migrations

# Test specific migration
npm run migrate:tenant-system run --migration <id>
npm run migrate:tenant-system rollback --migration <id>
```

## Error Handling

The system provides comprehensive error handling:

### Failed Migrations

```bash
# Check failed migrations
npm run migrate:tenant-system status

# Recover failed migration
npm run migrate:tenant-system recover --migration <id>
```

### Rollback Issues

```bash
# Validate migration integrity
npm run migrate:tenant-system validate

# Manual recovery if needed
npm run migrate:tenant-system rollback --migration <id> --tenant <id>
```

## Monitoring

### Migration Status

Monitor migration status through:
- CLI status commands
- API endpoints
- Database queries on `tenant_migration_status`

### Performance

Track migration performance:
- Execution times are recorded
- Failed migrations are logged
- Recovery attempts are tracked

## Security Considerations

### Tenant Isolation

- Migrations respect tenant boundaries
- Row Level Security policies are enforced
- Cross-tenant access is prevented

### SQL Injection Prevention

- All parameters are properly escaped
- Template-generated SQL is validated
- User input is sanitized

### Access Control

- Migration operations require appropriate permissions
- Tenant-specific operations validate tenant access
- System migrations require admin privileges

## Troubleshooting

### Common Issues

1. **Migration fails with permission error**
   - Check database user permissions
   - Verify RLS policies are not blocking operations

2. **Tenant context not set**
   - Ensure tenant middleware is properly configured
   - Check `app.current_tenant_id` setting

3. **Rollback fails**
   - Verify rollback SQL is correct
   - Check for data dependencies

4. **Migration stuck in running state**
   - Use recovery mechanism
   - Check for database locks

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm run migrate:tenant-system status
```

## Contributing

When adding new migration templates or features:

1. Add template to `migrationTemplates.ts`
2. Update CLI commands in `tenantMigrationCli.ts`
3. Add API endpoints if needed
4. Update tests in `test-tenant-migration-system.js`
5. Update this documentation

## Testing

Run the comprehensive test suite:

```bash
# Run all migration system tests
npm run test:tenant-migrations

# Test specific functionality
npm run migrate:tenant-system validate
```

The test suite covers:
- Migration creation and execution
- Rollback mechanisms
- Recovery procedures
- Tenant-specific operations
- Bulk operations
- Integrity validation

## Support

For issues or questions:
1. Check the troubleshooting section
2. Run the test suite to identify issues
3. Check migration logs in the database
4. Validate migration integrity