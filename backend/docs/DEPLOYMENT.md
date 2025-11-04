# Multi-Tenant System Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the multi-tenant school management system to production environments. It covers database setup, application deployment, configuration, and post-deployment verification.

## Prerequisites

### System Requirements
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- SSL certificates for custom domains
- Load balancer (recommended for production)

### Environment Setup
- Production server with adequate resources
- Database server (can be same as application server)
- Redis server for caching
- Backup storage solution
- Monitoring and logging infrastructure

## Pre-Deployment Checklist

### 1. Database Preparation
- [ ] PostgreSQL server installed and configured
- [ ] Database created with appropriate permissions
- [ ] Connection pooling configured (recommended: pgbouncer)
- [ ] Backup strategy implemented
- [ ] Monitoring configured

### 2. Application Environment
- [ ] Node.js runtime installed
- [ ] Application dependencies installed
- [ ] Environment variables configured
- [ ] SSL certificates obtained and configured
- [ ] Load balancer configured (if applicable)

### 3. Security Configuration
- [ ] Firewall rules configured
- [ ] Database access restricted
- [ ] API rate limiting configured
- [ ] CORS settings configured
- [ ] Security headers configured

## Database Setup

### 1. Create Database and User

```sql
-- Create database
CREATE DATABASE escola_management_prod;

-- Create application user
CREATE USER app_user WITH PASSWORD 'secure_password_here';

-- Grant permissions
GRANT CONNECT ON DATABASE escola_management_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT CREATE ON SCHEMA public TO app_user;
```

### 2. Enable Required Extensions

```sql
-- Connect to the database
\c escola_management_prod

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_stat_statements for monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### 3. Configure Connection Pooling (Optional but Recommended)

Install and configure pgbouncer:

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
escola_management_prod = host=localhost port=5432 dbname=escola_management_prod

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
admin_users = postgres
pool_mode = transaction
server_reset_query = DISCARD ALL
max_client_conn = 100
default_pool_size = 20
```

## Application Deployment

### 1. Environment Configuration

Create production environment file:

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://app_user:password@localhost:5432/escola_management_prod
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PREFIX=escola_management_prod:

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_here
JWT_EXPIRES_IN=24h

# Tenant Configuration
DEFAULT_TENANT_LIMITS='{"maxUsers":100,"maxSchools":50,"maxProducts":1000,"storageLimit":5120,"apiRateLimit":1000}'
TENANT_CACHE_TTL=3600

# Security Configuration
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring Configuration
LOG_LEVEL=info
ENABLE_AUDIT_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH=/var/backups/escola_management

# Email Configuration (if applicable)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=smtp_password_here
```

### 2. Build and Deploy Application

```bash
# Clone repository
git clone https://github.com/yourorg/escola-management.git
cd escola-management

# Install dependencies
npm install --production

# Build application
npm run build

# Run database migrations
npm run migrate:prod

# Start application with process manager
pm2 start ecosystem.config.js --env production
```

### 3. Process Manager Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'escola-management-api',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

## Database Migration

### 1. Run Initial Migrations

```bash
# Run all migrations in order
npm run migrate:prod

# Verify migration status
npm run migrate:status
```

### 2. Migration Scripts Execution Order

The migrations must be run in this specific order:

1. `001_create_tenant_tables.sql` - Create tenant management tables
2. `002_add_tenant_id_to_tables.sql` - Add tenant_id to existing tables
3. `003_implement_row_level_security.sql` - Enable RLS policies
4. `004_fix_rls_policies.sql` - Fix and optimize RLS policies
5. `005_add_configuration_versioning.sql` - Add configuration versioning
6. `006_optimize_tenant_indexes.sql` - Optimize database indexes
7. `007_create_audit_monitoring_tables.sql` - Create audit and monitoring tables
8. `008_create_notification_tables.sql` - Create notification tables
9. `009_data_migration_to_multi_tenant.sql` - Migrate existing data
10. `010_create_backup_tables.sql` - Create backup management tables

### 3. Verify Migration Success

```bash
# Check if all tables exist
node check-tables.js

# Verify RLS policies are active
psql -d escola_management_prod -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;"

