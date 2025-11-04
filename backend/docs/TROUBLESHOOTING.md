# Multi-Tenant System Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered in the multi-tenant school management system. It covers tenant resolution problems, database issues, performance problems, and security concerns.

## Common Issues and Solutions

### 1. Tenant Resolution Issues

#### Problem: "Tenant not found" errors

**Symptoms:**
- API returns 404 with "Tenant not found" message
- Users cannot access their tenant's data
- Subdomain resolution fails

**Diagnostic Steps:**
```bash
# Check if tenant exists in database
psql -d escola_management_prod -c "SELECT id, slug, subdomain, status FROM tenants WHERE slug = 'tenant-slug';"

# Test tenant resolution manually
curl -H "X-Tenant-ID: tenant-slug" https://yourdomain.com/api/tenants/current

# Check DNS resolution for subdomains
nslookup tenant-slug.yourdomain.com
```

**Solutions:**

1. **Tenant doesn't exist:**
   ```bash
   # Create tenant using CLI
   node dist/cli/tenantProvisioningCli.js create \
     --name "Tenant Name" \
     --slug "tenant-slug" \
     --subdomain "tenant-slug"
   ```

2. **Tenant is inactive:**
   ```sql
   -- Activate tenant
   UPDATE tenants SET status = 'active' WHERE slug = 'tenant-slug';
   ```

3. **DNS configuration issue:**
   ```bash
   # Add wildcard DNS record
   # *.yourdomain.com -> your-server-ip
   ```

4. **Cache issue:**
   ```bash
   # Clear tenant cache
   redis-cli DEL "tenant:cache:*"
   
   # Restart application
   pm2 restart escola-management-api
   ```

#### Problem: Cross-tenant data access

**Symptoms:**
- Users see data from other tenants
- API returns data not belonging to current tenant
- RLS policies not working

**Diagnostic Steps:**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('escolas', 'produtos', 'usuarios') 
AND rowsecurity = false;

-- Check current tenant context
SELECT current_setting('app.current_tenant_id', true);

-- Test RLS policy
SET app.current_tenant_id = 'test-tenant-id';
SELECT * FROM escolas LIMIT 5;
```

**Solutions:**

1. **RLS not enabled:**
   ```sql
   -- Enable RLS on tables
   ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
   ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
   ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
   ```

2. **Missing RLS policies:**
   ```sql
   -- Create RLS policies
   CREATE POLICY tenant_isolation_escolas ON escolas
       USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
   ```

3. **Tenant context not set:**
   ```javascript
   // Check middleware order in app.js
   app.use(tenantMiddleware); // Must be before other routes
   app.use('/api', apiRoutes);
   ```

### 2. Database Issues

#### Problem: Database connection failures

**Symptoms:**
- "Connection refused" errors
- Timeout errors
- Pool exhaustion messages

**Diagnostic Steps:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'escola_management_prod';"

# Test connection manually
psql -h localhost -U app_user -d escola_management_prod -c "SELECT 1;"

# Check connection pool status
node -e "console.log(require('./dist/database/connection').pool.totalCount, require('./dist/database/connection').pool.idleCount)"
```

**Solutions:**

1. **PostgreSQL not running:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Connection pool exhausted:**
   ```javascript
   // Increase pool size in database configuration
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     min: 5,
     max: 50, // Increase from default
     idleTimeoutMillis: 30000
   });
   ```

3. **Too many connections:**
   ```sql
   -- Check max connections
   SHOW max_connections;
   
   -- Increase if needed
   ALTER SYSTEM SET max_connections = 200;
   -- Restart PostgreSQL
   ```

4. **Authentication failure:**
   ```bash
   # Check pg_hba.conf
   sudo nano /etc/postgresql/14/main/pg_hba.conf
   
   # Add line for application user
   host    escola_management_prod    app_user    127.0.0.1/32    md5
   
   # Reload configuration
   sudo systemctl reload postgresql
   ```

#### Problem: Slow database queries

**Symptoms:**
- API responses are slow
- Database CPU usage is high
- Query timeouts

**Diagnostic Steps:**
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('escolas', 'produtos', 'usuarios');

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solutions:**

