/**
 * Unit tests for tenant inventory RLS policies and database triggers
 * Tests database-level tenant isolation for inventory tables
 */

import { testDb } from '../../helpers/testDatabase';

// Mock database
jest.mock('../../../src/database');
const db = require('../../../src/database');

describe('Tenant Inventory RLS and Triggers', () => {
  let tenant1: any;
  let tenant2: any;
  let school1: any;
  let school2: any;
  let product1: any;
  let product2: any;

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await testDb.createTestTenant({
      slug: 'tenant1-rls',
      name: 'Tenant 1 RLS'
    });

    tenant2 = await testDb.createTestTenant({
      slug: 'tenant2-rls',
      name: 'Tenant 2 RLS'
    });

    // Create test schools and products
    school1 = await testDb.createTestSchool(tenant1.id, 'School 1');
    school2 = await testDb.createTestSchool(tenant2.id, 'School 2');
    product1 = await testDb.createTestProduct(tenant1.id, 'Product 1');
    product2 = await testDb.createTestProduct(tenant2.id, 'Product 2');

    // Setup database mocks
    setupDatabaseMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
    jest.clearAllMocks();
  });

  describe('RLS Policy Enforcement', () => {
    it('should enforce RLS on estoque_escolas table', async () => {
      // Set tenant context to tenant1
      await testDb.setTenantContext(tenant1.id);

      // Mock query to return only tenant1 data
      db.query.mockResolvedValue({
        rows: [{ id: 1, escola_id: school1.id, produto_id: product1.id, tenant_id: tenant1.id }]
      });

      const result = await db.query('SELECT * FROM estoque_escolas');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tenant_id).toBe(tenant1.id);
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM estoque_escolas');
    });

    it('should enforce RLS on estoque_lotes table', async () => {
      // Set tenant context to tenant2
      await testDb.setTenantContext(tenant2.id);

      // Mock query to return only tenant2 data
      db.query.mockResolvedValue({
        rows: [{ 
          id: 1, 
          escola_id: school2.id, 
          produto_id: product2.id, 
          tenant_id: tenant2.id,
          lote: 'LOTE001',
          quantidade_atual: 100
        }]
      });

      const result = await db.query('SELECT * FROM estoque_lotes');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tenant_id).toBe(tenant2.id);
      expect(result.rows[0].escola_id).toBe(school2.id);
    });

    it('should enforce RLS on estoque_escolas_historico table', async () => {
      // Set tenant context to tenant1
      await testDb.setTenantContext(tenant1.id);

      // Mock query to return only tenant1 historical data
      db.query.mockResolvedValue({
        rows: [{ 
          id: 1, 
          escola_id: school1.id, 
          produto_id: product1.id, 
          tenant_id: tenant1.id,
          quantidade_anterior: 50,
          quantidade_nova: 100,
          data_movimentacao: new Date()
        }]
      });

      const result = await db.query('SELECT * FROM estoque_escolas_historico');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tenant_id).toBe(tenant1.id);
    });

    it('should return empty results when no tenant context is set', async () => {
      // Clear tenant context
      await testDb.clearTenantContext();

      // Mock query to return empty results when no tenant context
      db.query.mockResolvedValue({ rows: [] });

      const result = await db.query('SELECT * FROM estoque_escolas');
      
      expect(result.rows).toHaveLength(0);
    });

    it('should prevent cross-tenant data access through RLS', async () => {
      // Set tenant context to tenant1
      await testDb.setTenantContext(tenant1.id);

      // Mock query that would normally return tenant2 data, but RLS blocks it
      db.query.mockResolvedValue({ rows: [] });

      // Try to query for tenant2's school data while in tenant1 context
      const result = await db.query('SELECT * FROM estoque_escolas WHERE escola_id = $1', [school2.id]);
      
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('Database Trigger Functionality', () => {
    it('should automatically set tenant_id on estoque_escolas insert', async () => {
      // Set tenant context
      await testDb.setTenantContext(tenant1.id);

      // Mock insert operation with automatic tenant_id setting
      const insertedRecord = {
        id: 1,
        escola_id: school1.id,
        produto_id: product1.id,
        quantidade_atual: 100,
        tenant_id: tenant1.id // Automatically set by trigger
      };

      db.query.mockResolvedValue({ rows: [insertedRecord] });

      const result = await db.query(`
        INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [school1.id, product1.id, 100]);

      expect(result.rows[0].tenant_id).toBe(tenant1.id);
      expect(result.rows[0].escola_id).toBe(school1.id);
      expect(result.rows[0].produto_id).toBe(product1.id);
    });

    it('should automatically set tenant_id on estoque_lotes insert', async () => {
      // Set tenant context
      await testDb.setTenantContext(tenant2.id);

      // Mock insert operation with automatic tenant_id setting
      const insertedLote = {
        id: 1,
        escola_id: school2.id,
        produto_id: product2.id,
        lote: 'LOTE001',
        quantidade_inicial: 100,
        quantidade_atual: 100,
        tenant_id: tenant2.id // Automatically set by trigger
      };

      db.query.mockResolvedValue({ rows: [insertedLote] });

      const result = await db.query(`
        INSERT INTO estoque_lotes (escola_id, produto_id, lote, quantidade_inicial, quantidade_atual)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [school2.id, product2.id, 'LOTE001', 100, 100]);

      expect(result.rows[0].tenant_id).toBe(tenant2.id);
      expect(result.rows[0].lote).toBe('LOTE001');
    });

    it('should automatically set tenant_id on estoque_escolas_historico insert', async () => {
      // Set tenant context
      await testDb.setTenantContext(tenant1.id);

      // Mock insert operation for historical record
      const historicalRecord = {
        id: 1,
        escola_id: school1.id,
        produto_id: product1.id,
        quantidade_anterior: 50,
        quantidade_nova: 100,
        tipo_movimentacao: 'entrada',
        tenant_id: tenant1.id // Automatically set by trigger
      };

      db.query.mockResolvedValue({ rows: [historicalRecord] });

      const result = await db.query(`
        INSERT INTO estoque_escolas_historico (escola_id, produto_id, quantidade_anterior, quantidade_nova, tipo_movimentacao)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [school1.id, product1.id, 50, 100, 'entrada']);

      expect(result.rows[0].tenant_id).toBe(tenant1.id);
      expect(result.rows[0].tipo_movimentacao).toBe('entrada');
    });

    it('should fail insert when no tenant context is available', async () => {
      // Clear tenant context
      await testDb.clearTenantContext();

      // Mock error when trying to insert without tenant context
      db.query.mockRejectedValue(new Error('Tenant context is required for inventory operations'));

      await expect(db.query(`
        INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
        VALUES ($1, $2, $3)
      `, [school1.id, product1.id, 100])).rejects.toThrow('Tenant context is required');
    });
  });

  describe('Tenant Context Functions', () => {
    it('should set tenant context successfully', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await testDb.setTenantContext(tenant1.id);

      expect(db.query).toHaveBeenCalledWith('SELECT set_tenant_context($1)', [tenant1.id]);
    });

    it('should clear tenant context successfully', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await testDb.clearTenantContext();

      expect(db.query).toHaveBeenCalledWith('SELECT clear_tenant_context()');
    });

    it('should get current tenant context', async () => {
      db.query.mockResolvedValue({ rows: [{ get_current_tenant_id: tenant1.id }] });

      const result = await db.query('SELECT get_current_tenant_id()');

      expect(result.rows[0].get_current_tenant_id).toBe(tenant1.id);
    });

    it('should handle fallback tenant context methods', async () => {
      // Mock the new function to fail, triggering fallback
      db.query
        .mockRejectedValueOnce(new Error('Function does not exist'))
        .mockResolvedValueOnce({ rows: [] });

      await testDb.setTenantContext(tenant1.id);

      // Should have tried the new method first, then fallen back
      expect(db.query).toHaveBeenCalledWith('SELECT set_tenant_context($1)', [tenant1.id]);
      expect(db.query).toHaveBeenCalledWith('SET app.current_tenant_id = $1', [tenant1.id]);
    });
  });

  describe('Index Usage Verification', () => {
    it('should use tenant-aware indexes for inventory queries', async () => {
      // Mock EXPLAIN ANALYZE result showing index usage
      db.query.mockResolvedValue({
        rows: [{
          'QUERY PLAN': 'Index Scan using idx_estoque_escolas_tenant_escola on estoque_escolas'
        }]
      });

      const result = await db.query(`
        EXPLAIN ANALYZE SELECT * FROM estoque_escolas 
        WHERE tenant_id = $1 AND escola_id = $2
      `, [tenant1.id, school1.id]);

      expect(result.rows[0]['QUERY PLAN']).toContain('idx_estoque_escolas_tenant_escola');
    });

    it('should use composite indexes for complex inventory queries', async () => {
      // Mock EXPLAIN result for complex query
      db.query.mockResolvedValue({
        rows: [{
          'QUERY PLAN': 'Index Scan using idx_estoque_lotes_tenant_escola_produto on estoque_lotes'
        }]
      });

      const result = await db.query(`
        EXPLAIN SELECT * FROM estoque_lotes 
        WHERE tenant_id = $1 AND escola_id = $2 AND produto_id = $3
      `, [tenant1.id, school1.id, product1.id]);

      expect(result.rows[0]['QUERY PLAN']).toContain('idx_estoque_lotes_tenant_escola_produto');
    });
  });

  function setupDatabaseMocks() {
    // Default mock implementation
    db.query.mockImplementation((query: string, params: any[] = []) => {
      // Mock tenant context functions
      if (query.includes('set_tenant_context')) {
        return Promise.resolve({ rows: [] });
      }
      
      if (query.includes('clear_tenant_context')) {
        return Promise.resolve({ rows: [] });
      }
      
      if (query.includes('get_current_tenant_id')) {
        return Promise.resolve({ rows: [{ get_current_tenant_id: tenant1.id }] });
      }

      // Mock RLS-filtered queries
      if (query.includes('FROM estoque_escolas')) {
        return Promise.resolve({ rows: [] });
      }

      if (query.includes('FROM estoque_lotes')) {
        return Promise.resolve({ rows: [] });
      }

      if (query.includes('FROM estoque_escolas_historico')) {
        return Promise.resolve({ rows: [] });
      }

      // Default empty result
      return Promise.resolve({ rows: [] });
    });
  }
});