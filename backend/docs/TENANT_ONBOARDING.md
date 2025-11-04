# Tenant Onboarding and Management Procedures

## Overview

This document provides comprehensive procedures for onboarding new tenants, managing existing tenants, and handling tenant lifecycle operations in the multi-tenant school management system.

## Table of Contents

1. [Pre-Onboarding Requirements](#pre-onboarding-requirements)
2. [Tenant Onboarding Process](#tenant-onboarding-process)
3. [Tenant Configuration](#tenant-configuration)
4. [User Management](#user-management)
5. [Data Migration](#data-migration)
6. [Testing and Validation](#testing-and-validation)
7. [Go-Live Procedures](#go-live-procedures)
8. [Ongoing Management](#ongoing-management)
9. [Tenant Deprovisioning](#tenant-deprovisioning)
10. [Troubleshooting](#troubleshooting)

## Pre-Onboarding Requirements

### Information Gathering

Before onboarding a new tenant, collect the following information:

#### Organization Details
- **Organization Name**: Full legal name
- **Display Name**: Name to show in the application
- **Slug**: URL-friendly identifier (lowercase, no spaces)
- **Domain**: Custom domain (if applicable)
- **Subdomain**: Subdomain identifier for multi-tenant access

#### Technical Requirements
- **Expected User Count**: Number of users to be onboarded
- **School Count**: Number of schools to be managed
- **Product Catalog Size**: Estimated number of products
- **Storage Requirements**: Expected data volume
- **Integration Needs**: External systems to integrate

#### Administrative Contacts
- **Primary Administrator**: Main contact for the tenant
- **Technical Contact**: IT person for technical issues
- **Billing Contact**: Person responsible for billing matters

#### Configuration Preferences
- **Feature Requirements**: Which features to enable/disable
- **Branding Requirements**: Logo, colors, custom styling
- **Notification Preferences**: Email, SMS, push notification settings
- **Business Rules**: Custom workflows or validation rules

### Prerequisites Checklist

- [ ] Organization information collected and verified
- [ ] Administrative contacts identified and confirmed
- [ ] Technical requirements documented
- [ ] Custom domain DNS configured (if applicable)
- [ ] SSL certificates obtained (if using custom domain)
- [ ] Data migration requirements identified
- [ ] Integration requirements documented
- [ ] Go-live timeline established

## Tenant Onboarding Process

### Step 1: Create Tenant Record

#### Using CLI Tool

```bash
# Create new tenant using CLI
node dist/cli/tenantProvisioningCli.js create \
  --name "Municipality of Example City" \
  --slug "example-city" \
  --subdomain "example-city" \
  --domain "example-city.gov.br" \
  --admin-email "admin@example-city.gov.br" \
  --admin-name "John Administrator" \
  --features '{"inventory":true,"contracts":true,"deliveries":true,"reports":true}' \
  --limits '{"maxUsers":200,"maxSchools":50,"maxProducts":2000,"storageLimit":10240,"apiRateLimit":2000}'
```

#### Using API

```bash
# Create tenant via API
curl -X POST https://yourdomain.com/api/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SYSTEM_ADMIN_TOKEN" \
  -d '{
    "name": "Municipality of Example City",
    "slug": "example-city",
    "subdomain": "example-city",
    "domain": "example-city.gov.br",
    "settings": {
      "features": {
        "inventory": true,
        "contracts": true,
        "deliveries": true,
        "reports": true
      },
      "branding": {
        "primaryColor": "#007bff",
        "secondaryColor": "#6c757d"
      },
      "notifications": {
        "email": true,
        "sms": false,
        "push": true
      }
    },
    "limits": {
      "maxUsers": 200,
      "maxSchools": 50,
      "maxProducts": 2000,
      "storageLimit": 10240,
      "apiRateLimit": 2000
    }
  }'
```

#### Manual Database Creation

```sql
-- Create tenant record
INSERT INTO tenants (id, slug, name, domain, subdomain, status, settings, limits)
VALUES (
  gen_random_uuid(),
  'example-city',
  'Municipality of Example City',
  'example-city.gov.br',
  'example-city',
  'active',
  '{
    "features": {"inventory": true, "contracts": true, "deliveries": true, "reports": true},
    "branding": {"primaryColor": "#007bff", "secondaryColor": "#6c757d"},
    "notifications": {"email": true, "sms": false, "push": true}
  }',
  '{"maxUsers": 200, "maxSchools": 50, "maxProducts": 2000, "storageLimit": 10240, "apiRateLimit": 2000}'
);
```

### Step 2: Verify Tenant Creation

```bash
# Verify tenant was created successfully
curl -H "X-Tenant-ID: example-city" https://yourdomain.com/api/tenants/current

# Test subdomain access
curl https://example-city.yourdomain.com/api/health

# Test custom domain (if configured)
curl https://example-city.gov.br/api/health
```

### Step 3: Create Tenant Administrator

```bash
# Create tenant administrator
node dist/cli/tenantProvisioningCli.js create-admin \
  --tenant-slug "example-city" \
  --email "admin@example-city.gov.br" \
  --name "John Administrator" \
  --password "temporary_secure_password"
```

### Step 4: Configure Tenant Settings

#### Basic Configuration

```bash
# Set tenant configuration via API
curl -X PUT https://yourdomain.com/api/tenants/example-city/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -d '{
    "features": {
      "inventory": true,
      "contracts": true,
      "deliveries": true,
      "reports": true,
      "analytics": false
    },
    "branding": {
      "logo": "https://example-city.gov.br/logo.png",
      "primaryColor": "#1e3a8a",
      "secondaryColor": "#64748b",
      "favicon": "https://example-city.gov.br/favicon.ico"
    },
    "notifications": {
      "email": true,
      "sms": false,
      "push": true,
      "emailFrom": "noreply@example-city.gov.br"
    },
    "businessRules": {
      "requireApprovalForOrders": true,
      "allowNegativeInventory": false,
      "autoGenerateDeliveryGuides": true
    }
  }'
```

#### Advanced Configuration

```sql
-- Set specific configuration categories
INSERT INTO tenant_configurations (tenant_id, category, key, value) VALUES
((SELECT id FROM tenants WHERE slug = 'example-city'), 'features', 'inventory', 'true'),
((SELECT id FROM tenants WHERE slug = 'example-city'), 'features', 'contracts', 'true'),
((SELECT id FROM tenants WHERE slug = 'example-city'), 'limits', 'maxUsers', '200'),
((SELECT id FROM tenants WHERE slug = 'example-city'), 'branding', 'primaryColor', '"#1e3a8a"'),
((SELECT id FROM tenants WHERE slug = 'example-city'), 'notifications', 'email', 'true');
```

## Tenant Configuration

### Feature Configuration

#### Available Features

| Feature | Description | Default |
|---------|-------------|---------|
| `inventory` | School inventory management | `true` |
| `contracts` | Contract management | `true` |
| `deliveries` | Delivery management | `true` |
| `reports` | Reporting and analytics | `true` |
| `analytics` | Advanced analytics | `false` |
| `mobile` | Mobile app access | `true` |
| `api` | API access | `true` |

#### Configuration Example

```json
{
  "features": {
    "inventory": true,
    "contracts": true,
    "deliveries": true,
    "reports": true,
    "analytics": false,
    "mobile": true,
    "api": true
  }
}
```

### Branding Configuration

#### Branding Options

```json
{
  "branding": {
    "logo": "https://tenant-domain.com/logo.png",
    "favicon": "https://tenant-domain.com/favicon.ico",
    "primaryColor": "#007bff",
    "secondaryColor": "#6c757d",
    "accentColor": "#28a745",
    "backgroundColor": "#ffffff",
    "textColor": "#212529",
    "fontFamily": "Inter, sans-serif",
    "customCSS": "/* Custom styles */",
    "loginBackground": "https://tenant-domain.com/login-bg.jpg"
  }
}
```

### Limit Configuration

#### Resource Limits

```json
{
  "limits": {
    "maxUsers": 200,
    "maxSchools": 50,
    "maxProducts": 2000,
    "maxContracts": 100,
    "storageLimit": 10240,
    "apiRateLimit": 2000,
    "maxFileSize": 50,
    "maxBulkOperations": 1000
  }
}
```

### Notification Configuration

#### Notification Settings

```json
{
  "notifications": {
    "email": true,
    "sms": false,
    "push": true,
    "emailFrom": "noreply@tenant-domain.com",
    "emailReplyTo": "support@tenant-domain.com",
    "smsProvider": "twilio",
    "pushProvider": "firebase",
    "templates": {
      "welcome": "custom-welcome-template",
      "orderConfirmation": "custom-order-template"
    }
  }
}
```

## User Management

### Creating Tenant Users

#### Bulk User Import

```bash
# Prepare CSV file with user data
# Format: email,name,role,school_id
# Example: john@example.com,John Doe,user,school-uuid

# Import users via CLI
node dist/cli/tenantProvisioningCli.js import-users \
  --tenant-slug "example-city" \
  --file "users.csv" \
  --send-invitations true
```

#### Individual User Creation

```bash
# Create individual user
curl -X POST https://yourdomain.com/api/tenants/example-city/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -d '{
    "email": "user@example-city.gov.br",
    "name": "Jane User",
    "role": "user",
    "schoolId": "school-uuid-here",
    "sendInvitation": true
  }'
```

### User Roles and Permissions

#### Role Hierarchy

1. **system_admin**: System-wide administrator
2. **tenant_admin**: Tenant administrator
3. **school_admin**: School administrator
4. **user**: Regular user
5. **viewer**: Read-only access

#### Role Permissions

```json
{
  "tenant_admin": {
    "users": ["create", "read", "update", "delete"],
    "schools": ["create", "read", "update", "delete"],
    "products": ["create", "read", "update", "delete"],
    "contracts": ["create", "read", "update", "delete"],
    "reports": ["read", "export"],
    "settings": ["read", "update"]
  },
  "school_admin": {
    "users": ["read", "update"],
    "schools": ["read", "update"],
    "products": ["read"],
    "inventory": ["create", "read", "update"],
    "orders": ["create", "read", "update"],
    "reports": ["read"]
  },
  "user": {
    "schools": ["read"],
    "products": ["read"],
    "inventory": ["read", "update"],
    "orders": ["create", "read"],
    "reports": ["read"]
  }
}
```

### User Invitation Process

#### Automatic Invitation

```javascript
// Send invitation email
const sendUserInvitation = async (tenantId, userEmail, userName, role) => {
  const invitationToken = generateInvitationToken(tenantId, userEmail);
  const invitationLink = `https://${tenant.subdomain}.yourdomain.com/accept-invitation?token=${invitationToken}`;
  
  await emailService.send({
    to: userEmail,
    subject: `Invitation to join ${tenant.name}`,
    template: 'user-invitation',
    data: {
      userName,
      tenantName: tenant.name,
      invitationLink,
      role
    }
  });
};
```

#### Manual Setup

```sql
-- Create user with temporary password
INSERT INTO usuarios (email, nome, senha_hash, tenant_id, status)
VALUES (
  'user@example.com',
  'User Name',
  crypt('temporary_password', gen_salt('bf')),
  (SELECT id FROM tenants WHERE slug = 'example-city'),
  'pending'
);

-- Add user to tenant
INSERT INTO tenant_users (tenant_id, user_id, role, status)
VALUES (
  (SELECT id FROM tenants WHERE slug = 'example-city'),
  (SELECT id FROM usuarios WHERE email = 'user@example.com'),
  'user',
  'active'
);
```

## Data Migration

### Pre-Migration Assessment

#### Data Inventory

1. **Existing Data Sources**
   - Current database systems
   - Spreadsheet files
   - Legacy applications
   - Paper records

2. **Data Quality Assessment**
   - Completeness check
   - Consistency validation
   - Duplicate identification
   - Format standardization needs

3. **Migration Scope**
   - Schools and locations
   - Product catalogs
   - User accounts
   - Historical contracts
   - Inventory records
   - Order history

### Migration Process

#### Step 1: Data Extraction

```bash
# Extract data from source systems
# Example: Export from existing database
pg_dump source_database > source_data.sql

# Or export to CSV format
psql -d source_database -c "COPY schools TO 'schools.csv' CSV HEADER;"
psql -d source_database -c "COPY products TO 'products.csv' CSV HEADER;"
```

#### Step 2: Data Transformation

```javascript
// Transform data to match new schema
const transformSchoolData = (sourceData) => {
  return sourceData.map(school => ({
    id: uuidv4(),
    tenant_id: tenantId,
    nome: school.name,
    codigo: school.code,
    endereco: school.address,
    telefone: school.phone,
    email: school.email,
    status: 'ativo',
    created_at: new Date(),
    updated_at: new Date()
  }));
};
```

#### Step 3: Data Validation

```javascript
// Validate transformed data
const validateSchoolData = (schools) => {
  const errors = [];
  
  schools.forEach((school, index) => {
    if (!school.nome || school.nome.trim() === '') {
      errors.push(`Row ${index + 1}: School name is required`);
    }
    
    if (!school.codigo || school.codigo.trim() === '') {
      errors.push(`Row ${index + 1}: School code is required`);
    }
    
    if (school.email && !isValidEmail(school.email)) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }
  });
  
  return errors;
};
```

#### Step 4: Data Import

```bash
# Import data using CLI tool
node dist/cli/tenantProvisioningCli.js import-data \
  --tenant-slug "example-city" \
  --type "schools" \
  --file "schools.csv" \
  --validate true \
  --dry-run false

# Import products
node dist/cli/tenantProvisioningCli.js import-data \
  --tenant-slug "example-city" \
  --type "products" \
  --file "products.csv" \
  --validate true \
  --dry-run false
```

#### Step 5: Data Verification

```sql
-- Verify imported data
SELECT 
  'schools' as table_name,
  COUNT(*) as record_count
FROM escolas 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'example-city')

UNION ALL

SELECT 
  'products' as table_name,
  COUNT(*) as record_count
FROM produtos 
WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'example-city');
```

### Migration Rollback

```bash
# Rollback migration if issues are found
node dist/cli/tenantProvisioningCli.js rollback-migration \
  --tenant-slug "example-city" \
  --migration-id "migration-uuid" \
  --confirm true
```

## Testing and Validation

### Functional Testing

#### Test Checklist

- [ ] Tenant resolution works correctly
- [ ] User authentication and authorization
- [ ] Data isolation between tenants
- [ ] All configured features are accessible
- [ ] Branding is applied correctly
- [ ] Notifications are working
- [ ] API endpoints respond correctly
- [ ] Mobile app access (if enabled)

#### Automated Testing

```bash
# Run tenant-specific tests
npm run test:tenant -- --tenant-slug example-city

# Run integration tests
npm run test:integration -- --tenant-slug example-city

# Run security tests
npm run test:security -- --tenant-slug example-city
```

### Performance Testing

```bash
# Load testing with specific tenant
artillery run --target https://example-city.yourdomain.com load-test.yml

# Database performance testing
node test-tenant-performance.js --tenant-slug example-city
```

### Security Testing

```bash
# Test tenant isolation
node test-tenant-isolation.js --tenant-slug example-city

# Test cross-tenant access prevention
node test-cross-tenant-access.js --tenant-slug example-city
```

## Go-Live Procedures

### Pre-Go-Live Checklist

- [ ] All data migration completed and verified
- [ ] User accounts created and tested
- [ ] Administrator training completed
- [ ] End-user training scheduled
- [ ] Support procedures documented
- [ ] Backup procedures tested
- [ ] Monitoring configured
- [ ] Performance baselines established

### Go-Live Steps

#### Step 1: Final Data Sync

```bash
# Perform final data synchronization
node dist/cli/tenantProvisioningCli.js sync-data \
  --tenant-slug "example-city" \
  --source-system "legacy-db" \
  --incremental true
```

#### Step 2: DNS Configuration

```bash
# Update DNS records for custom domain
# A record: example-city.gov.br -> your-server-ip
# CNAME record: www.example-city.gov.br -> example-city.gov.br
```

#### Step 3: SSL Certificate Installation

```bash
# Install SSL certificate for custom domain
sudo certbot --nginx -d example-city.gov.br -d www.example-city.gov.br
```

#### Step 4: Final Testing

```bash
# Test all access methods
curl -f https://example-city.yourdomain.com/api/health
curl -f https://example-city.gov.br/api/health

# Test user login
curl -X POST https://example-city.gov.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example-city.gov.br","password":"admin_password"}'
```

#### Step 5: Enable Production Mode

```sql
-- Update tenant status to production
UPDATE tenants 
SET status = 'active', 
    settings = jsonb_set(settings, '{environment}', '"production"')
WHERE slug = 'example-city';
```

### Post-Go-Live Monitoring

#### First 24 Hours

- Monitor system performance
- Check error logs frequently
- Verify user login success rates
- Monitor database performance
- Check backup completion

#### First Week

- Review user adoption metrics
- Monitor support ticket volume
- Check system stability
- Verify data integrity
- Review performance metrics

## Ongoing Management

### Regular Maintenance Tasks

#### Daily Tasks

```bash
# Check tenant health
curl -f https://example-city.yourdomain.com/api/health

# Monitor error logs
tail -f logs/tenant-example-city.log | grep ERROR

# Check backup status
node dist/cli/tenantBackupCli.js status --tenant-slug example-city
```

#### Weekly Tasks

```bash
# Review tenant usage statistics
node dist/cli/tenantProvisioningCli.js stats --tenant-slug example-city

# Check for security alerts
node dist/cli/tenantProvisioningCli.js security-report --tenant-slug example-city

# Update tenant configuration if needed
curl -X PUT https://yourdomain.com/api/tenants/example-city/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"limits":{"maxUsers":250}}'
```

#### Monthly Tasks

```bash
# Generate tenant usage report
node dist/cli/tenantProvisioningCli.js usage-report \
  --tenant-slug example-city \
  --period monthly \
  --output report.pdf

# Review and optimize performance
node dist/cli/tenantProvisioningCli.js performance-analysis \
  --tenant-slug example-city
```

### Configuration Updates

#### Feature Updates

```bash
# Enable new feature for tenant
curl -X PUT https://yourdomain.com/api/tenants/example-city/config/features \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"analytics": true}'
```

#### Limit Adjustments

```bash
# Increase user limit
curl -X PUT https://yourdomain.com/api/tenants/example-city/config/limits \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"maxUsers": 300}'
```

#### Branding Updates

```bash
# Update branding
curl -X PUT https://yourdomain.com/api/tenants/example-city/config/branding \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "logo": "https://new-domain.com/new-logo.png",
    "primaryColor": "#2563eb"
  }'
```

### User Management

#### Adding New Users

```bash
# Add new user
curl -X POST https://yourdomain.com/api/tenants/example-city/users \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -d '{
    "email": "newuser@example-city.gov.br",
    "name": "New User",
    "role": "user",
    "sendInvitation": true
  }'
```

#### Updating User Roles

```bash
# Update user role
curl -X PUT https://yourdomain.com/api/tenants/example-city/users/user-id \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -d '{"role": "school_admin"}'
```

#### Deactivating Users

```bash
# Deactivate user
curl -X PUT https://yourdomain.com/api/tenants/example-city/users/user-id \
  -H "Authorization: Bearer $TENANT_ADMIN_TOKEN" \
  -d '{"status": "inactive"}'
```

## Tenant Deprovisioning

### Pre-Deprovisioning Steps

#### Data Backup

```bash
# Create final backup
node dist/cli/tenantBackupCli.js create \
  --tenant-slug example-city \
  --type full \
  --retention permanent \
  --description "Final backup before deprovisioning"
```

#### Data Export

```bash
# Export tenant data
node dist/cli/tenantProvisioningCli.js export-data \
  --tenant-slug example-city \
  --format json \
  --output tenant-data-export.json
```

#### Notification

```bash
# Notify tenant users about deprovisioning
node dist/cli/tenantProvisioningCli.js notify-users \
  --tenant-slug example-city \
  --template deprovisioning-notice \
  --schedule "+7 days"
```

### Deprovisioning Process

#### Step 1: Deactivate Tenant

```sql
-- Deactivate tenant
UPDATE tenants 
SET status = 'deprovisioning' 
WHERE slug = 'example-city';
```

#### Step 2: Remove User Access

```bash
# Deactivate all tenant users
node dist/cli/tenantProvisioningCli.js deactivate-users \
  --tenant-slug example-city \
  --confirm true
```

#### Step 3: Data Cleanup

```bash
# Remove tenant data (after confirmation)
node dist/cli/tenantProvisioningCli.js cleanup-data \
  --tenant-slug example-city \
  --confirm true \
  --keep-audit-logs true
```

#### Step 4: Remove Tenant Record

```sql
-- Remove tenant (final step)
DELETE FROM tenants WHERE slug = 'example-city';
```

### Post-Deprovisioning

#### Cleanup Tasks

```bash
# Remove cached data
redis-cli DEL "tenant:example-city:*"

# Remove log files (optional)
rm -f logs/tenant-example-city-*.log

# Update monitoring configuration
# Remove tenant from monitoring dashboards
```

#### Documentation

```bash
# Document deprovisioning
echo "Tenant example-city deprovisioned on $(date)" >> deprovisioning-log.txt
```

## Troubleshooting

### Common Issues

#### Tenant Not Found

```bash
# Check if tenant exists
psql -d escola_management_prod -c "SELECT * FROM tenants WHERE slug = 'example-city';"

# Check DNS resolution
nslookup example-city.yourdomain.com
```

#### Authentication Issues

```bash
# Check user-tenant association
psql -d escola_management_prod -c "
SELECT u.email, tu.role, tu.status 
FROM usuarios u 
JOIN tenant_users tu ON u.id = tu.user_id 
JOIN tenants t ON tu.tenant_id = t.id 
WHERE t.slug = 'example-city';
"
```

#### Performance Issues

```bash
# Check tenant-specific performance
node test-tenant-performance.js --tenant-slug example-city

# Analyze slow queries
psql -d escola_management_prod -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%tenant_id%' 
ORDER BY mean_exec_time DESC 
LIMIT 10;
"
```

### Support Procedures

#### Escalation Path

1. **Level 1**: Tenant administrator
2. **Level 2**: System administrator
3. **Level 3**: Development team
4. **Level 4**: Infrastructure team

#### Emergency Contacts

- **System Administrator**: admin@yourdomain.com
- **Technical Support**: support@yourdomain.com
- **Emergency Hotline**: +1-xxx-xxx-xxxx

### Documentation Updates

Keep this document updated with:
- New onboarding procedures
- Configuration changes
- Troubleshooting solutions
- Best practices learned

For additional information, refer to:
- [Multi-Tenant Architecture Documentation](./MULTI_TENANT_ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)