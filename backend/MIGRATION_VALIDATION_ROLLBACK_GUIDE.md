# Inventory Tenant Migration - Validation and Rollback Guide

This guide provides comprehensive documentation for the validation and rollback mechanisms implemented for the inventory tenant migration system.

## Overview

The migration validation and rollback system consists of several interconnected components that ensure data integrity, provide comprehensive logging, and enable safe rollback operations.

## Components

### 1. Migration Orchestrator (`migration-orchestrator.js`)
Central coordinator for all migration operations.

**Usage:**
```bash
node backend/scripts/migration-orchestrator.js <command> [options]
```

**Commands:**
- `migrate` - Run the full migration process
- `validate` - Validate migration results
- `rollback` - Rollback migration changes
- `verify` - Verify data integrity
- `status` - Check current migration status
- `full` - Run complete migration workflow

**Options:**
- `--dry-run` - Simulate operations without making changes
- `--force` - Force operations even with warnings
- `--fix-issues` - Automatically fix detected issues
- `--preserve-data` - Preserve data during rollback
- `--detailed` - Show detailed output
- `--export-report` - Export detailed reports

### 2. Migration Validator (`inventory-migration-validator.js`)
Comprehensive validation of migration results.

**Features:**
- Table structure validation
- Data completeness checks
- Referential integrity verification
- Tenant consistency validation
- Index and RLS policy verification
- Automatic issue fixing (optional)

**Usage:**
```bash
node backend/scripts/inventory-migration-validator.js [--detailed] [--fix-issues] [--export-report]
```

### 3. Migration Rollback (`inventory-migration-rollback.js`)
Safe rollback of migration changes with comprehensive backup.

**Features:**
- Pre-rollback validation
- Automatic backup creation
- Step-by-step rollback with logging
- Selective rollback options
- Post-rollback verification

**Usage:**
```bash
node backend/scripts/inventory-migration-rollback.js [--confirm] [--preserve-data] [--dry-run]
```

### 4. Data Integrity Verifier (`data-integrity-verifier.js`)
Deep validation of data consistency and business logic compliance.

**Features:**
- Business logic validation
- Cross-tenant data isolation verification
- Performance index validation
- Data distribution analysis
- Automatic issue resolution

**Usage:**
```bash
node backend/scripts/data-integrity-verifier.js [--fix-issues] [--detailed] [--export-report]
```

### 5. Migration Logger (`migration-logger.js`)
Centralized logging system with structured reporting.

**Features:**
- Structured logging with multiple levels
- Automatic report generation
- CSV export capabilities
- Session tracking and metrics
- File and console output

## Migration Workflow

### 1. Pre-Migration Validation

Before running the migration, check the current system status:

```bash
# Check current migration status
node backend/scripts/migration-orchestrator.js status

# Run pre-migration validation
node backend/scripts/inventory-migration-validator.js --detailed
```

### 2. Running the Migration

Execute the full migration workflow:

```bash
# Run complete migration workflow with validation
node backend/scripts/migration-orchestrator.js full --export-report

# Or run individual steps
node backend/scripts/migration-orchestrator.js migrate
node backend/scripts/migration-orchestrator.js validate
node backend/scripts/migration-orchestrator.js verify
```

### 3. Post-Migration Validation

After migration completion, perform comprehensive validation:

```bash
# Validate migration results
node backend/scripts/migration-orchestrator.js validate --detailed --export-report

# Verify data integrity
node backend/scripts/migration-orchestrator.js verify --fix-issues --export-report

# Check final status
node backend/scripts/migration-orchestrator.js status
```

### 4. Rollback (if needed)

If issues are detected, perform a safe rollback:

```bash
# Dry run rollback to see what would be changed
node backend/scripts/migration-orchestrator.js rollback --dry-run

# Perform actual rollback (preserving data)
node backend/scripts/migration-orchestrator.js rollback --preserve-data --export-report

# Complete rollback (removing all tenant infrastructure)
node backend/scripts/migration-orchestrator.js rollback --confirm
```

## Validation Checks

### Structure Validation
- ✅ Tenant_id columns exist in all inventory tables
- ✅ Required foreign key constraints are in place
- ✅ NOT NULL constraints are properly set

### Data Completeness
- ✅ All records have tenant_id assigned
- ✅ No orphaned records exist
- ✅ Data distribution is reasonable across tenants

### Referential Integrity
- ✅ All foreign key relationships are valid
- ✅ Cross-table tenant consistency is maintained
- ✅ No circular references exist

### Security Validation
- ✅ Row Level Security (RLS) is enabled
- ✅ RLS policies are correctly configured
- ✅ Tenant isolation is enforced

### Performance Validation
- ✅ Tenant-aware indexes are created
- ✅ Query performance is acceptable
- ✅ Index usage is optimized

### Business Logic Validation
- ✅ No negative quantities exist
- ✅ Expiration dates are logical
- ✅ Inventory movements are consistent

## Rollback Scenarios

### Scenario 1: Partial Migration Failure
If migration fails partway through:

```bash
# Check what was completed
node backend/scripts/migration-orchestrator.js status

# Rollback to clean state
node backend/scripts/migration-orchestrator.js rollback --preserve-data
```

### Scenario 2: Data Integrity Issues
If validation finds critical data issues:

```bash
# Try automatic fixing first
node backend/scripts/data-integrity-verifier.js --fix-issues

# If issues persist, rollback
node backend/scripts/migration-orchestrator.js rollback --confirm
```

### Scenario 3: Performance Issues
If migration causes performance problems:

```bash
# Rollback while preserving tenant_id data for analysis
node backend/scripts/migration-orchestrator.js rollback --preserve-data
```

### Scenario 4: Complete Rollback
To completely remove all tenant infrastructure:

