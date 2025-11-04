# Multi-Tenant Security Guidelines

## Overview

This document outlines comprehensive security guidelines for the multi-tenant school management system. It covers data isolation, access control, authentication, authorization, and security best practices to ensure tenant data remains secure and isolated.

## Security Architecture

### Defense in Depth

The system implements multiple layers of security:

1. **Network Security**: Firewall, SSL/TLS, VPN access
2. **Application Security**: Input validation, output encoding, secure coding
3. **Database Security**: RLS policies, encryption, access controls
4. **Infrastructure Security**: Server hardening, monitoring, logging

### Zero Trust Model

- Never trust, always verify
- Validate every request and user
- Implement least privilege access
- Continuous monitoring and validation

## Data Isolation and Tenant Security

### Row Level Security (RLS)

#### Implementation
```sql
-- Enable RLS on all multi-tenant tables
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_escolas ON escolas
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Ensure policy is enforced for all users
ALTER TABLE escolas FORCE ROW LEVEL SECURITY;
```

#### Best Practices
1. **Always enable RLS** on multi-tenant tables
2. **Use FORCE ROW LEVEL SECURITY** to prevent bypassing
3. **Test policies thoroughly** with different user roles
4. **Monitor policy violations** through audit logs

### Tenant Context Management

#### Secure Context Setting
```javascript
// Always validate tenant context before setting
const setTenantContext = async (tenantId, userId) => {
  // Validate user belongs to tenant
  const userTenant = await validateUserTenant(userId, tenantId);
  if (!userTenant) {
    throw new SecurityError('User not authorized for tenant');
  }
  
  // Set database context
  await db.query('SELECT set_config($1, $2, false)', [
    'app.current_tenant_id', 
    tenantId
  ]);
  
  // Log context change
  await auditLog.log({
    action: 'TENANT_CONTEXT_SET',
    userId,
    tenantId,
    timestamp: new Date()
  });
};
```

#### Context Validation
```javascript
// Validate tenant context on every request
const validateTenantContext = (req, res, next) => {
  const tenantId = req.tenant?.id;
  const userId = req.user?.id;
  
  if (!tenantId || !userId) {
    return res.status(401).json({ error: 'Invalid tenant context' });
  }
  
  // Verify user-tenant association
  if (!req.user.tenants.includes(tenantId)) {
    return res.status(403).json({ error: 'Tenant access denied' });
  }
  
  next();
};
```

## Authentication and Authorization

### Multi-Factor Authentication (MFA)

#### Implementation Requirements
1. **Mandatory for admin users** (system and tenant admins)
2. **Optional but recommended** for regular users
3. **Support multiple factors**: SMS, email, authenticator apps
4. **Backup codes** for account recovery

#### Configuration
```javascript
const mfaConfig = {
  required: {
    system_admin: true,
    tenant_admin: true,
    school_admin: false,
    user: false
  },
  methods: ['totp', 'sms', 'email'],
  backupCodes: {
    count: 10,
    length: 8,
    expiry: '30 days'
  }
};
```

### JWT Token Security

#### Token Configuration
```javascript
const jwtConfig = {
  secret: process.env.JWT_SECRET, // 256-bit random key
  algorithm: 'HS256',
  expiresIn: '1h', // Short expiration
  issuer: 'escola-management-system',
  audience: 'escola-management-users'
};

// Include tenant information in token
const generateToken = (user, tenant) => {
  return jwt.sign({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    permissions: user.permissions
  }, jwtConfig.secret, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  });
};
```

