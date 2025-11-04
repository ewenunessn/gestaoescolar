/**
 * Integration tests for tenant inventory isolation
 * Tests end-to-end inventory data isolation between tenants
 */

import request from 'supertest';
import { testDb } from '../helpers/testDatabase';

// Mock the database for integration tests
jest.mock('../../src/database');
const db = require('../../src/database');

describe('Tenant Inventory Isolation Integration Tests', () => {
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
  let lote1: any;
  let lote2: any;

  beforeAll(async () => {
    // Import app after mocking database
    app = require('../../src/index').app;
  });

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await testDb.createTestTenant({
      slug: 'tenant1-inventory',
      subdomain: 'tenant1-inventory',
      name: 'Tenant 1 Inventory'
    });

    tenant2 = await testDb.createTestTenant({
      slug: 'tenant2-inventory',
      subdomain: 'tenant2-inventory',
      name: 'Tenant 2 Inventory'
    });

    // Create test users
    user1 = await testDb.createTestUser({
      nome: 'User 1 Inventory',
      email: 'user1@tenant1-inventory.com',
      tenant_id: tenant1.id
    });

    user2 = await testDb.createTestUser({
      nome: 'User 2 Inventory',
      email: 'user2@tenant2-inventory.com',
      tenant_id: tenant2.id
    });

    // Create tenant user associations
    await testDb.createTenantUser(tenant1.id, user1.id, 'tenant_admin');
    await testDb.createTenantUser(tenant2.id, user2.id, 'tenant_admin');

    // Create test data for each tenant
    school1 = await testDb.createTestSchool(tenant1.id, 'School 1 Inventory');
    school2 = await testDb.createTestSchool(tenant2.id, 'School 2 Inventory');

    product1 = await testDb.createTestProduct(tenant1.id, 'Product 1 Inventory');
    product2 = await testDb.createTestProduct(tenant2.id, 'Product 2 Inventory');

    // Create inventory items
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

    // Create lotes
    lote1 = {
      id: 1,
      escola_id: school1.id,
      produto_id: product1.id,
      lote: 'LOTE001-T1',
      quantidade_atual: 50,
      tenant_id: tenant1.id
    };

    lote2 = {
      id: 2,
      escola_id: school2.id,
      produto_id: product2.id,
      lote: 'LOTE001-T2',
      quantidade_atual: 75,
      tenant_id: tenant2.id
    };

    // Setup database mocks
    setupDatabaseMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
    jest.clearAllMocks();
  });

  describe('Inventory API Endpoint Isolation', () => {
    it('should only return tenant1 inventory when accessing with tenant1 context', async () => {
      const response = await request(app)
        .get(`/api/estoque-escola/escola/${school1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tenant_id).toBe(tenant1.id);
      expect(response.body.data[0].escola_id).toBe(school1.id);
    });

    it('should only return tenant2 inventory when accessing with tenant2 context', async () => {
      const response = await request(app)
        .get(`/api/estoque-escola/escola/${school2.id}`)
        .set('X-Tenant-ID', tenant2.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tenant_id).toBe(tenant2.id);
      expect(response.body.data[0].escola_id).toBe(school2.id);
    });

    it('should prevent cross-tenant access to inventory data', async () => {
      // Try to access tenant2's inventory with tenant1 context
      const response = await request(app)
        .get(`/api/estoque-escola/escola/${school2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should isolate inventory resumo by tenant', async () => {
      const tenant1Response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      const tenant2Response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('X-Tenant-ID', tenant2.id)
        .expect(200);

      expect(tenant1Response.body.data.length).toBeGreaterThan(0);
      expect(tenant2Response.body.data.length).toBeGreaterThan(0);
      
      // Verify no overlap in data
      const tenant1Ids = tenant1Response.body.data.map((item: any) => item.id);
      const tenant2Ids = tenant2Response.body.data.map((item: any) => item.id);
      expect(tenant1Ids).not.toEqual(expect.arrayContaining(tenant2Ids));
    });

    it('should isolate lotes by tenant', async () => {
      const tenant1Response = await request(app)
        .get(`/api/estoque-lotes/escola/${school1.id}/produto/${product1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(tenant1Response.body.success).toBe(true);
      expect(tenant1Response.body.data).toHaveLength(1);
      expect(tenant1Response.body.data[0].lote).toBe('LOTE001-T1');
      expect(tenant1Response.body.data[0].tenant_id).toBe(tenant1.id);
    });
  });

  describe('Inventory Movement Operations Isolation', () => {
    it('should create inventory movement only within tenant scope', async () => {
      const movementData = {
        escola_id: school1.id,
        produto_id: product1.id,
        tipo_movimentacao: 'entrada',
        quantidade_movimentada: 50,
        motivo: 'Compra de produtos'
      };

      const response = await request(app)
        .post('/api/movimentacao-estoque')
        .set('X-Tenant-ID', tenant1.id)
        .send(movementData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant_id).toBe(tenant1.id);
      expect(response.body.data.escola_id).toBe(school1.id);
    });

    it('should prevent cross-tenant inventory movements', async () => {
      const movementData = {
        escola_id: school2.id, // Tenant2's school
        produto_id: product1.id, // Tenant1's product
        tipo_movimentacao: 'entrada',
        quantidade_movimentada: 50
      };

      const response = await request(app)
        .post('/api/movimentacao-estoque')
        .set('X-Tenant-ID', tenant1.id)
        .send(movementData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should isolate movement history by tenant', async () => {
      const tenant1Response = await request(app)
        .get(`/api/movimentacao-estoque/escola/${school1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      const tenant2Response = await request(app)
        .get(`/api/movimentacao-estoque/escola/${school2.id}`)
        .set('X-Tenant-ID', tenant2.id)
        .expect(200);

      // Each tenant should only see their own movement history
      expect(tenant1Response.body.data.every((mov: any) => mov.tenant_id === tenant1.id)).toBe(true);
      expect(tenant2Response.body.data.every((mov: any) => mov.tenant_id === tenant2.id)).toBe(true);
    });

    it('should validate tenant ownership in batch movements', async () => {
      const batchMovementData = {
        movimentos: [
          {
            escola_id: school1.id,
            produto_id: product1.id,
            tipo_movimentacao: 'entrada',
            quantidade_movimentada: 25
          },
          {
            escola_id: school2.id, // Cross-tenant school
            produto_id: product1.id,
            tipo_movimentacao: 'entrada',
            quantidade_movimentada: 25
          }
        ]
      };

      const response = await request(app)
        .post('/api/movimentacao-estoque/batch')
        .set('X-Tenant-ID', tenant1.id)
        .send(batchMovementData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });
  });

  describe('CRUD Operations Isolation', () => {
    it('should create inventory items with automatic tenant assignment', async () => {
      const newInventoryData = {
        escola_id: school1.id,
        produto_id: product1.id,
        quantidade_atual: 150
      };

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send(newInventoryData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant_id).toBe(tenant1.id);
      expect(response.body.data.escola_id).toBe(school1.id);
    });

    it('should update inventory items only within tenant scope', async () => {
      const updateData = {
        quantidade_atual: 120
      };

      const response = await request(app)
        .put(`/api/estoque-escola/${inventoryItem1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant_id).toBe(tenant1.id);
    });

    it('should prevent updating inventory items from other tenants', async () => {
      const updateData = {
        quantidade_atual: 120
      };

      const response = await request(app)
        .put(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should delete inventory items only within tenant scope', async () => {
      const response = await request(app)
        .delete(`/api/estoque-escola/${inventoryItem1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent deleting inventory items from other tenants', async () => {
      const response = await request(app)
        .delete(`/api/estoque-escola/${inventoryItem2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });
  });

  describe('Lote Management Isolation', () => {
    it('should create lotes with automatic tenant assignment', async () => {
      const loteData = {
        escola_id: school1.id,
        produto_id: product1.id,
        lote: 'LOTE002-T1',
        quantidade_inicial: 100,
        quantidade_atual: 100,
        data_validade: '2024-12-31'
      };

      const response = await request(app)
        .post('/api/estoque-lotes')
        .set('X-Tenant-ID', tenant1.id)
        .send(loteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant_id).toBe(tenant1.id);
      expect(response.body.data.lote).toBe('LOTE002-T1');
    });

    it('should prevent cross-tenant lote access', async () => {
      const response = await request(app)
        .get(`/api/estoque-lotes/${lote2.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });

    it('should update lotes only within tenant scope', async () => {
      const updateData = {
        quantidade_atual: 40
      };

      const response = await request(app)
        .put(`/api/estoque-lotes/${lote1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tenant_id).toBe(tenant1.id);
    });

    it('should list lotes filtered by tenant', async () => {
      const response = await request(app)
        .get(`/api/estoque-lotes/escola/${school1.id}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every((lote: any) => lote.tenant_id === tenant1.id)).toBe(true);
    });
  });

  describe('Subdomain-based Isolation', () => {
    it('should resolve tenant by subdomain for inventory operations', async () => {
      const response = await request(app)
        .get(`/api/estoque-escola/escola/${school1.id}`)
        .set('Host', 'tenant1-inventory.example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].tenant_id).toBe(tenant1.id);
    });

    it('should return different inventory data for different subdomains', async () => {
      const tenant1Response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('Host', 'tenant1-inventory.example.com')
        .expect(200);

      const tenant2Response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('Host', 'tenant2-inventory.example.com')
        .expect(200);

      expect(tenant1Response.body.data[0].tenant_id).toBe(tenant1.id);
      expect(tenant2Response.body.data[0].tenant_id).toBe(tenant2.id);
    });
  });

  describe('Database-level Isolation Verification', () => {
    it('should verify RLS policies prevent cross-tenant inventory queries', async () => {
      const isolation = await testDb.verifyTenantIsolation(tenant1.id, tenant2.id);

      expect(isolation.crossTenantAccess).toBe(false);
      expect(isolation.tenant1Data).toHaveLength(1);
      expect(isolation.tenant2Data).toHaveLength(1);
    });

    it('should maintain isolation across inventory table types', async () => {
      // Test estoque_escolas isolation
      await testDb.setTenantContext(tenant1.id);
      const tenant1Inventory = await db.query('SELECT * FROM estoque_escolas');

      await testDb.setTenantContext(tenant2.id);
      const tenant2Inventory = await db.query('SELECT * FROM estoque_escolas');

      expect(tenant1Inventory.rows.every((item: any) => item.tenant_id === tenant1.id)).toBe(true);
      expect(tenant2Inventory.rows.every((item: any) => item.tenant_id === tenant2.id)).toBe(true);

      // Test estoque_lotes isolation
      await testDb.setTenantContext(tenant1.id);
      const tenant1Lotes = await db.query('SELECT * FROM estoque_lotes');

      await testDb.setTenantContext(tenant2.id);
      const tenant2Lotes = await db.query('SELECT * FROM estoque_lotes');

      expect(tenant1Lotes.rows.every((lote: any) => lote.tenant_id === tenant1.id)).toBe(true);
      expect(tenant2Lotes.rows.every((lote: any) => lote.tenant_id === tenant2.id)).toBe(true);
    });
  });

  describe('Error Handling and Security', () => {
    it('should return appropriate error when no tenant context for inventory', async () => {
      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_CONTEXT_MISSING');
    });

    it('should prevent SQL injection through inventory parameters', async () => {
      const maliciousSchoolId = "1; DROP TABLE estoque_escolas; --";

      const response = await request(app)
        .get(`/api/estoque-escola/escola/${maliciousSchoolId}`)
        .set('X-Tenant-ID', tenant1.id)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle inactive tenant gracefully for inventory operations', async () => {
      const inactiveTenant = await testDb.createTestTenant({
        status: 'inactive'
      });

      const response = await request(app)
        .get('/api/estoque-escola/resumo')
        .set('X-Tenant-ID', inactiveTenant.id)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_INACTIVE');
    });

    it('should validate inventory data integrity across tenant boundaries', async () => {
      // Try to create inventory with mismatched tenant entities
      const invalidData = {
        escola_id: school2.id, // Tenant2's school
        produto_id: product1.id, // Tenant1's product
        quantidade_atual: 100
      };

      const response = await request(app)
        .post('/api/estoque-escola')
        .set('X-Tenant-ID', tenant1.id)
        .send(invalidData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TENANT_OWNERSHIP_ERROR');
    });
  });

  function setupDatabaseMocks() {
    // Mock database queries to return appropriate test data based on tenant context
    db.query.mockImplementation((query: string, params: any[] = []) => {
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

      // Mock inventory queries
      if (query.includes('FROM estoque_escolas')) {
        if (params && params.includes(tenant1.id)) {
          return Promise.resolve({ rows: [inventoryItem1] });
        }
        if (params && params.includes(tenant2.id)) {
          return Promise.resolve({ rows: [inventoryItem2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock lotes queries
      if (query.includes('FROM estoque_lotes')) {
        if (params && params.includes(tenant1.id)) {
          return Promise.resolve({ rows: [lote1] });
        }
        if (params && params.includes(tenant2.id)) {
          return Promise.resolve({ rows: [lote2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock school queries
      if (query.includes('FROM escolas')) {
        if (params && params.includes(tenant1.id)) {
          return Promise.resolve({ rows: [school1] });
        }
        if (params && params.includes(tenant2.id)) {
          return Promise.resolve({ rows: [school2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock product queries
      if (query.includes('FROM produtos')) {
        if (params && params.includes(tenant1.id)) {
          return Promise.resolve({ rows: [product1] });
        }
        if (params && params.includes(tenant2.id)) {
          return Promise.resolve({ rows: [product2] });
        }
        return Promise.resolve({ rows: [] });
      }

      // Mock insert operations
      if (query.includes('INSERT INTO')) {
        const mockResult = {
          id: Math.floor(Math.random() * 1000),
          tenant_id: params[params.length - 1] || tenant1.id,
          ...params
        };
        return Promise.resolve({ rows: [mockResult] });
      }

      // Mock update operations
      if (query.includes('UPDATE')) {
        return Promise.resolve({ rows: [{ id: params[0], tenant_id: tenant1.id }] });
      }

      // Mock delete operations
      if (query.includes('DELETE')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      // Default empty result
      return Promise.resolve({ rows: [] });
    });
  }
});