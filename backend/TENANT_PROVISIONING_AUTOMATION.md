# Tenant Provisioning Automation

This document describes the automated tenant provisioning system that enables consistent, reliable, and scalable tenant onboarding and management.

## Overview

The tenant provisioning automation system provides:

- **Template-based provisioning**: Predefined templates for different tenant types
- **Custom provisioning workflows**: Flexible provisioning with custom configurations
- **Progress tracking**: Real-time monitoring of provisioning steps
- **Error recovery**: Automatic retry mechanisms and manual recovery options
- **Deprovisioning**: Automated tenant cleanup and data removal
- **CLI tools**: Command-line interface for administrative operations

## Architecture

### Core Components

1. **TenantProvisioningService**: Main service handling all provisioning operations
2. **TenantTemplate**: Template system for consistent tenant setup
3. **ProvisioningProgress**: Progress tracking and step management
4. **CLI Tools**: Command-line interface for operations
5. **API Endpoints**: REST API for integration

### Database Schema

```sql
-- Tenant templates for consistent provisioning
CREATE TABLE tenant_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) DEFAULT 'basic',
  settings JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  initial_data JSONB DEFAULT '{}',
  migrations JSONB DEFAULT '[]',
  post_provisioning_steps JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress tracking for provisioning operations
CREATE TABLE tenant_provisioning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES tenant_templates(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending',
  current_step VARCHAR(255),
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  steps JSONB DEFAULT '[]',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT,
  warnings JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Template System

### Default Templates

The system includes three default templates:

1. **Basic School System**
   - For small schools with essential features
   - Limits: 50 users, 10 schools, 500 products
   - Features: inventory, contracts, deliveries, reports, mobile

2. **School District**
   - For school districts with multiple schools
   - Limits: 200 users, 50 schools, 2000 products
   - Features: all basic features + analytics

3. **Municipality**
   - For municipal education systems
   - Limits: 500 users, 200 schools, 5000 products
   - Features: all features + integrations

### Template Structure

```typescript
interface TenantTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'school_district' | 'municipality' | 'enterprise' | 'custom';
  settings: Partial<TenantSettings>;
  limits: Partial<TenantLimits>;
  initialData?: {
    schools?: any[];
    products?: any[];
    users?: any[];
    configurations?: any[];
  };
  migrations?: string[];
  postProvisioningSteps?: string[];
}
```

## Provisioning Workflows

### Template-Based Provisioning

1. **Create Tenant**: Create tenant record with template settings
2. **Create Admin User**: Create tenant administrator user
3. **Run Migrations**: Execute tenant-specific database migrations
4. **Setup Configurations**: Apply tenant configurations from template
5. **Create Initial Data**: Create initial schools, products, and users
6. **Post-Provisioning Steps**: Execute automation steps

### Custom Provisioning

Uses the existing `tenantService.provisionTenant()` method for custom configurations.

### Provisioning Steps

Each provisioning workflow consists of steps with:
- **Retry logic**: Automatic retry with configurable limits
- **Error handling**: Detailed error capture and reporting
- **Progress tracking**: Real-time status updates
- **Recovery options**: Manual retry and recovery mechanisms

## Progress Tracking

### Progress Status

- `pending`: Provisioning queued but not started
- `running`: Provisioning in progress
- `completed`: Provisioning completed successfully
- `failed`: Provisioning failed (can be recovered)
- `cancelled`: Provisioning cancelled by user

### Step Status

- `pending`: Step not yet executed
- `running`: Step currently executing
- `completed`: Step completed successfully
- `failed`: Step failed (can be retried)
- `skipped`: Step skipped (e.g., optional steps)

## API Endpoints

### Template Management

```http
GET    /api/provisioning/templates              # List templates
GET    /api/provisioning/templates/:id          # Get template
POST   /api/provisioning/templates              # Create template
PUT    /api/provisioning/templates/:id          # Update template
DELETE /api/provisioning/templates/:id          # Delete template
```

### Provisioning Operations

```http
POST   /api/provisioning/templates/:id/provision    # Provision from template
POST   /api/provisioning/provision/custom           # Custom provisioning
```

### Progress Tracking

```http
GET    /api/provisioning/progress                    # List progress records
GET    /api/provisioning/progress/:id               # Get progress details
POST   /api/provisioning/progress/:id/cancel        # Cancel provisioning
POST   /api/provisioning/progress/:id/steps/:stepId/retry  # Retry step
POST   /api/provisioning/progress/:id/recover       # Recover failed provisioning
POST   /api/provisioning/progress/:id/cleanup       # Cleanup failed provisioning
```

### Deprovisioning

```http
POST   /api/provisioning/tenants/:id/deprovision           # Deprovision tenant
POST   /api/provisioning/tenants/:id/schedule-deprovision  # Schedule deprovisioning
```

### Statistics

```http
GET    /api/provisioning/stats                      # Get provisioning statistics
```

## CLI Usage

### Template Management

```bash
# List templates
node src/cli/tenantProvisioningCli.js template list

# Show template details
node src/cli/tenantProvisioningCli.js template show <templateId>

# Create template from file
node src/cli/tenantProvisioningCli.js template create "My Template" \
  --description "Custom template" \
  --category custom \
  --file template.json
```

### Provisioning

```bash
# Provision from template
node src/cli/tenantProvisioningCli.js provision from-template <templateId> \
  --slug my-tenant \
  --name "My Organization" \
  --admin-name "Admin User" \
  --admin-email admin@example.com \
  --admin-password password123 \
  --subdomain my-tenant
