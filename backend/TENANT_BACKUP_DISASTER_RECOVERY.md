# Tenant Backup and Disaster Recovery System

## Overview

The Tenant Backup and Disaster Recovery System provides comprehensive backup, restore, and disaster recovery capabilities for multi-tenant data. This system ensures data protection, business continuity, and compliance with data retention requirements.

## Features

### Core Backup Features
- **Tenant-specific backups**: Complete isolation of backup data per tenant
- **Flexible backup options**: Full, incremental, and differential backups
- **Compression and encryption**: Optional data compression and encryption
- **Selective table backup**: Backup specific tables or exclude certain tables
- **Automated scheduling**: Cron-based backup scheduling
- **Backup validation**: Integrity checking and validation

### Disaster Recovery Features
- **Point-in-time recovery**: Restore to specific timestamps
- **Cross-tenant restoration**: Restore data from one tenant to another
- **Backup integrity validation**: Checksum verification and readability tests
- **Automated cleanup**: Retention policy-based cleanup
- **Restore point creation**: Automatic restore points before major operations

### Monitoring and Auditing
- **Comprehensive logging**: All backup operations are logged
- **Performance metrics**: Backup size, duration, and success rates
- **Audit trails**: Complete audit history for compliance
- **Real-time monitoring**: Status tracking and alerting

## Architecture

### Database Schema

#### Core Tables

```sql
-- Backup metadata storage
tenant_backups (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    timestamp TIMESTAMP,
    size BIGINT,
    checksum VARCHAR(64),
    tables JSONB,
    compression BOOLEAN,
    encryption BOOLEAN,
    status VARCHAR(20),
    path TEXT
)

-- Backup scheduling
tenant_backup_schedules (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255),
    schedule_cron VARCHAR(100),
    backup_type VARCHAR(20),
    retention_days INTEGER,
    is_active BOOLEAN
)

-- Backup operation logs
tenant_backup_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    backup_id VARCHAR(255),
    operation_type VARCHAR(20),
    status VARCHAR(20),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    error_message TEXT
)
```

### Service Architecture

```
┌─────────────────────┐
│   Backup API        │
│   (REST Endpoints)  │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Backup Controller  │
│  (Request Handling) │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Backup Service     │
│  (Core Logic)       │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│  Database Layer     │
│  (PostgreSQL)       │
└─────────────────────┘
```

## API Endpoints

### Backup Management

#### Create Backup
```http
POST /api/backup/tenants/{tenantId}/backups
Content-Type: application/json

{
  "includeData": true,
  "includeSchema": true,
  "compression": false,
  "encryption": false,
  "tables": ["escolas", "produtos"] // optional
}
```

#### List Backups
```http
GET /api/backup/tenants/{tenantId}/backups
```

#### Get Backup Statistics
```http
GET /api/backup/tenants/{tenantId}/backups/stats
```

### Restore Operations

#### Restore from Backup
```http
POST /api/backup/tenants/{tenantId}/restore
Content-Type: application/json

{
  "backupPath": "/path/to/backup.sql",
  "targetTenantId": "optional-target-tenant",
  "validateOnly": false
}
```

#### Point-in-Time Recovery
```http
POST /api/backup/tenants/{tenantId}/point-in-time-recovery
Content-Type: application/json

{
  "targetTime": "2024-01-15T10:30:00Z"
}
```

### Backup Validation

#### Validate Backup Integrity
```http
POST /api/backup/backups/validate
Content-Type: application/json

{
  "backupPath": "/path/to/backup.sql"
}
```

### Maintenance Operations

#### Cleanup Old Backups
```http
DELETE /api/backup/tenants/{tenantId}/backups/cleanup
Content-Type: application/json

{
  "retentionDays": 30
}
```

### Backup Scheduling

#### Get Backup Schedules
```http
GET /api/backup/tenants/{tenantId}/backup-schedules
```

#### Create Backup Schedule
```http
POST /api/backup/tenants/{tenantId}/backup-schedules
Content-Type: application/json

{
  "name": "Daily Full Backup",
  "scheduleCron": "0 2 * * *",
  "backupType": "full",
  "retentionDays": 30,
  "compression": true,
  "encryption": false
}
```

## CLI Usage

The system includes a comprehensive CLI tool for backup operations:

### Basic Commands

```bash
# Create a backup
node src/cli/tenantBackupCli.js backup -t <tenant-id>

# Restore from backup
node src/cli/tenantBackupCli.js restore -t <tenant-id> -p <backup-path>

# Point-in-time recovery
node src/cli/tenantBackupCli.js point-in-time-recovery -t <tenant-id> --target-time "2024-01-15T10:30:00Z"

# List backups
node src/cli/tenantBackupCli.js list -t <tenant-id>

# Validate backup
node src/cli/tenantBackupCli.js validate -p <backup-path>

# Cleanup old backups
node src/cli/tenantBackupCli.js cleanup -t <tenant-id> --retention-days 30

# Show backup statistics
node src/cli/tenantBackupCli.js stats -t <tenant-id>
```

### Advanced Options

```bash
# Create compressed backup with specific tables
node src/cli/tenantBackupCli.js backup -t <tenant-id> --compress --tables "escolas,produtos"

# Cross-tenant restore
node src/cli/tenantBackupCli.js restore -t <source-tenant> -p <backup-path> --target-tenant <target-tenant>

# Validation-only restore
node src/cli/tenantBackupCli.js restore -t <tenant-id> -p <backup-path> --validate-only

# Dry-run cleanup
node src/cli/tenantBackupCli.js cleanup -t <tenant-id> --retention-days 30 --dry-run
```