#### Token Validation
```javascript
const validateToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    
    // Validate token hasn't been revoked
    if (isTokenRevoked(decoded.jti)) {
      throw new Error('Token has been revoked');
    }
    
    return decoded;
  } catch (error) {
    throw new AuthenticationError('Invalid token');
  }
};
```

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```javascript
const roleHierarchy = {
  system_admin: {
    level: 100,
    permissions: ['*'], // All permissions
    description: 'System-wide administrator'
  },
  tenant_admin: {
    level: 80,
    permissions: [
      'tenant:read', 'tenant:update',
      'users:*', 'schools:*', 'products:*',
      'contracts:*', 'orders:*', 'reports:*'
    ],
    description: 'Tenant administrator'
  },
  school_admin: {
    level: 60,
    permissions: [
      'schools:read', 'schools:update',
      'inventory:*', 'orders:create', 'orders:read',
      'reports:read'
    ],
    description: 'School administrator'
  },
  user: {
    level: 40,
    permissions: [
      'schools:read', 'products:read',
      'inventory:read', 'inventory:update',
      'orders:create', 'orders:read'
    ],
    description: 'Regular user'
  },
  viewer: {
    level: 20,
    permissions: [
      'schools:read', 'products:read',
      'inventory:read', 'reports:read'
    ],
    description: 'Read-only access'
  }
};
```

#### Permission Validation
```javascript
const hasPermission = (userRole, requiredPermission) => {
  const role = roleHierarchy[userRole];
  if (!role) return false;
  
  // Check for wildcard permissions
  if (role.permissions.includes('*')) return true;
  
  // Check for exact permission
  if (role.permissions.includes(requiredPermission)) return true;
  
  // Check for wildcard in resource
  const [resource] = requiredPermission.split(':');
  if (role.permissions.includes(`${resource}:*`)) return true;
  
  return false;
};
```

## Input Validation and Sanitization

### Request Validation

#### Schema Validation
```javascript
const Joi = require('joi');

const tenantSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(50).required(),
  domain: Joi.string().domain().optional(),
  subdomain: Joi.string().pattern(/^[a-z0-9-]+$/).min(3).max(50).optional()
});

const validateTenantInput = (req, res, next) => {
  const { error, value } = tenantSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  req.validatedBody = value;
  next();
};
```

#### SQL Injection Prevention
```javascript
// Always use parameterized queries
const getSchoolsByTenant = async (tenantId, searchTerm) => {
  // GOOD: Parameterized query
  const query = `
    SELECT * FROM escolas 
    WHERE tenant_id = $1 
    AND nome ILIKE $2
    ORDER BY nome
  `;
  return await db.query(query, [tenantId, `%${searchTerm}%`]);
  
  // BAD: String concatenation (vulnerable to SQL injection)
  // const query = `SELECT * FROM escolas WHERE nome LIKE '%${searchTerm}%'`;
};
```

#### XSS Prevention
```javascript
const xss = require('xss');

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return xss(input, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }
  return input;
};

// Sanitize all string inputs
const sanitizeMiddleware = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeInput(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  
  next();
};
```

## Data Encryption

### Encryption at Rest

#### Database Encryption
```sql
-- Enable transparent data encryption (TDE) at database level
-- This is typically configured at the PostgreSQL instance level

-- Encrypt sensitive columns using pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt personal information
ALTER TABLE usuarios ADD COLUMN telefone_encrypted BYTEA;

-- Function to encrypt data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

#### File Encryption
```javascript
const crypto = require('crypto');
const fs = require('fs');

const encryptFile = (filePath, encryptionKey) => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, encryptionKey, iv);
  
  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(`${filePath}.encrypted`);
  
  input.pipe(cipher).pipe(output);
  
  return { iv: iv.toString('hex') };
};
```

### Encryption in Transit

#### SSL/TLS Configuration
```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    
    # SSL certificates
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Other security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

## API Security

### Rate Limiting

#### Implementation
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Global rate limiting
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

// Tenant-specific rate limiting
const tenantLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:tenant:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: (req) => {
    // Get tenant-specific limit from configuration
    return req.tenant?.limits?.apiRateLimit || 1000;
  },
  keyGenerator: (req) => {
    return `${req.ip}:${req.tenant?.id}`;
  },
  message: 'Tenant API rate limit exceeded'
});
```

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests from tenant domains
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      /^https:\/\/[\w-]+\.yourdomain\.com$/,
      /^https:\/\/[\w-]+\.gov\.br$/
    ];
    
    if (!origin || allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      return allowed.test(origin);
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID']
};

app.use(cors(corsOptions));
```