```bash
# Full rollback (removes columns, data, indexes, policies)
node backend/scripts/migration-orchestrator.js rollback --confirm
```

## Backup and Recovery

### Automatic Backups
The system automatically creates backups before:
- Running migrations
- Performing rollbacks
- Making destructive changes

Backup tables are named with timestamps:
- `backup_migration_TIMESTAMP_table_name`
- `backup_rollback_TIMESTAMP_table_name`

### Manual Backup Creation
```sql
-- Create manual backup before migration
CREATE TABLE backup_manual_estoque_escolas AS SELECT * FROM estoque_escolas;
CREATE TABLE backup_manual_estoque_lotes AS SELECT * FROM estoque_lotes;
CREATE TABLE backup_manual_estoque_historico AS SELECT * FROM estoque_escolas_historico;
CREATE TABLE backup_manual_estoque_movimentacoes AS SELECT * FROM estoque_movimentacoes;
```

### Recovery from Backup
```sql
-- Restore from backup (example)
TRUNCATE TABLE estoque_escolas;
INSERT INTO estoque_escolas SELECT * FROM backup_migration_TIMESTAMP_estoque_escolas;
```

## Monitoring and Logging

### Log Files
Logs are stored in `backend/logs/` with the following naming convention:
- `migration-SESSIONID.log` - Migration operation logs
- `validation-SESSIONID.log` - Validation operation logs
- `rollback-SESSIONID.log` - Rollback operation logs

### Report Files
Reports are stored in `backend/reports/` with detailed JSON and CSV formats:
- `migration-report-SESSIONID.json` - Detailed migration report
- `validation-report-SESSIONID.json` - Validation results
- `rollback-report-SESSIONID.json` - Rollback operation report

### Real-time Monitoring
```bash
# Monitor migration progress
tail -f backend/logs/migration-*.log

# Monitor validation results
tail -f backend/logs/validation-*.log
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Column tenant_id does not exist"
**Solution:** Run the schema migration first:
```bash
node backend/run-migrations-neon.js 011_add_tenant_to_estoque_tables.sql
```

#### Issue: "Foreign key constraint violation"
**Solution:** Clean up orphaned records:
```bash
node backend/scripts/data-integrity-verifier.js --fix-issues
```

#### Issue: "Migration appears to be stuck"
**Solution:** Check for long-running queries and restart if needed:
```sql
-- Check active queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Kill stuck queries if necessary
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query LIKE '%estoque%';
```

#### Issue: "Rollback fails with constraint errors"
**Solution:** Use force rollback with constraint handling:
```bash
node backend/scripts/migration-orchestrator.js rollback --force --preserve-data
```

### Performance Issues

#### Slow Migration
- Check database connection pool settings
- Verify adequate system resources
- Consider running during low-traffic periods

#### Slow Validation
- Use `--detailed` flag only when necessary
- Run validation in smaller batches
- Check index usage with EXPLAIN ANALYZE

### Data Consistency Issues

#### Cross-tenant Data Leakage
```bash
# Verify tenant isolation
node backend/scripts/data-integrity-verifier.js --detailed

# Fix consistency issues
node backend/scripts/data-integrity-verifier.js --fix-issues
```

#### Missing Tenant Assignments
```bash
# Check for records without tenant_id
node backend/scripts/inventory-migration-validator.js --detailed

# Re-run data migration
node backend/run-inventory-tenant-migration.js
```

## Best Practices

### Before Migration
1. **Create full database backup**
2. **Run validation in dry-run mode**
3. **Test on staging environment first**
4. **Ensure adequate system resources**
5. **Schedule during maintenance window**

### During Migration
1. **Monitor logs continuously**
2. **Check system performance**
3. **Be prepared to rollback if needed**
4. **Don't interrupt the process**

### After Migration
1. **Run comprehensive validation**
2. **Verify application functionality**
3. **Monitor performance metrics**
4. **Keep backups for recovery period**
5. **Document any issues encountered**

### Rollback Considerations
1. **Always create backup before rollback**
2. **Understand data loss implications**
3. **Test rollback on staging first**
4. **Coordinate with application teams**
5. **Plan for re-migration if needed**

## Emergency Procedures

### Emergency Rollback
If immediate rollback is needed:

```bash
# Quick status check
node backend/scripts/migration-orchestrator.js status

# Emergency rollback (preserves data for analysis)
node backend/scripts/migration-orchestrator.js rollback --preserve-data --force

# If complete removal is needed
node backend/scripts/migration-orchestrator.js rollback --confirm --force
```

### Data Recovery
If data corruption is detected:

```bash
# Stop all applications using the database
# Restore from most recent backup
# Re-run migration with fixes

# Check backup tables
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'backup_%';

# Restore specific table
INSERT INTO estoque_escolas SELECT * FROM backup_migration_TIMESTAMP_estoque_escolas;
```

### System Recovery
If system becomes unresponsive:

1. **Check database connections**
2. **Verify system resources**
3. **Check for deadlocks**
4. **Restart database if necessary**
5. **Resume migration from last checkpoint**

## Support and Maintenance

### Regular Maintenance
- Monitor log file sizes
- Clean up old backup tables
- Archive old report files
- Update validation rules as needed

### Performance Monitoring
- Track migration execution times
- Monitor validation performance
- Check rollback operation speed
- Analyze resource usage patterns

### Documentation Updates
- Keep this guide updated with new procedures
- Document any custom fixes or workarounds
- Maintain troubleshooting knowledge base
- Update emergency contact information

## Conclusion

This comprehensive validation and rollback system ensures that inventory tenant migration can be performed safely with full confidence in data integrity and the ability to recover from any issues that may arise. The modular design allows for flexible operation while maintaining comprehensive logging and reporting throughout the process.

For additional support or questions, refer to the individual script documentation or contact the development team.