## Backup Scheduler

### Starting the Scheduler

```javascript
const { TenantBackupScheduler } = require('./src/services/tenantBackupScheduler');

const scheduler = new TenantBackupScheduler(pool);
await scheduler.start();
```

### Schedule Management

```javascript
// Add a new schedule
const scheduleId = await scheduler.addSchedule({
  tenantId: 'tenant-uuid',
  name: 'Daily Backup',
  scheduleCron: '0 2 * * *', // Daily at 2 AM
  backupType: 'full',
  retentionDays: 30,
  compression: true,
  encryption: false,
  isActive: true
});

// Update schedule
await scheduler.updateSchedule(scheduleId, {
  retentionDays: 60,
  compression: false
});

// Execute schedule manually
await scheduler.executeSchedule(scheduleId);
```

## Configuration

### Environment Variables

```bash
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_escolar
DB_USER=postgres
DB_PASSWORD=your_password

# Backup configuration
BACKUP_DIR=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_ENCRYPTION=false
```

### Backup Directory Structure

```
backups/
├── tenant-1/
│   ├── tenant-1-2024-01-15T10-30-00.sql
│   ├── tenant-1-2024-01-16T10-30-00.sql
│   └── ...
├── tenant-2/
│   ├── tenant-2-2024-01-15T10-30-00.sql
│   └── ...
└── ...
```

## Security Considerations

### Access Control
- Tenant isolation enforced at all levels
- Role-based access control for backup operations
- System admin privileges for cross-tenant operations
- Audit logging for all backup activities

### Data Protection
- Optional encryption for backup files
- Checksum verification for integrity
- Secure file storage with proper permissions
- Network security for backup transfers

### Compliance
- Complete audit trails for compliance requirements
- Data retention policy enforcement
- Secure deletion of expired backups
- LGPD/GDPR compliance support

## Monitoring and Alerting

### Metrics Tracked
- Backup success/failure rates
- Backup file sizes and growth trends
- Backup duration and performance
- Storage utilization
- Schedule execution status

### Alerting Scenarios
- Backup failures
- Storage space warnings
- Schedule execution failures
- Integrity validation failures
- Retention policy violations

## Best Practices

### Backup Strategy
1. **Regular Scheduling**: Set up automated daily backups
2. **Retention Policy**: Implement appropriate retention periods
3. **Testing**: Regularly test backup restoration
4. **Monitoring**: Monitor backup success rates and performance
5. **Documentation**: Maintain backup and recovery procedures

### Performance Optimization
1. **Compression**: Use compression for large backups
2. **Selective Backups**: Backup only necessary tables when possible
3. **Off-peak Scheduling**: Schedule backups during low-usage periods
4. **Storage Management**: Implement proper cleanup policies
5. **Network Optimization**: Use efficient transfer methods

### Disaster Recovery Planning
1. **Recovery Time Objectives (RTO)**: Define acceptable downtime
2. **Recovery Point Objectives (RPO)**: Define acceptable data loss
3. **Testing Procedures**: Regular disaster recovery testing
4. **Documentation**: Maintain updated recovery procedures
5. **Communication Plans**: Define incident response procedures

## Troubleshooting

### Common Issues

#### Backup Creation Failures
```bash
# Check disk space
df -h

# Check database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Check backup directory permissions
ls -la ./backups/

# Review backup logs
tail -f /var/log/backup.log
```

#### Restore Failures
```bash
# Validate backup integrity
node src/cli/tenantBackupCli.js validate -p <backup-path>

# Check target tenant exists
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT id FROM tenants WHERE id = '<tenant-id>'"

# Review restore logs
tail -f /var/log/restore.log
```

#### Performance Issues
```bash
# Check backup file sizes
du -sh backups/*

# Monitor backup duration
grep "duration" /var/log/backup.log

# Check database performance
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT * FROM pg_stat_activity"
```

## Migration and Setup

### Initial Setup

1. **Run Migration**:
   ```bash
   node run-backup-migration.js
   ```

2. **Test System**:
   ```bash
   node test-backup-system.js
   ```

3. **Configure Schedules**:
   ```bash
   # Create default schedules for all tenants
   node src/cli/tenantBackupCli.js setup-schedules
   ```

### Upgrading from Previous Versions

1. **Backup Current Data**: Create full system backup before upgrading
2. **Run Migration Scripts**: Execute new migration files
3. **Update Configuration**: Review and update configuration files
4. **Test Functionality**: Run comprehensive tests
5. **Update Documentation**: Update operational procedures

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor backup success rates
- Review and update retention policies
- Test disaster recovery procedures
- Update backup schedules as needed
- Monitor storage utilization

### Performance Monitoring
- Track backup duration trends
- Monitor storage growth
- Review backup success rates
- Analyze restoration times
- Monitor system resource usage

### Compliance and Auditing
- Regular audit log reviews
- Compliance reporting
- Data retention verification
- Security assessment
- Documentation updates

## Conclusion

The Tenant Backup and Disaster Recovery System provides a comprehensive solution for protecting multi-tenant data. With features like automated scheduling, point-in-time recovery, cross-tenant restoration, and comprehensive monitoring, it ensures business continuity and data protection for all tenants.

For additional support or questions, please refer to the system documentation or contact the development team.