### Request Signing

```javascript
const crypto = require('crypto');

// Generate request signature
const generateSignature = (method, url, body, timestamp, secret) => {
  const payload = `${method}|${url}|${JSON.stringify(body)}|${timestamp}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

// Validate request signature
const validateSignature = (req, res, next) => {
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature or timestamp' });
  }
  
  // Check timestamp (prevent replay attacks)
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  if (Math.abs(now - requestTime) > 300000) { // 5 minutes
    return res.status(401).json({ error: 'Request timestamp too old' });
  }
  
  // Validate signature
  const expectedSignature = generateSignature(
    req.method,
    req.originalUrl,
    req.body,
    timestamp,
    process.env.API_SECRET
  );
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};
```

## Audit Logging and Monitoring

### Comprehensive Audit Logging

```javascript
const auditLogger = {
  log: async (event) => {
    const auditEntry = {
      id: uuidv4(),
      tenantId: event.tenantId,
      userId: event.userId,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      oldValues: event.oldValues,
      newValues: event.newValues,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date(),
      sessionId: event.sessionId
    };
    
    // Store in database
    await db.query(`
      INSERT INTO tenant_audit_logs 
      (id, tenant_id, user_id, action, resource_type, resource_id, 
       old_values, new_values, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      auditEntry.id, auditEntry.tenantId, auditEntry.userId,
      auditEntry.action, auditEntry.resourceType, auditEntry.resourceId,
      JSON.stringify(auditEntry.oldValues), JSON.stringify(auditEntry.newValues),
      auditEntry.ipAddress, auditEntry.userAgent, auditEntry.timestamp
    ]);
    
    // Send to external logging service
    await externalLogger.send(auditEntry);
  }
};

// Audit middleware
const auditMiddleware = (action, resourceType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after successful response
      if (res.statusCode < 400) {
        auditLogger.log({
          tenantId: req.tenant?.id,
          userId: req.user?.id,
          action,
          resourceType,
          resourceId: req.params.id,
          oldValues: req.originalData,
          newValues: req.body,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};
```

### Security Monitoring

```javascript
const securityMonitor = {
  // Monitor failed login attempts
  trackFailedLogin: async (email, ipAddress, tenantId) => {
    const key = `failed_login:${email}:${ipAddress}`;
    const attempts = await redis.incr(key);
    await redis.expire(key, 900); // 15 minutes
    
    if (attempts >= 5) {
      await this.alertSecurityTeam({
        type: 'BRUTE_FORCE_ATTEMPT',
        email,
        ipAddress,
        tenantId,
        attempts
      });
      
      // Temporarily block IP
      await redis.setex(`blocked_ip:${ipAddress}`, 3600, '1');
    }
  },
  
  // Monitor cross-tenant access attempts
  trackCrossTenantAccess: async (userId, attemptedTenantId, actualTenantId) => {
    await auditLogger.log({
      action: 'CROSS_TENANT_ACCESS_ATTEMPT',
      userId,
      tenantId: actualTenantId,
      resourceType: 'tenant',
      resourceId: attemptedTenantId,
      severity: 'HIGH'
    });
    
    await this.alertSecurityTeam({
      type: 'CROSS_TENANT_ACCESS',
      userId,
      attemptedTenantId,
      actualTenantId
    });
  },
  
  // Monitor privilege escalation attempts
  trackPrivilegeEscalation: async (userId, currentRole, attemptedRole) => {
    await auditLogger.log({
      action: 'PRIVILEGE_ESCALATION_ATTEMPT',
      userId,
      resourceType: 'user_role',
      oldValues: { role: currentRole },
      newValues: { role: attemptedRole },
      severity: 'CRITICAL'
    });
  }
};
```

## Incident Response

### Security Incident Classification

#### Severity Levels
1. **Critical**: Data breach, system compromise, unauthorized admin access
2. **High**: Cross-tenant access, privilege escalation, authentication bypass
3. **Medium**: Brute force attacks, suspicious activity patterns
4. **Low**: Failed login attempts, minor policy violations

#### Response Procedures

```javascript
const incidentResponse = {
  handleSecurityIncident: async (incident) => {
    const { severity, type, details } = incident;
    
    // Immediate response based on severity
    switch (severity) {
      case 'CRITICAL':
        await this.lockdownSystem();
        await this.notifyEmergencyTeam();
        break;
        
      case 'HIGH':
        await this.isolateAffectedTenant(details.tenantId);
        await this.notifySecurityTeam();
        break;
        
      case 'MEDIUM':
        await this.increaseMonitoring();
        await this.notifyAdministrators();
        break;
        
      case 'LOW':
        await this.logIncident();
        break;
    }
    
    // Create incident record
    await this.createIncidentRecord(incident);
  },
  
  lockdownSystem: async () => {
    // Disable all non-admin access
    await redis.set('system_lockdown', '1', 'EX', 3600);
    
    // Revoke all active sessions except system admins
    await this.revokeUserSessions({ excludeRoles: ['system_admin'] });
    
    // Alert all administrators
    await this.sendEmergencyAlert('System lockdown initiated due to security incident');
  },
  
  isolateTenant: async (tenantId) => {
    // Disable tenant access
    await db.query('UPDATE tenants SET status = $1 WHERE id = $2', ['suspended', tenantId]);
    
    // Revoke tenant user sessions
    await this.revokeUserSessions({ tenantId });
    
    // Alert tenant administrators
    await this.notifyTenantAdmins(tenantId, 'Tenant access temporarily suspended due to security incident');
  }
};
```

## Security Testing

### Automated Security Testing

```javascript
// Security test suite
const securityTests = {
  testTenantIsolation: async () => {
    // Test that users cannot access other tenant's data
    const tenant1User = await createTestUser('tenant1');
    const tenant2Data = await createTestData('tenant2');
    
    try {
      await apiRequest('/api/schools', {
        headers: { Authorization: `Bearer ${tenant1User.token}` }
      });
      
      // Should not return tenant2 data
      assert(!response.data.some(school => school.tenant_id === 'tenant2'));
    } catch (error) {
      // Expected behavior
    }
  },
  
  testSQLInjection: async () => {
    const maliciousInput = "'; DROP TABLE escolas; --";
    
    const response = await apiRequest('/api/schools', {
      method: 'POST',
      body: { nome: maliciousInput }
    });
    
    // Should not succeed
    assert(response.status >= 400);
    
    // Verify table still exists
    const tableExists = await db.query("SELECT 1 FROM escolas LIMIT 1");
    assert(tableExists);
  },
  
  testXSS: async () => {
    const xssPayload = '<script>alert("xss")</script>';
    
    const response = await apiRequest('/api/schools', {
      method: 'POST',
      body: { nome: xssPayload }
    });
    
    // Should be sanitized
    assert(!response.data.nome.includes('<script>'));
  }
};
```

### Penetration Testing Checklist

#### Authentication & Authorization
- [ ] Test password complexity requirements
- [ ] Test account lockout mechanisms
- [ ] Test session management
- [ ] Test privilege escalation
- [ ] Test JWT token security

#### Input Validation
- [ ] Test SQL injection vulnerabilities
- [ ] Test XSS vulnerabilities
- [ ] Test command injection
- [ ] Test file upload security
- [ ] Test parameter tampering

#### Tenant Isolation
- [ ] Test cross-tenant data access
- [ ] Test tenant context manipulation
- [ ] Test RLS policy bypass attempts
- [ ] Test subdomain security
- [ ] Test API endpoint isolation

## Compliance and Regulations

### LGPD (Lei Geral de Proteção de Dados) Compliance

#### Data Protection Measures
1. **Data Minimization**: Collect only necessary data
2. **Purpose Limitation**: Use data only for stated purposes
3. **Storage Limitation**: Retain data only as long as necessary
4. **Data Subject Rights**: Provide access, correction, deletion rights

#### Implementation
```javascript
const lgpdCompliance = {
  // Right to access personal data
  getPersonalData: async (userId, tenantId) => {
    const userData = await db.query(`
      SELECT nome, email, telefone, created_at, updated_at
      FROM usuarios 
      WHERE id = $1 AND tenant_id = $2
    `, [userId, tenantId]);
    
    return {
      personalData: userData.rows[0],
      dataProcessingPurpose: 'School management system operations',
      retentionPeriod: '5 years after account closure',
      thirdPartySharing: 'None'
    };
  },
  
  // Right to data portability
  exportPersonalData: async (userId, tenantId) => {
    const allUserData = await db.query(`
      SELECT * FROM usuarios WHERE id = $1 AND tenant_id = $2
      UNION ALL
      SELECT * FROM audit_logs WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);
    
    return {
      format: 'JSON',
      data: allUserData.rows,
      exportDate: new Date().toISOString()
    };
  },
  
  // Right to erasure (right to be forgotten)
  deletePersonalData: async (userId, tenantId) => {
    await db.transaction(async (trx) => {
      // Anonymize user data instead of deleting (for audit trail)
      await trx.query(`
        UPDATE usuarios 
        SET nome = 'Deleted User', 
            email = 'deleted_' || id || '@deleted.com',
            telefone = NULL,
            status = 'deleted'
        WHERE id = $1 AND tenant_id = $2
      `, [userId, tenantId]);
      
      // Log the deletion
      await auditLogger.log({
        action: 'PERSONAL_DATA_DELETED',
        userId,
        tenantId,
        reason: 'User requested data deletion (LGPD compliance)'
      });
    });
  }
};
```

## Security Configuration Checklist

### Production Security Checklist

#### Server Security
- [ ] Operating system hardened and updated
- [ ] Unnecessary services disabled
- [ ] Firewall configured with minimal open ports
- [ ] SSH access restricted and key-based
- [ ] Regular security updates applied

#### Database Security
- [ ] Database access restricted to application servers
- [ ] Strong database passwords
- [ ] SSL/TLS encryption for database connections
- [ ] Regular database backups encrypted
- [ ] Database audit logging enabled

#### Application Security
- [ ] All dependencies updated to latest secure versions
- [ ] Environment variables secured
- [ ] Error messages don't expose sensitive information
- [ ] Security headers configured
- [ ] Rate limiting implemented

#### Monitoring and Logging
- [ ] Comprehensive audit logging enabled
- [ ] Security monitoring alerts configured
- [ ] Log retention policies implemented
- [ ] Regular security log reviews scheduled
- [ ] Incident response procedures documented

### Security Maintenance

#### Daily Tasks
- Monitor security alerts and logs
- Review failed authentication attempts
- Check system resource usage
- Verify backup completion

#### Weekly Tasks
- Review audit logs for anomalies
- Update security patches
- Test backup restoration procedures
- Review user access permissions

#### Monthly Tasks
- Conduct security vulnerability scans
- Review and update security policies
- Test incident response procedures
- Security awareness training for staff

#### Quarterly Tasks
- Penetration testing
- Security policy review and updates
- Disaster recovery testing
- Compliance audit

## Emergency Contacts and Procedures

### Security Team Contacts
- **Security Lead**: security-lead@yourdomain.com
- **System Administrator**: sysadmin@yourdomain.com
- **Development Team**: dev-team@yourdomain.com
- **Emergency Hotline**: +1-xxx-xxx-xxxx

### Incident Reporting
1. **Immediate**: Call emergency hotline for critical incidents
2. **High Priority**: Email security team within 1 hour
3. **Medium Priority**: Create security ticket within 4 hours
4. **Low Priority**: Include in weekly security report

For additional security information and updates, refer to:
- [Multi-Tenant Architecture Documentation](./MULTI_TENANT_ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)