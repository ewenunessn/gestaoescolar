# Multi-Tenant Data Migration Guide

This guide provides comprehensive instructions for migrating existing single-tenant data to a multi-tenant architecture with validation, backup, and rollback capabilities.

## Overview

The data migration system consists of several components:

1. **SQL Migration Functions** - Core database functions for data migration
2. **Migration Script** - Node.js script to execute the migration
3. **Validation Script** - Comprehensive data integrity validation
4. **Rollback Script** - Safe rollback capabilities using backups

## Prerequisites

Before running the data migration:

1. **Database Backup**: Create a full database backup
2. **Tenant Setup**: Ensure tenant tables are created (run migration 001)
3. **Tenant Columns**: Ensure tenant_id columns are added (run migration 002)
4. **Row Level Security**: Ensure RLS is implemented (run migration 003)
5. **Application Downtime**: Plan for application downtime during migration

## Migration Process

### Step 1: Pre-Migration Validation

Run a dry-run to understand what will be migrated:

```bash
node run-data-migration-to-multi-tenant.js --dry-run
```

This will show:
- Tables that need migration
- Number of records per table
- Estimated migration time
- Any potential issues

### Step 2: Execute Migration

Run the full migration with backups:

```bash
node run-data-migration-to-multi-tenant.js
```

Options:
- `--dry-run`: Validation only, no changes
- `--no-backup`: Skip creating backup tables (not recommended)
- `--tenant-id=UUID`: Specify custom tenant ID
- `--help`: Show help message

### Step 3: Post-Migration Validation

Validate data integrity after migration:

```bash
node validate-multi-tenant-data.js
```

Options:
- `--table=name`: Validate specific table only
- `--fix-issues`: Automatically fix found issues
- `--export-csv`: Export results to CSV file

## Migration Components

### 1. SQL Migration Functions

Located in `migrations/009_data_migration_to_multi_tenant.sql`:

#### Core Functions:

- `migrate_existing_data_to_multi_tenant()`: Main migration function
- `assign_tenant_to_existing_data()`: Assigns tenant to records
- `validate_data_integrity()`: Validates data after migration
- `create_migration_backup()`: Creates backup tables
- `rollback_migration()`: Rollback using backups

#### Tracking Tables:

- `data_migration_log`: Tracks all migration operations
- `data_migration_validation`: Stores validation results

### 2. Migration Script Features

The Node.js migration script provides:

- **Pre-migration validation**: Checks system readiness
- **Progress tracking**: Shows migration progress
- **Error handling**: Comprehensive error reporting
- **Backup creation**: Automatic backup table creation
- **Post-migration validation**: Automatic integrity checks
- **Detailed logging**: Complete operation logs

### 3. Validation Script Features

The validation script checks:

- **Tenant References**: NULL or orphaned tenant_id values
- **Foreign Key Integrity**: Cross-tenant references
- **Table Structure**: Proper indexes and constraints
- **Data Distribution**: Tenant data distribution analysis

### 4. Rollback Script Features

The rollback script provides:

- **Backup Listing**: View available backup tables
- **Selective Rollback**: Rollback specific tables
- **Integrity Validation**: Validates backup before rollback
- **Cleanup Options**: Remove backup tables after rollback

## Tables Migrated

The migration handles these table categories:

### Core Business Tables
- `escolas` (Schools)
- `produtos` (Products)
- `usuarios` (Users)
- `fornecedores` (Suppliers)
- `contratos` (Contracts)
- `modalidades` (Modalities)

### Inventory Tables
- `estoque_escolas` (School Inventory)
- `estoque_lotes` (Inventory Batches)
- `estoque_movimentacoes` (Inventory Movements)
- `estoque_escolas_historico` (Inventory History)

### Order Management
- `pedidos` (Orders)
- `pedido_itens` (Order Items)
- `faturamentos` (Billing)
- `faturamento_itens` (Billing Items)

### Delivery Management
- `guias` (Delivery Guides)
- `guia_produto_escola` (Guide Product School)
- `rotas` (Routes)
- `planejamento_entregas` (Delivery Planning)

### System Tables
- `logs_auditoria` (Audit Logs)
- `notificacoes` (Notifications)
- `alertas` (Alerts)

## Tenant Assignment Logic

### Default Tenant
All existing data is assigned to the system tenant:
- **ID**: `00000000-0000-0000-0000-000000000000`
- **Slug**: `sistema-principal`
- **Name**: `Sistema Principal`

### Custom Tenant Assignment
For custom tenant assignment, modify the migration script or use:

```sql
-- Assign specific records to different tenant
UPDATE escolas 
SET tenant_id = 'your-tenant-id-here' 
WHERE municipio = 'Specific Municipality';
```

## Validation Checks

### Pre-Migration Validation
- Tenant tables exist
- Default tenant exists
- Tables have tenant_id columns
- Count of records needing migration

### Post-Migration Validation
- No NULL tenant_id values
- No orphaned tenant references
- Foreign key integrity
- Cross-tenant reference detection
- Index presence validation

### Data Integrity Checks
- Record count consistency
- Referential integrity
- Tenant isolation verification
- Performance index validation

## Backup and Recovery

### Backup Creation
Automatic backup tables are created with naming pattern:
```
{original_table}_backup_{YYYYMMDD_HHMMSS}
```

Example: `escolas_backup_20250127_143022`

### Backup Validation
Before rollback, backups are validated for:
- Table existence
- Data presence
- Structure compatibility
- Record count verification

