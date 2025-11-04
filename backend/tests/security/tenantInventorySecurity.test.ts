/**
 * Security tests for tenant inventory system
 * Tests cross-tenant access prevention and security vulnerabilities
 */

import request from 'supertest';
import { testDb } from '../helpers/testDatabase';

// Mock the database for security tests
jest.mock('../../src/database');
const db = require('../../src/database');

describe('Tenant Inventory Security Tests', () => {
  let app: any;
  let tenant1: any;
  let tenant2: any;
  let user1: any;
  let user2: any;
  let school1: any;
  let school2: any;
  let product1: any;
  let product2: any;
  let inventoryItem1: any;
  let inventoryItem2: any;

  beforeAll(async () => {
    // Import app after mocking database
    app = require('../../src/index').app;
  });

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await testDb.createTestTenant({
      slug: 'security-tenant1',
      name: 'Security Tenant 1'
    });

    tenant2 = await testDb.createTestTenant({
      slug: 'security-tenant2',
      name: 'Security Tenant 2'
    });

    // Create test users
    user1 = await testDb.createTestUser({
      nome: 'Security User 1',
      email: 'security1@tenant1.com',
      tenant_id: tenant1.id
    });

    user2 = await testDb.createTestUser({
      nome: 'Security User 2',
      email: 'security2@tenant2.com',
      tenant_id: tenant2.id
    });

    // Create test data
    school1 = await testDb.createTestSchool(tenant1.id, 'Security School 1');
    school2 = await testDb.createTestSchool(tenant2.id, 'Security School 2');
    product1 = await testDb.createTestProduct(tenant1.id, 'Security Product 1');
    product2 = await testDb.createTestProduct(tenant2.id, 'Security Product 2');

    inventoryItem1 = {
      id: 1,
      escola_id: school1.id,
      produto_id: product1.id,
      quantidade_atual: 100,
      tenant_id: tenant1.id
    };

    inventoryItem2 = {
      id: 2,
      escola_id: school2.id,
      produto_id: product2.id,
      quantidade_atual: 200,
      tenant_id: tenant2.id
    };

    setupSecurityMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
    jest.clearAllMocks();
  });

  describe('Cross-Tenant Access Prevention', () => {
    it('should prevent accessing other tenant inventory via direct ID manipulation', async () => {
      // Try to access tenant2's inventory with tenant1 context
      const response = await request(app)
        .get(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should prevent modifying other tenant inventory via parameter manipulation', async () => {
      const updateData = { quantidade_atual: 999 };

      const response = await request(app)
        .put(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should prevent deleting other tenant inventory', async () => {
      const response = await request(app)
        .delete(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should prevent cross-tenant batch operations', async () => {
      const batchData = {
        items: [
          { id: inventoryItem1.id, quantidade_atual: 50 }, // Valid
          { id: inventoryItem2.id, quantidade_atual: 75 }  // Invalid - different tenant
        ]
      };

      const response = await request(app)
        .put('/api/estoque-escola/batch')
        .set('X-Tenant-ID', tenant1.id)
        .send(batchData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection through tenant ID header', async () => {
      const maliciousTenantId = "'; DROP TABLE estoque_escolas; --";

      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('X-Tenant-ID', maliciousTenantId)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_CONTEXT_INVALID');
    });

    it('should prevent SQL injection through school ID parameter', async () => {
      const maliciousSchoolId = "1; DROP TABLE estoque_escolas; --";

      const response = await request(app)
        .get(`/api/estoque-escola/escola/${maliciousSchoolId}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent SQL injection through product ID parameter', async () => {
      const maliciousProductId = "1 UNION SELECT * FROM usuarios; --";

      const response = await request(app)
        .get(`/api/estoque-lotes/produto/${maliciousProductId}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent SQL injection through search parameters', async () => {
      const maliciousSearch = "'; DELETE FROM estoque_escolas WHERE '1'='1";

      const response = await request(app)
        .get('/api/estoque-escola/search')
        .query({ q: maliciousSearch })
        .set('X-Tenant-ID', tenant1.id)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should sanitize input in inventory creation', async () => {
      const maliciousData = {
        escola_id: school1.id,
        produto_id: "1; INSERT INTO usuarios (nome) VALUES ('hacker'); --",
        quantidade_atual: 100
      };

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Authentication and Authorization Security', () => {
    it('should reject requests without tenant context', async () => {
      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_CONTEXT_MISSING');
    });

    it('should reject requests with invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject requests with expired JWT tokens', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign({
        id: user1.id,
        tenant_id: tenant1.id,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      }, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject requests with mismatched tenant context in token', async () => {
      const jwt = require('jsonwebtoken');
      const mismatchedToken = jwt.sign({
        id: user1.id,
        tenant_id: tenant2.id // Wrong tenant
      }, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('Authorization', `Bearer ${mismatchedToken}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_MISMATCH');
    });

    it('should validate user permissions for inventory operations', async () => {
      // Create user with limited permissions
      const limitedUser = await testDb.createTestUser({
        nome: 'Limited User',
        email: 'limited@tenant1.com',
        tenant_id: tenant1.id
      });

      await testDb.createTenantUser(tenant1.id, limitedUser.id, 'read_only');

      const jwt = require('jsonwebtoken');
      const limitedToken = jwt.sign({
        id: limitedUser.id,
        tenant_id: tenant1.id,
        role: 'read_only'
      }, process.env.JWT_SECRET || 'test-secret');

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          escola_id: school1.id,
          produto_id: product1.id,
          quantidade_atual: 100
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not expose sensitive tenant information in error messages', async () => {
      const response = await request(app)
        .get(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.message).not.toContain(tenant2.id);
      expect(response.body.message).not.toContain(tenant2.name);
      expect(response.body.message).not.toContain('Security Tenant 2');
    });

    it('should not expose database schema information in errors', async () => {
      const response = await request(app)
        .get('/api/estoque-escola/invalid-endpoint')
        .set('X-Tenant-ID', tenant1.id)
        .expect(404);

      expect(response.body.message).not.toContain('table');
      expect(response.body.message).not.toContain('column');
      expect(response.body.message).not.toContain('estoque_escolas');
    });

    it('should not expose internal system paths in error responses', async () => {
      const response = await request(app)
        .get('/api/estoque-escola/error-test')
        .set('X-Tenant-ID', tenant1.id)
        .expect(500);

      expect(response.body.message).not.toContain('/src/');
      expect(response.body.message).not.toContain('/backend/');
      expect(response.body.message).not.toContain('node_modules');
    });

    it('should filter out sensitive fields in API responses', async () => {
      const response = await request(app)
        .get(`/api/estoque-escola/escola/${school1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(response.body.data[0]).not.toHaveProperty('tenant_secret');
      expect(response.body.data[0]).not.toHaveProperty('internal_id');
      expect(response.body.data[0]).not.toHaveProperty('created_by_user_id');
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate inventory quantity inputs', async () => {
      const invalidData = {
        escola_id: school1.id,
        produto_id: product1.id,
        quantidade_atual: -100 // Negative quantity
      };

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should validate date inputs for lotes', async () => {
      const invalidLoteData = {
        escola_id: school1.id,
        produto_id: product1.id,
        lote: 'LOTE001',
        quantidade_atual: 100,
        data_validade: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/estoque-lotes')
        .set('X-Tenant-ID', tenant1.id)
        .send(invalidLoteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize string inputs', async () => {
      const dataWithScripts = {
        escola_id: school1.id,
        produto_id: product1.id,
        quantidade_atual: 100,
        observacoes: '<script>alert("xss")</script>Test observation'
      };

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send(dataWithScripts)
        .expect(201);

      expect(response.body.data.observacoes).not.toContain('<script>');
      expect(response.body.data.observacoes).toContain('Test observation');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        escola_id: school1.id
        // Missing produto_id and quantidade_atual
      };

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details.validationErrors).toContain('produto_id is required');
    });
  });

  describe('Rate Limiting and DoS Prevention', () => {
    it('should implement rate limiting for inventory API endpoints', async () => {
      const requests = Array.from({ length: 101 }, () =>
        request(app)
          .get('/api/estoque-escola/resumo')
          .set('X-Tenant-ID', tenant1.id)
      );

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should prevent excessive batch operations', async () => {
      const largeBatchData = {
        items: Array.from({ length: 1001 }, (_, i) => ({
          escola_id: school1.id,
          produto_id: product1.id,
          quantidade_atual: i + 1
        }))
      };

      const response = await request(app)
        .post('/api/estoque-escola/batch')
        .set('X-Tenant-ID', tenant1.id)
        .send(largeBatchData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('BATCH_SIZE_EXCEEDED');
    });

    it('should limit query result sizes', async () => {
      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .query({ limit: 10000 }) // Excessive limit
        .set('X-Tenant-ID', tenant1.id)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('LIMIT_EXCEEDED');
    });
  });

  describe('Audit and Monitoring Security', () => {
    it('should log security violations', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(app)
        .get(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security violation: Cross-tenant access attempt')
      );

      consoleSpy.mockRestore();
    });

    it('should log failed authentication attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(app)
        .get('/api/estoque-escola/resumo')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failure')
      );

      consoleSpy.mockRestore();
    });

    it('should not log sensitive information in audit trails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send({
          escola_id: school1.id,
          produto_id: product1.id,
          quantidade_atual: 100,
          senha_admin: 'secret123' // Sensitive field
        })
        .expect(400);

      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('secret123');

      consoleSpy.mockRestore();
    });
  });

  function setupSecurityMocks() {
    // Mock database queries for security tests
    db.query.mockImplementation((query: string, params: any[] = []) => {
      // Mock tenant validation
      if (query.includes('FROM tenants WHERE')) {
        if (params[0] === tenant1.id) {
          return Promise.resolve({ rows: [tenant1] });
        }
        if (params[0] === tenant2.id) {
          return Promise.resolve({ rows: [tenant2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock inventory queries with security checks
      if (query.includes('FROM estoque_escolas')) {
        if (params.includes(tenant1.id)) {
          return Promise.resolve({ rows: [inventoryItem1] });
        }
        if (params.includes(tenant2.id)) {
          return Promise.resolve({ rows: [inventoryItem2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock validation queries
      if (query.includes('SELECT id FROM escolas')) {
        if (params[0] === school1.id && params[1] === tenant1.id) {
          return Promise.resolve({ rows: [{ id: school1.id }] });
        }
        if (params[0] === school2.id && params[1] === tenant2.id) {
          return Promise.resolve({ rows: [{ id: school2.id }] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Default empty result
      return Promise.resolve({ rows: [] });
    });
  }
});