1. **Missing indexes:**
   ```sql
   -- Add tenant-aware indexes
   CREATE INDEX CONCURRENTLY idx_escolas_tenant_nome ON escolas(tenant_id, nome);
   CREATE INDEX CONCURRENTLY idx_produtos_tenant_categoria ON produtos(tenant_id, categoria);
   ```

2. **Inefficient queries:**
   ```sql
   -- Analyze query plans
   EXPLAIN ANALYZE SELECT * FROM escolas WHERE tenant_id = 'uuid' AND nome ILIKE '%search%';
   
   -- Optimize with proper indexing
   CREATE INDEX CONCURRENTLY idx_escolas_tenant_nome_gin ON escolas USING gin(tenant_id, nome gin_trgm_ops);
   ```

3. **Database maintenance:**
   ```sql
   -- Update statistics
   ANALYZE;
   
   -- Vacuum tables
   VACUUM ANALYZE escolas;
   VACUUM ANALYZE produtos;
   ```

### 3. Performance Issues

#### Problem: High memory usage

**Symptoms:**
- Application crashes with out-of-memory errors
- Server becomes unresponsive
- PM2 restarts frequently

**Diagnostic Steps:**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Check PM2 memory usage
pm2 monit

# Check Node.js heap usage
node -e "console.log(process.memoryUsage())"

# Check for memory leaks
node --inspect dist/index.js
# Use Chrome DevTools to analyze heap
```

**Solutions:**

1. **Increase memory limits:**
   ```javascript
   // In ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'escola-management-api',
       script: './dist/index.js',
       node_args: '--max_old_space_size=2048', // Increase heap size
       max_memory_restart: '2G'
     }]
   };
   ```

2. **Optimize caching:**
   ```javascript
   // Implement cache expiration
   const cache = new Map();
   const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
   
   setInterval(() => {
     const now = Date.now();
     for (const [key, value] of cache.entries()) {
       if (now - value.timestamp > CACHE_TTL) {
         cache.delete(key);
       }
     }
   }, 60000); // Clean every minute
   ```

3. **Database connection pooling:**
   ```javascript
   // Optimize pool configuration
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     min: 2,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000
   });
   ```

#### Problem: High CPU usage

**Symptoms:**
- Server response times are slow
- CPU usage consistently above 80%
- Load average is high

**Diagnostic Steps:**
```bash
# Check CPU usage
top -p $(pgrep -f "node.*escola-management")
htop

# Check PM2 cluster status
pm2 list

# Profile application
node --prof dist/index.js
# Generate profile report
node --prof-process isolate-*.log > profile.txt
```

**Solutions:**

1. **Scale horizontally:**
   ```javascript
   // In ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'escola-management-api',
       script: './dist/index.js',
       instances: 'max', // Use all CPU cores
       exec_mode: 'cluster'
     }]
   };
   ```

2. **Optimize queries:**
   ```javascript
   // Use database indexes effectively
   const schools = await db.query(`
     SELECT * FROM escolas 
     WHERE tenant_id = $1 AND status = 'active'
     ORDER BY nome
     LIMIT 50
   `, [tenantId]);
   ```

3. **Implement caching:**
   ```javascript
   // Cache frequently accessed data
   const cachedResult = await redis.get(`tenant:${tenantId}:schools`);
   if (cachedResult) {
     return JSON.parse(cachedResult);
   }
   
   const result = await fetchSchools(tenantId);
   await redis.setex(`tenant:${tenantId}:schools`, 300, JSON.stringify(result));
   return result;
   ```

### 4. Authentication Issues

#### Problem: JWT token validation failures

**Symptoms:**
- Users get "Invalid token" errors
- Authentication randomly fails
- Token expiration issues

**Diagnostic Steps:**
```bash
# Check JWT secret configuration
echo $JWT_SECRET

# Decode JWT token manually
node -e "console.log(require('jsonwebtoken').decode('your-jwt-token-here'))"