### Rollback Process
```bash
# List available backups
node rollback-multi-tenant-migration.js --list-backups

# Rollback all tables
node rollback-multi-tenant-migration.js

# Rollback specific table
node rollback-multi-tenant-migration.js --table=escolas

# Dry run rollback
node rollback-multi-tenant-migration.js --dry-run
```

## Error Handling

### Common Issues and Solutions

#### 1. NULL tenant_id Values
**Issue**: Records with NULL tenant_id after migration
**Solution**: 
```bash
node validate-multi-tenant-data.js --fix-issues
```

#### 2. Orphaned References
**Issue**: tenant_id references non-existent tenants
**Solution**: Check tenant table and fix references manually

#### 3. Cross-Tenant References
**Issue**: Foreign keys pointing across tenants
**Solution**: Review business logic and fix data relationships

#### 4. Missing Indexes
**Issue**: No indexes on tenant_id columns
**Solution**: Run index optimization migration

### Migration Failure Recovery

If migration fails:

1. **Check Logs**: Review migration logs for specific errors
2. **Validate Backups**: Ensure backup tables exist
3. **Rollback**: Use rollback script to restore data
4. **Fix Issues**: Address root cause of failure
5. **Retry**: Run migration again after fixes

## Performance Considerations

### Migration Performance
- Large tables may take significant time
- Consider running during maintenance windows
- Monitor database performance during migration

### Post-Migration Performance
- Ensure proper indexes on tenant_id columns
- Update query plans after migration
- Monitor query performance with tenant filtering

### Optimization Recommendations
```sql
-- Create composite indexes for better performance
CREATE INDEX idx_table_tenant_frequently_queried 
ON table_name(tenant_id, frequently_queried_column);

-- Update table statistics
ANALYZE table_name;
```

## Monitoring and Logging

### Migration Logs
All operations are logged in `data_migration_log` table:
```sql
SELECT * FROM data_migration_log 
ORDER BY started_at DESC;
```

### Validation Results
Validation results stored in `data_migration_validation` table:
```sql
SELECT * FROM data_migration_validation 
WHERE validation_status = 'FAIL';
```

### Performance Monitoring
Monitor migration performance:
```sql
SELECT 
    table_name,
    operation,
    records_processed,
    completed_at - started_at as duration
FROM data_migration_log 
WHERE operation = 'COMPLETE';
```

## Testing Recommendations

### Pre-Production Testing
1. **Test Environment**: Run migration on copy of production data
2. **Performance Testing**: Measure migration time and resource usage
3. **Application Testing**: Verify application works with migrated data
4. **Rollback Testing**: Test rollback procedures

### Production Deployment
1. **Maintenance Window**: Schedule appropriate downtime
2. **Database Backup**: Create full backup before migration
3. **Monitoring**: Monitor system resources during migration
4. **Validation**: Run comprehensive validation after migration

## Troubleshooting

### Common Commands

```bash
# Check migration status
node validate-multi-tenant-data.js --report-only

# List backup tables
node rollback-multi-tenant-migration.js --list-backups

# Check specific table
node validate-multi-tenant-data.js --table=escolas

# Export validation report
node validate-multi-tenant-data.js --export-csv
```

### SQL Queries for Troubleshooting

```sql
-- Check tables without tenant_id
SELECT table_name 
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name NOT LIKE '%_backup_%'
AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.table_name 
    AND c.column_name = 'tenant_id'
);

-- Check records without tenant assignment
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE tablename LIKE '%tenant%';

-- Check tenant distribution
SELECT 
    t.name as tenant_name,
    COUNT(*) as table_count
FROM tenants t
JOIN information_schema.columns c ON c.column_name = 'tenant_id'
GROUP BY t.id, t.name;
```

## Security Considerations

### Data Privacy
- Ensure tenant isolation is maintained
- Validate no cross-tenant data leakage
- Review audit logs for unauthorized access

### Access Control
- Limit migration script access to authorized personnel
- Use database roles with minimal required permissions
- Log all migration activities

### Backup Security
- Secure backup tables with appropriate permissions
- Consider encrypting sensitive backup data
- Implement backup retention policies

## Support and Maintenance

### Regular Maintenance
- Monitor tenant data growth
- Review and optimize indexes
- Clean up old backup tables
- Update migration scripts for new tables

### Documentation Updates
- Keep migration procedures updated
- Document any custom tenant assignments
- Maintain troubleshooting guides

### Support Contacts
For migration issues:
1. Check this documentation
2. Review migration logs
3. Run validation scripts
4. Contact system administrator

---

## Quick Reference

### Essential Commands
```bash
# Full migration with validation
node run-data-migration-to-multi-tenant.js

# Validate data integrity
node validate-multi-tenant-data.js

# Rollback if needed
node rollback-multi-tenant-migration.js

# List backups
node rollback-multi-tenant-migration.js --list-backups
```

### Important Files
- `migrations/009_data_migration_to_multi_tenant.sql` - SQL functions
- `run-data-migration-to-multi-tenant.js` - Migration script
- `validate-multi-tenant-data.js` - Validation script
- `rollback-multi-tenant-migration.js` - Rollback script
- `DATA_MIGRATION_GUIDE.md` - This documentation

### Key Tables
- `data_migration_log` - Migration operation logs
- `data_migration_validation` - Validation results
- `tenants` - Tenant registry
- `{table}_backup_{timestamp}` - Backup tables