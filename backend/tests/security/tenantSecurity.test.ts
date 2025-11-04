/**
 * Security tests for cross-tenant access prevention
 * Tests security measures and attack prevention
 */

import request from 'supertest';
import { testDb } from '../helpers/testDatabase';

// Mock the database
jest.mock('../../src/database');
const db = require('../../src/database');

describe('Tenant Security Tests', () => {
  let app: any;
  let tenant1: any;
  let tenant2: any;
  let user1: any;
  let user2: any;
  let adminUser: any;
  let school1: any;
  let school2: any;

  beforeAll(async () => {
    // Import app after mocking database
    app = require('../../src/index').app;
  });

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await testDb.createTestTenant({
      slug: 'security-tenant1',
      subdomain: 'sec1',
      name: 'Security Tenant 1'
    });

    tenant2 = await testDb.createTestTenant({
      slug: 'security-tenant2',
      subdomain: 'sec2',
      name: 'Security Tenant 2'
    });

    // Create test users
    user1 = await testDb.createTestUser({
      nome: 'Security User 1',
      email: 'sec1@tenant1.com',
      tenant_id: tenant1.id
    });

    user2 = await testDb.createTestUser({
      nome: 'Security User 2',
      email: 'sec2@tenant2.com',
      tenant_id: tenant2.id
    });

    adminUser = await testDb.createTestUser({
      nome: 'Admin User',
      email: 'admin@tenant1.com',
      tenant_id: tenant1.id
    });

    // Create tenant user associations
    await testDb.createTenantUser(tenant1.id, user1.id, 'user');
    await testDb.createTenantUser(tenant2.id, user2.id, 'user');
    await testDb.createTenantUser(tenant1.id, adminUser.id, 'tenant_admin');

    // Create test data
    school1 = await testDb.createTestSchool(tenant1.id, 'Security School 1');
    school2 = await testDb.createTestSchool(tenant2.id, 'Security School 2');

    setupSecurityMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
    jest.clearAllMocks();
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection through tenant ID header', async () => {
      const maliciousPayload = "'; DROP TABLE escolas; SELECT * FROM escolas WHERE '1'='1";

      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', maliciousPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('TENANT_NOT_FOUND');
      
      // Verify that the malicious query was not executed
      expect(db.query).not.toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE'),
        expect.any(Array)
      );
    });

    it('should prevent SQL injection through subdomain', async () => {
      const maliciousSubdomain = "test'; DROP TABLE tenants; --";

      const response = await request(app)
        .get('/api/escolas')
        .set('Host', `${maliciousSubdomain}.example.com`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize tenant context parameters', async () => {
      const maliciousContext = "test'; SET app.current_tenant_id = 'malicious'; --";

      db.query.mockImplementation((query: string, params: any[]) => {
        // Verify that parameters are properly escaped
        if (query.includes('set_tenant_context')) {
          expect(params[0]).not.toContain('DROP');
          expect(params[0]).not.toContain('SET');
          expect(params[0]).not.toContain('--');
        }
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', maliciousContext)
        .expect(400);
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent direct access to other tenant resources by ID', async () => {
      // Try to access tenant2's school using tenant1 context
      const response = await request(app)
        .get(`/api/escolas/${school2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should prevent bulk operations across tenants', async () => {
      const bulkUpdate = {
        ids: [school1.id, school2.id], // Mix of tenant1 and tenant2 schools
        updates: { nome: 'Hacked School' }
      };

      const response = await request(app)
        .put('/api/escolas/bulk')
        .set('X-Tenant-ID', tenant1.id)
        .send(bulkUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent tenant context switching in single request', async () => {
      // Attempt to switch tenant context mid-request
      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', tenant1.id)
        .set('X-Switch-Tenant', tenant2.id) // Malicious header
        .expect(200);

      // Should only return tenant1 data
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(school1.id);
    });

    it('should prevent privilege escalation through tenant switching', async () => {
      const jwt = require('jsonwebtoken');
      const userToken = jwt.sign({
        id: user1.id,
        tenant_id: tenant1.id,
        tenantRole: 'user'
      }, process.env.JWT_SECRET);

      // Try to access admin endpoint with user token
      const response = await request(app)
        .post('/api/tenants/config')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Tenant-ID', tenant1.id)
        .send({ setting: 'value' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Authentication and Authorization Security', () => {
    it('should reject requests with tampered JWT tokens', async () => {
      const jwt = require('jsonwebtoken');
      const validToken = jwt.sign({
        id: user1.id,
        tenant_id: tenant1.id,
        tenantRole: 'user'
      }, process.env.JWT_SECRET);

      // Tamper with the token
      const tamperedToken = validToken.slice(0, -10) + 'tampered123';

      const response = await request(app)
        .get('/api/escolas')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should prevent token reuse across tenants', async () => {
      const jwt = require('jsonwebtoken');
      const tenant1Token = jwt.sign({
        id: user1.id,
        tenant_id: tenant1.id,
        tenantRole: 'tenant_admin'
      }, process.env.JWT_SECRET);

      // Try to use tenant1 token to access tenant2 data
      const response = await request(app)
        .get('/api/escolas')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .set('X-Tenant-ID', tenant2.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('TENANT_MISMATCH');
    });

    it('should validate user-tenant associations', async () => {
      const jwt = require('jsonwebtoken');
      
      // Create token for user1 but try to access with tenant2 context
      const mismatchedToken = jwt.sign({
        id: user1.id,
        tenant_id: tenant2.id, // Wrong tenant
        tenantRole: 'user'
      }, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/escolas')
        .set('Authorization', `Bearer ${mismatchedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should enforce session timeout and token expiration', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign({
        id: user1.id,
        tenant_id: tenant1.id,
        tenantRole: 'user',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      }, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/escolas')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not expose tenant information in error messages', async () => {
      const response = await request(app)
        .get('/api/escolas/nonexistent-id')
        .set('X-Tenant-ID', tenant1.id)
        .expect(404);

      expect(response.body.message).not.toContain(tenant1.id);
      expect(response.body.message).not.toContain(tenant1.name);
      expect(response.body.message).not.toContain('tenant');
    });

    it('should not leak tenant data in API responses', async () => {
      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      // Verify response doesn't contain other tenant's data
      response.body.data.forEach((school: any) => {
        expect(school.tenant_id).toBe(tenant1.id);
      });
    });

    it('should prevent information disclosure through timing attacks', async () => {
      const validTenantStart = Date.now();
      await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);
      const validTenantTime = Date.now() - validTenantStart;

      const invalidTenantStart = Date.now();
      await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', 'nonexistent-tenant')
        .expect(400);
      const invalidTenantTime = Date.now() - invalidTenantStart;

      // Response times should be similar to prevent timing attacks
      const timeDifference = Math.abs(validTenantTime - invalidTenantTime);
      expect(timeDifference).toBeLessThan(100); // Within 100ms
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate tenant ID format', async () => {
      const invalidFormats = [
        'not-a-uuid',
        '123',
        'tenant-name',
        '../../../etc/passwd',
        '<script>alert("xss")</script>'
      ];

      for (const invalidId of invalidFormats) {
        const response = await request(app)
          .get('/api/escolas')
          .set('X-Tenant-ID', invalidId)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should sanitize subdomain input', async () => {
      const maliciousSubdomains = [
        'test<script>',
        'test"onload="alert(1)"',
        'test/../admin',
        'test%00admin'
      ];

      for (const subdomain of maliciousSubdomains) {
        const response = await request(app)
          .get('/api/escolas')
          .set('Host', `${subdomain}.example.com`)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should prevent header injection attacks', async () => {
      const maliciousHeaders = {
        'X-Tenant-ID': `${tenant1.id}\r\nX-Admin: true`,
        'Host': `tenant1.example.com\r\nX-Forwarded-For: admin.internal`
      };

      const response = await request(app)
        .get('/api/escolas')
        .set(maliciousHeaders)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    it('should handle rapid tenant resolution requests', async () => {
      const rapidRequests = Array.from({ length: 100 }, () =>
        request(app)
          .get('/api/escolas')
          .set('X-Tenant-ID', tenant1.id)
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      // Most requests should succeed (rate limiting would be handled by infrastructure)
      const successfulRequests = responses.filter(r => r.status === 'fulfilled').length;
      expect(successfulRequests).toBeGreaterThan(50);
    });

    it('should prevent tenant enumeration attacks', async () => {
      const enumerationAttempts = Array.from({ length: 1000 }, (_, i) =>
        request(app)
          .get('/api/escolas')
          .set('X-Tenant-ID', `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`)
      );

      const responses = await Promise.allSettled(enumerationAttempts);
      
      // All should fail with same error to prevent enumeration
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          expect(response.value.status).toBe(400);
          expect(response.value.body.error).toBe('TENANT_NOT_FOUND');
        }
      });
    });
  });

  describe('Audit and Monitoring Security', () => {
    it('should log security violations', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Attempt cross-tenant access
      await request(app)
        .get(`/api/escolas/${school2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(404);

      // Verify security event was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('security'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should not log sensitive information', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', 'invalid-tenant')
        .expect(400);

      // Verify logs don't contain sensitive data
      const logCalls = consoleSpy.mock.calls;
      logCalls.forEach(call => {
        const logMessage = JSON.stringify(call);
        expect(logMessage).not.toContain('password');
        expect(logMessage).not.toContain('secret');
        expect(logMessage).not.toContain('token');
      });

      consoleSpy.mockRestore();
    });
  });

  function setupSecurityMocks() {
    // Mock database queries for security tests
    db.query.mockImplementation((query: string, params: any[]) => {
      // Mock tenant resolution
      if (query.includes('FROM tenants WHERE')) {
        if (params[0] === tenant1.id || params[0] === tenant1.slug) {
          return Promise.resolve({ rows: [tenant1] });
        }
        if (params[0] === tenant2.id || params[0] === tenant2.slug) {
          return Promise.resolve({ rows: [tenant2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock RLS context functions
      if (query.includes('set_tenant_context')) {
        return Promise.resolve({ rows: [] });
      }

      // Mock school queries with proper tenant filtering
      if (query.includes('FROM escolas')) {
        if (query.includes('WHERE') && params.includes(tenant1.id)) {
          return Promise.resolve({ rows: [school1] });
        }
        if (query.includes('WHERE') && params.includes(tenant2.id)) {
          return Promise.resolve({ rows: [school2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock user queries
      if (query.includes('FROM usuarios')) {
        const userId = params.find(p => typeof p === 'number');
        if (userId === user1.id) {
          return Promise.resolve({ rows: [{ ...user1, tenant_role: 'user' }] });
        }
        if (userId === user2.id) {
          return Promise.resolve({ rows: [{ ...user2, tenant_role: 'user' }] });
        }
        if (userId === adminUser.id) {
          return Promise.resolve({ rows: [{ ...adminUser, tenant_role: 'tenant_admin' }] });
        }
        return Promise.resolve({ rows: [] });
      }

      return Promise.resolve({ rows: [] });
    });
  }
});