# Check token expiration
node -e "
const jwt = require('jsonwebtoken');
const token = 'your-jwt-token-here';
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token valid:', decoded);
} catch (err) {
  console.log('Token error:', err.message);
}
"
```

**Solutions:**

1. **JWT secret mismatch:**
   ```bash
   # Ensure JWT_SECRET is consistent across all instances
   # Update .env.production
   JWT_SECRET=your_consistent_secret_here
   
   # Restart application
   pm2 restart all
   ```

2. **Token expiration:**
   ```javascript
   // Implement token refresh
   app.post('/api/auth/refresh', async (req, res) => {
     const { refreshToken } = req.body;
     
     try {
       const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
       const newToken = jwt.sign(
         { userId: decoded.userId, tenantId: decoded.tenantId },
         process.env.JWT_SECRET,
         { expiresIn: '24h' }
       );
       
       res.json({ token: newToken });
     } catch (error) {
       res.status(401).json({ error: 'Invalid refresh token' });
     }
   });
   ```

3. **Clock synchronization:**
   ```bash
   # Ensure server time is synchronized
   sudo ntpdate -s time.nist.gov
   
   # Install NTP for automatic synchronization
   sudo apt install ntp
   sudo systemctl enable ntp
   ```

### 5. Migration Issues

#### Problem: Migration failures

**Symptoms:**
- Migrations fail to run
- Database schema inconsistencies
- Data corruption during migration

**Diagnostic Steps:**
```bash
# Check migration status
npm run migrate:status

# Check migration logs
tail -f logs/migration.log

# Verify database schema
psql -d escola_management_prod -c "\dt"
psql -d escola_management_prod -c "\d+ escolas"
```

**Solutions:**

1. **Failed migration rollback:**
   ```bash
   # Rollback to previous migration
   npm run migrate:down
   
   # Fix migration script and retry
   npm run migrate:up
   ```

2. **Schema inconsistencies:**
   ```sql
   -- Check for missing columns
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'escolas' AND column_name = 'tenant_id';
   
   -- Add missing column if needed
   ALTER TABLE escolas ADD COLUMN tenant_id UUID REFERENCES tenants(id);
   ```

3. **Data migration issues:**
   ```bash
   # Backup before migration
   pg_dump escola_management_prod > backup_before_migration.sql
   
   # Run migration with verbose logging
   DEBUG=migration:* npm run migrate:up
   
   # Validate data after migration
   node validate-multi-tenant-data.js
   ```

### 6. Cache Issues

#### Problem: Redis connection failures

**Symptoms:**
- Cache operations fail
- Performance degradation
- "Connection refused" errors

**Diagnostic Steps:**
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Check Redis memory usage
redis-cli info memory

# Monitor Redis operations
redis-cli monitor
```

**Solutions:**

1. **Redis not running:**
   ```bash
   sudo systemctl start redis
   sudo systemctl enable redis
   ```

2. **Memory issues:**
   ```bash
   # Check Redis configuration
   redis-cli config get maxmemory
   
   # Set memory limit
   redis-cli config set maxmemory 1gb
   redis-cli config set maxmemory-policy allkeys-lru
   ```

3. **Connection configuration:**
   ```javascript
   // Implement Redis connection with retry
   const redis = require('redis');
   const client = redis.createClient({
     url: process.env.REDIS_URL,
     retry_strategy: (options) => {
       if (options.error && options.error.code === 'ECONNREFUSED') {
         return new Error('Redis server connection refused');
       }
       if (options.total_retry_time > 1000 * 60 * 60) {
         return new Error('Retry time exhausted');
       }
       return Math.min(options.attempt * 100, 3000);
     }
   });
   ```

### 7. Monitoring and Logging Issues

#### Problem: Missing or incomplete logs

**Symptoms:**
- No application logs
- Incomplete audit trails
- Monitoring data gaps

**Diagnostic Steps:**
```bash
# Check log files
ls -la logs/
tail -f logs/combined.log

# Check PM2 logs
pm2 logs

# Check system logs
journalctl -u escola-management-api -f

# Check log rotation
ls -la /var/log/escola-management/
```

**Solutions:**

1. **Log configuration:**
   ```javascript
   // Configure Winston logger
   const winston = require('winston');
   
   const logger = winston.createLogger({
     level: process.env.LOG_LEVEL || 'info',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.errors({ stack: true }),
       winston.format.json()
     ),
     transports: [
       new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
       new winston.transports.File({ filename: 'logs/combined.log' })
     ]
   });
   ```

