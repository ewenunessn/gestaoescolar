/**
 * Integration tests for tenant isolation
 * Tests end-to-end tenant data isolation and security
 */

import request from 'supertest';
import { testDb } from '../helpers/testDatabase';

// Mock the database for integration tests
jest.mock('../../src/database');
const db = require('../../src/database');

describe('Tenant Isolation Integration Tests', () => {
  let app: any;
  let tenant1: any;
  let tenant2: any;
  let user1: any;
  let user2: any;
  let school1: any;
  let school2: any;
  let product1: any;
  let product2: any;

  beforeAll(async () => {
    // Import app after mocking database
    app = require('../../src/index').app;
  });

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await testDb.createTestTenant({
      slug: 'tenant1',
      subdomain: 'tenant1',
      name: 'Tenant 1'
    });

    tenant2 = await testDb.createTestTenant({
      slug: 'tenant2',
      subdomain: 'tenant2',
      name: 'Tenant 2'
    });

    // Create test users
    user1 = await testDb.createTestUser({
      nome: 'User 1',
      email: 'user1@tenant1.com',
      tenant_id: tenant1.id
    });

    user2 = await testDb.createTestUser({
      nome: 'User 2',
      email: 'user2@tenant2.com',
      tenant_id: tenant2.id
    });

    // Create tenant user associations
    await testDb.createTenantUser(tenant1.id, user1.id, 'tenant_admin');
    await testDb.createTenantUser(tenant2.id, user2.id, 'tenant_admin');

    // Create test data for each tenant
    school1 = await testDb.createTestSchool(tenant1.id, 'School 1');
    school2 = await testDb.createTestSchool(tenant2.id, 'School 2');

    product1 = await testDb.createTestProduct(tenant1.id, 'Product 1');
    product2 = await testDb.createTestProduct(tenant2.id, 'Product 2');

    // Mock database queries for API calls
    setupDatabaseMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
    jest.clearAllMocks();
  });

  describe('API Endpoint Isolation', () => {
    it('should only return tenant1 schools when accessing with tenant1 context', async () => {
      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(school1.id);
      expect(response.body.data[0].nome).toBe('School 1');
    });

    it('should only return tenant2 schools when accessing with tenant2 context', async () => {
      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', tenant2.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(school2.id);
      expect(response.body.data[0].nome).toBe('School 2');
    });

    it('should only return tenant1 products when accessing with tenant1 context', async () => {
      const response = await request(app)
        .get('/api/produtos')
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(product1.id);
      expect(response.body.data[0].nome).toBe('Product 1');
    });

    it('should prevent cross-tenant access to specific resources', async () => {
      // Try to access tenant2's school with tenant1 context
      const response = await request(app)
        .get(`/api/escolas/${school2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should prevent creating resources in wrong tenant context', async () => {
      const newSchool = {
        nome: 'New School',
        endereco: 'Test Address',
        telefone: '123456789'
      };

      // Create school with tenant1 context
      const response = await request(app)
        .post('/api/escolas')
        .set('X-Tenant-ID', tenant1.id)
        .send(newSchool)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant_id).toBe(tenant1.id);

      // Verify it's not visible in tenant2 context
      const tenant2Response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', tenant2.id)
        .expect(200);

      const schoolIds = tenant2Response.body.data.map((s: any) => s.id);
      expect(schoolIds).not.toContain(response.body.data.id);
    });
  });

  describe('Subdomain-based Isolation', () => {
    it('should resolve tenant by subdomain and return isolated data', async () => {
      const response = await request(app)
        .get('/api/escolas')
        .set('Host', 'tenant1.example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].nome).toBe('School 1');
    });

    it('should return different data for different subdomains', async () => {
      const tenant1Response = await request(app)
        .get('/api/produtos')
        .set('Host', 'tenant1.example.com')
        .expect(200);

      const tenant2Response = await request(app)
        .get('/api/produtos')
        .set('Host', 'tenant2.example.com')
        .expect(200);

      expect(tenant1Response.body.data[0].nome).toBe('Product 1');
      expect(tenant2Response.body.data[0].nome).toBe('Product 2');
      expect(tenant1Response.body.data[0].id).not.toBe(tenant2Response.body.data[0].id);
    });
  });

  describe('Database-level Isolation', () => {
    it('should verify RLS policies prevent cross-tenant queries', async () => {
      const isolation = await testDb.verifyTenantIsolation(tenant1.id, tenant2.id);

      expect(isolation.crossTenantAccess).toBe(false);
      expect(isolation.tenant1Data).toHaveLength(1);
      expect(isolation.tenant2Data).toHaveLength(1);
      expect(isolation.tenant1Data[0].id).not.toBe(isolation.tenant2Data[0].id);
    });

    it('should maintain isolation across different table types', async () => {
      // Test schools isolation
      await testDb.setTenantContext(tenant1.id);
      const tenant1Schools = await db.query('SELECT * FROM escolas');

      await testDb.setTenantContext(tenant2.id);
      const tenant2Schools = await db.query('SELECT * FROM escolas');

      expect(tenant1Schools.rows).toHaveLength(1);
      expect(tenant2Schools.rows).toHaveLength(1);
      expect(tenant1Schools.rows[0].id).not.toBe(tenant2Schools.rows[0].id);

      // Test products isolation
      await testDb.setTenantContext(tenant1.id);
      const tenant1Products = await db.query('SELECT * FROM produtos');

      await testDb.setTenantContext(tenant2.id);
      const tenant2Products = await db.query('SELECT * FROM produtos');

      expect(tenant1Products.rows).toHaveLength(1);
      expect(tenant2Products.rows).toHaveLength(1);
      expect(tenant1Products.rows[0].id).not.toBe(tenant2Products.rows[0].id);
    });
  });

  describe('Authentication and Authorization Isolation', () => {
    it('should prevent users from accessing other tenants data', async () => {
      // Mock JWT token for user1 (tenant1)
      const jwt = require('jsonwebtoken');
      const token1 = jwt.sign({
        id: user1.id,
        tenant_id: tenant1.id,
        tenantRole: 'tenant_admin'
      }, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/escolas')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].nome).toBe('School 1');
    });

    it('should reject requests with invalid tenant context in token', async () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign({
        id: user1.id,
        tenant_id: 'invalid-tenant-id'
      }, process.env.JWT_SECRET);

      await request(app)
        .get('/api/escolas')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(400);
    });
  });

  describe('Error Handling and Security', () => {
    it('should return appropriate error when no tenant context', async () => {
      const response = await request(app)
        .get('/api/escolas')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('TENANT_NOT_FOUND');
    });

    it('should prevent SQL injection through tenant context', async () => {
      const maliciousHeader = "'; DROP TABLE escolas; --";

      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', maliciousHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle inactive tenant gracefully', async () => {
      // Create inactive tenant
      const inactiveTenant = await testDb.createTestTenant({
        status: 'inactive'
      });

      const response = await request(app)
        .get('/api/escolas')
        .set('X-Tenant-ID', inactiveTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('TENANT_INACTIVE');
    });
  });

  function setupDatabaseMocks() {
    // Mock database queries to return appropriate test data based on tenant context
    db.query.mockImplementation((query: string, params: any[]) => {
      // Mock tenant resolution queries
      if (query.includes('FROM tenants WHERE')) {
        if (params[0] === tenant1.id || params[0] === tenant1.slug || params[0] === tenant1.subdomain) {
          return Promise.resolve({ rows: [tenant1] });
        }
        if (params[0] === tenant2.id || params[0] === tenant2.slug || params[0] === tenant2.subdomain) {
          return Promise.resolve({ rows: [tenant2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock RLS context functions
      if (query.includes('set_tenant_context')) {
        return Promise.resolve({ rows: [] });
      }

      // Mock school queries
      if (query.includes('FROM escolas')) {
        if (params && params[0] === tenant1.id) {
          return Promise.resolve({ rows: [school1] });
        }
        if (params && params[0] === tenant2.id) {
          return Promise.resolve({ rows: [school2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock product queries
      if (query.includes('FROM produtos')) {
        if (params && params[0] === tenant1.id) {
          return Promise.resolve({ rows: [product1] });
        }
        if (params && params[0] === tenant2.id) {
          return Promise.resolve({ rows: [product2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Default empty result
      return Promise.resolve({ rows: [] });
    });
  }
});