```

### Progress Tracking

```bash
# List provisioning progress
node src/cli/tenantProvisioningCli.js progress list

# Show detailed progress
node src/cli/tenantProvisioningCli.js progress show <progressId>

# Cancel provisioning
node src/cli/tenantProvisioningCli.js progress cancel <progressId>

# Retry failed step
node src/cli/tenantProvisioningCli.js progress retry <progressId> <stepId>
```

### Deprovisioning

```bash
# Deprovision tenant
node src/cli/tenantProvisioningCli.js deprovision tenant <tenantId> \
  --preserve-audit-logs \
  --notify-users \
  --grace-period 24
```

## Error Handling and Recovery

### Automatic Retry

- Each step has configurable retry limits
- Failed steps are automatically retried up to the limit
- Exponential backoff can be implemented for retries

### Manual Recovery

- Failed provisioning can be manually recovered
- Individual steps can be retried
- Failed provisioning can be cleaned up

### Error Types

1. **Validation Errors**: Invalid input data
2. **Database Errors**: Database operation failures
3. **Migration Errors**: Database migration failures
4. **Configuration Errors**: Configuration application failures
5. **Network Errors**: External service communication failures

## Deprovisioning

### Deprovisioning Steps

1. **Backup Data**: Create backup of tenant data
2. **Notify Users**: Send deprovisioning notifications
3. **Disable Access**: Mark tenant as inactive
4. **Cleanup Data**: Remove tenant data from database
5. **Cleanup Audit Logs**: Remove or archive audit logs

### Deprovisioning Options

```typescript
interface DeprovisioningOptions {
  preserveAuditLogs?: boolean;    // Keep audit logs
  preserveBackups?: boolean;      // Keep data backups
  notifyUsers?: boolean;          // Send notifications
  gracePeriodHours?: number;      // Grace period before deletion
}
```

## Monitoring and Statistics

### Provisioning Statistics

- Total provisioning operations
- Success/failure rates
- Average completion times
- Template usage statistics
- Current running operations

### Alerts and Notifications

- Failed provisioning alerts
- Long-running operation warnings
- Resource limit violations
- Template usage patterns

## Best Practices

### Template Design

1. **Keep templates focused**: Each template should serve a specific use case
2. **Use meaningful names**: Clear, descriptive template names
3. **Document templates**: Include detailed descriptions
4. **Version templates**: Track template changes over time
5. **Test templates**: Validate templates before production use

### Provisioning Operations

1. **Monitor progress**: Always track provisioning progress
2. **Handle failures gracefully**: Implement proper error handling
3. **Use appropriate templates**: Choose the right template for each use case
4. **Validate input data**: Ensure data quality before provisioning
5. **Plan for rollback**: Have rollback procedures for failed provisioning

### Performance Optimization

1. **Batch operations**: Group related operations together
2. **Async processing**: Use background processing for long operations
3. **Resource limits**: Set appropriate limits to prevent resource exhaustion
4. **Monitoring**: Monitor system resources during provisioning
5. **Cleanup**: Regular cleanup of old progress records

## Security Considerations

### Access Control

- Provisioning operations require administrative privileges
- Template management is restricted to system administrators
- Progress tracking respects tenant isolation

### Data Protection

- Sensitive data is encrypted in transit and at rest
- Audit logs track all provisioning operations
- Deprovisioning includes secure data deletion

### Validation

- Input validation prevents injection attacks
- Template validation ensures safe configurations
- Progress tracking prevents unauthorized access

## Testing

### Test Coverage

The system includes comprehensive tests for:

- Template management operations
- Provisioning workflows (template-based and custom)
- Progress tracking and monitoring
- Error handling and recovery
- Deprovisioning operations
- CLI functionality

### Running Tests

```bash
# Run provisioning automation tests
node backend/test-tenant-provisioning.js

# Test specific functionality
npm test -- --grep "provisioning"
```

## Troubleshooting

### Common Issues

1. **Template not found**: Verify template ID exists
2. **Provisioning stuck**: Check for database locks or resource constraints
3. **Step failures**: Review step error messages and retry if appropriate
4. **Permission errors**: Ensure proper database permissions
5. **Resource limits**: Check system resource availability

### Debug Information

- Enable debug logging for detailed operation traces
- Check provisioning progress for step-by-step status
- Review error messages and stack traces
- Monitor system resources during operations

### Recovery Procedures

1. **Failed provisioning**: Use recovery endpoints to retry failed operations
2. **Stuck operations**: Cancel and restart provisioning
3. **Data corruption**: Use cleanup procedures and restart
4. **System issues**: Check database connectivity and system resources

## Future Enhancements

### Planned Features

1. **Scheduled provisioning**: Queue provisioning for future execution
2. **Bulk operations**: Provision multiple tenants simultaneously
3. **Template versioning**: Track and manage template versions
4. **Advanced monitoring**: Enhanced metrics and alerting
5. **Integration hooks**: Webhooks for external system integration

### Scalability Improvements

1. **Distributed processing**: Scale provisioning across multiple workers
2. **Queue management**: Advanced job queue with priorities
3. **Resource optimization**: Optimize database and memory usage
4. **Caching**: Cache frequently used templates and configurations
5. **Load balancing**: Distribute provisioning load across instances

This tenant provisioning automation system provides a robust, scalable foundation for managing tenant lifecycle operations while maintaining consistency, reliability, and security.