2. **Log rotation:**
   ```bash
   # Configure logrotate
   sudo nano /etc/logrotate.d/escola-management
   
   # Add configuration
   /var/www/escola-management/logs/*.log {
       daily
       missingok
       rotate 30
       compress
       delaycompress
       notifempty
       create 644 www-data www-data
   }
   ```

3. **Audit logging:**
   ```javascript
   // Ensure audit middleware is properly configured
   app.use(auditMiddleware({
     enabled: process.env.ENABLE_AUDIT_LOGGING === 'true',
     logLevel: 'info',
     includeBody: true,
     excludePaths: ['/health', '/metrics']
   }));
   ```

## Emergency Procedures

### System Recovery

1. **Complete system failure:**
   ```bash
   # Stop all services
   pm2 stop all
   
   # Restore from backup
   psql -d escola_management_prod < latest_backup.sql
   
   # Restart services
   pm2 start all
   
   # Verify system health
   curl -f https://yourdomain.com/api/health
   ```

2. **Database corruption:**
   ```bash
   # Stop application
   pm2 stop all
   
   # Restore database from backup
   dropdb escola_management_prod
   createdb escola_management_prod
   psql -d escola_management_prod < backup.sql
   
   # Restart application
   pm2 start all
   ```

### Data Recovery

1. **Tenant data loss:**
   ```bash
   # Restore specific tenant data
   pg_restore --data-only --table=escolas --table=produtos \
     --where="tenant_id='tenant-uuid'" backup.dump
   ```

2. **Configuration loss:**
   ```sql
   -- Restore default tenant configuration
   INSERT INTO tenant_configurations (tenant_id, category, key, value)
   VALUES 
   ('tenant-uuid', 'features', 'inventory', 'true'),
   ('tenant-uuid', 'features', 'contracts', 'true');
   ```

## Performance Optimization

### Database Optimization

```sql
-- Analyze table statistics
ANALYZE escolas;
ANALYZE produtos;

-- Reindex tables
REINDEX TABLE escolas;
REINDEX TABLE produtos;

-- Update PostgreSQL configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
```

### Application Optimization

```javascript
// Implement connection pooling
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: 5,
  max: 30,
  idleTimeoutMillis: 30000
});

// Implement query caching
const queryCache = new Map();
const getCachedQuery = (key, queryFn) => {
  if (queryCache.has(key)) {
    return queryCache.get(key);
  }
  
  const result = queryFn();
  queryCache.set(key, result);
  
  // Expire cache after 5 minutes
  setTimeout(() => queryCache.delete(key), 5 * 60 * 1000);
  
  return result;
};
```

## Preventive Measures

### Regular Maintenance

1. **Daily checks:**
   - Monitor application health
   - Check error logs
   - Verify backup completion

2. **Weekly maintenance:**
   - Update system packages
   - Clean up old logs
   - Review performance metrics

3. **Monthly tasks:**
   - Database maintenance (VACUUM, ANALYZE)
   - Security updates
   - Capacity planning review

### Monitoring Setup

```bash
# Set up monitoring alerts
# CPU usage > 80%
echo "*/5 * * * * if [ \$(cat /proc/loadavg | cut -d' ' -f1 | cut -d'.' -f1) -gt 4 ]; then echo 'High CPU usage' | mail -s 'Alert' admin@yourdomain.com; fi" | crontab -

# Disk space < 10%
echo "0 */6 * * * if [ \$(df / | tail -1 | awk '{print \$5}' | sed 's/%//') -gt 90 ]; then echo 'Low disk space' | mail -s 'Alert' admin@yourdomain.com; fi" | crontab -
```

## Getting Help

### Log Analysis

When reporting issues, include:
- Application logs from the time of the issue
- Database query logs
- System resource usage
- Steps to reproduce the problem

### Support Contacts

- **Technical Issues**: Create issue in project repository
- **Security Issues**: Email security@yourdomain.com
- **Emergency**: Call emergency support line

### Useful Resources

- [Multi-Tenant Architecture Documentation](./MULTI_TENANT_ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema Documentation](./DATABASE_SCHEMA.md)