# Test tenant isolation
node test-tenant-isolation.js
```

## SSL and Domain Configuration

### 1. SSL Certificate Setup

```bash
# Using Let's Encrypt with certbot
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Or install custom certificates
sudo cp your-cert.pem /etc/ssl/certs/
sudo cp your-key.pem /etc/ssl/private/
```

### 2. Nginx Configuration

```nginx
# /etc/nginx/sites-available/escola-management
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com *.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com api.yourdomain.com *.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # Frontend static files
    location / {
        root /var/www/escola-management/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
```

## Post-Deployment Configuration

### 1. Create System Administrator

```bash
# Use the CLI tool to create system admin
node dist/cli/createSystemAdmin.js \
  --email admin@yourdomain.com \
  --password secure_admin_password \
  --name "System Administrator"
```

### 2. Create First Tenant

```bash
# Create initial tenant
node dist/cli/tenantProvisioningCli.js create \
  --name "Default Organization" \
  --slug "default" \
  --subdomain "default" \
  --admin-email admin@organization.com
```

### 3. Configure Monitoring

```bash
# Start monitoring services
pm2 start dist/services/tenantMonitoringService.js --name monitoring
pm2 start dist/services/tenantBackupScheduler.js --name backup-scheduler

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## Verification Steps

### 1. Health Check

```bash
# Check application health
curl -f https://yourdomain.com/api/health

# Check tenant resolution
curl -H "X-Tenant-ID: default" https://yourdomain.com/api/tenants/current

# Check database connectivity
curl -f https://yourdomain.com/api/health/database
```

### 2. Tenant Isolation Test

```bash
# Run tenant isolation tests
npm run test:isolation:prod

# Verify RLS policies
npm run test:security:prod
```

### 3. Performance Test

```bash
# Run performance tests
npm run test:performance:prod

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/api/health
```

## Backup Configuration

### 1. Database Backup Setup

```bash
# Create backup script
cat > /usr/local/bin/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/escola_management"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U app_user escola_management_prod > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /usr/local/bin/backup-database.sh
```

### 2. Automated Backup Schedule

```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/backup.log 2>&1
```

## Monitoring Setup

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install -g pm2-web

# Start PM2 web interface
pm2-web --port 8080 --password monitoring_password
```

### 2. Database Monitoring

```sql
-- Enable query statistics
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Restart PostgreSQL to apply changes
sudo systemctl restart postgresql
```

### 3. Log Monitoring

```bash
# Configure logrotate for application logs
cat > /etc/logrotate.d/escola-management << 'EOF'
/var/www/escola-management/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check PostgreSQL service status
   - Verify connection string and credentials
   - Check firewall rules

2. **Tenant Resolution Failures**
   - Verify DNS configuration for subdomains
   - Check tenant middleware configuration
   - Validate tenant data in database

3. **Performance Issues**
   - Check database query performance
   - Verify index usage
   - Monitor memory and CPU usage

4. **SSL Certificate Issues**
   - Verify certificate validity
   - Check certificate chain
   - Ensure proper nginx configuration

### Log Locations

- Application logs: `/var/www/escola-management/logs/`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

### Useful Commands

```bash
# Check application status
pm2 status

# View application logs
pm2 logs escola-management-api

# Restart application
pm2 restart escola-management-api

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'escola_management_prod';"

# Monitor system resources
htop
iotop
```

## Security Hardening

### 1. Database Security

```sql
-- Restrict database access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO app_user;

-- Enable SSL for database connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';
```

### 2. Application Security

```bash
# Set proper file permissions
chmod 600 .env.production
chown www-data:www-data .env.production

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3000/tcp
ufw enable
```

### 3. Regular Security Updates

```bash
# Create update script
cat > /usr/local/bin/security-updates.sh << 'EOF'
#!/bin/bash
apt update
apt upgrade -y
npm audit fix
pm2 restart all
EOF

chmod +x /usr/local/bin/security-updates.sh

# Schedule weekly security updates
echo "0 3 * * 0 /usr/local/bin/security-updates.sh" | crontab -
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer Configuration**
   - Configure session affinity if needed
   - Implement health checks
   - Set up SSL termination

2. **Database Scaling**
   - Consider read replicas for heavy read workloads
   - Implement connection pooling
   - Monitor query performance

3. **Cache Scaling**
   - Use Redis cluster for high availability
   - Implement cache warming strategies
   - Monitor cache hit rates

### Vertical Scaling

1. **Server Resources**
   - Monitor CPU and memory usage
   - Adjust PM2 instance count
   - Optimize database configuration

2. **Database Tuning**
   - Adjust PostgreSQL configuration
   - Optimize query performance
   - Review indexing strategies

## Maintenance Schedule

### Daily Tasks
- Monitor application health
- Check error logs
- Verify backup completion

### Weekly Tasks
- Review performance metrics
- Update security patches
- Clean up old log files

### Monthly Tasks
- Review tenant usage statistics
- Optimize database performance
- Update documentation

### Quarterly Tasks
- Security audit
- Disaster recovery testing
- Capacity planning review

For additional support and troubleshooting, refer to the [Troubleshooting Guide](./TROUBLESHOOTING.md).