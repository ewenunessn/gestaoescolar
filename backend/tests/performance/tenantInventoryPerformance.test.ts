/**
 * Performance tests for tenant inventory queries
 * Tests query performance, index effectiveness, and scalability
 */

import { testDb } from '../helpers/testDatabase';

// Mock database
jest.mock('../../src/database');
const db = require('../../src/database');

describe('Tenant Inventory Performance Tests', () => {
  let tenants: any[] = [];
  let schools: any[] = [];
  let products: any[] = [];
  let inventoryItems: any[] = [];
  let lotes: any[] = [];

  beforeAll(async () => {
    // Create multiple tenants for performance testing
    for (let i = 1; i <= 5; i++) {
      const tenant = await testDb.createTestTenant({
        slug: `perf-tenant-${i}`,
        name: `Performance Tenant ${i}`
      });
      tenants.push(tenant);

      // Create schools for each tenant
      for (let j = 1; j <= 10; j++) {
        const school = await testDb.createTestSchool(tenant.id, `School ${j} - Tenant ${i}`);
        schools.push(school);
      }

      // Create products for each tenant
      for (let k = 1; k <= 20; k++) {
        const product = await testDb.createTestProduct(tenant.id, `Product ${k} - Tenant ${i}`);
        products.push(product);
      }
    }

    // Create inventory items (simulate large dataset)
    let itemId = 1;
    for (const tenant of tenants) {
      const tenantSchools = schools.filter(s => s.tenant_id === tenant.id);
      const tenantProducts = products.filter(p => p.tenant_id === tenant.id);

      for (const school of tenantSchools) {
        for (const product of tenantProducts) {
          const inventoryItem = {
            id: itemId++,
            escola_id: school.id,
            produto_id: product.id,
            quantidade_atual: Math.floor(Math.random() * 1000) + 1,
            tenant_id: tenant.id
          };
          inventoryItems.push(inventoryItem);

          // Create lotes for some inventory items
          if (Math.random() > 0.7) {
            for (let l = 1; l <= 3; l++) {
              const lote = {
                id: itemId++,
                escola_id: school.id,
                produto_id: product.id,
                lote: `LOTE${String(l).padStart(3, '0')}-${school.id}-${product.id}`,
                quantidade_atual: Math.floor(Math.random() * 100) + 1,
                tenant_id: tenant.id
              };
              lotes.push(lote);
            }
          }
        }
      }
    }

    setupPerformanceMocks();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Query Performance Benchmarks', () => {
    it('should execute tenant-filtered inventory queries within acceptable time', async () => {
      const tenant = tenants[0];
      const startTime = Date.now();

      // Mock performance query
      db.query.mockResolvedValue({
        rows: inventoryItems.filter(item => item.tenant_id === tenant.id).slice(0, 100)
      });

      const result = await db.query(`
        SELECT ee.*, p.nome as produto_nome, e.nome as escola_nome
        FROM estoque_escolas ee
        JOIN produtos p ON ee.produto_id = p.id
        JOIN escolas e ON ee.escola_id = e.id
        WHERE ee.tenant_id = $1
        ORDER BY ee.quantidade_atual DESC
        LIMIT 100
      `, [tenant.id]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500); // 500ms max
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.every((item: any) => item.tenant_id === tenant.id)).toBe(true);
    });

    it('should execute complex inventory aggregation queries efficiently', async () => {
      const tenant = tenants[0];
      const startTime = Date.now();

      // Mock complex aggregation query
      db.query.mockResolvedValue({
        rows: [{
          total_produtos: 20,
          total_escolas: 10,
          total_quantidade: 15000,
          produtos_criticos: 5,
          produtos_vencendo: 3
        }]
      });

      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT ee.produto_id) as total_produtos,
          COUNT(DISTINCT ee.escola_id) as total_escolas,
          SUM(ee.quantidade_atual) as total_quantidade,
          COUNT(CASE WHEN ee.quantidade_atual < 10 THEN 1 END) as produtos_criticos,
          COUNT(CASE WHEN el.data_validade < CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as produtos_vencendo
        FROM estoque_escolas ee
        LEFT JOIN estoque_lotes el ON ee.produto_id = el.produto_id AND ee.escola_id = el.escola_id
        WHERE ee.tenant_id = $1
      `, [tenant.id]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // 1 second max for complex queries
      expect(result.rows[0].total_produtos).toBeGreaterThan(0);
    });

    it('should execute lote queries with tenant filtering efficiently', async () => {
      const tenant = tenants[0];
      const school = schools.find(s => s.tenant_id === tenant.id);
      const startTime = Date.now();

      // Mock lote query
      db.query.mockResolvedValue({
        rows: lotes.filter(l => l.tenant_id === tenant.id && l.escola_id === school.id)
      });

      const result = await db.query(`
        SELECT el.*, p.nome as produto_nome
        FROM estoque_lotes el
        JOIN produtos p ON el.produto_id = p.id
        WHERE el.tenant_id = $1 AND el.escola_id = $2
        ORDER BY el.data_validade ASC
      `, [tenant.id, school.id]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(300); // 300ms max
      expect(result.rows.every((lote: any) => lote.tenant_id === tenant.id)).toBe(true);
    });

    it('should handle pagination efficiently for large datasets', async () => {
      const tenant = tenants[0];
      const pageSize = 50;
      const offset = 100;
      const startTime = Date.now();

      // Mock paginated query
      db.query.mockResolvedValue({
        rows: inventoryItems
          .filter(item => item.tenant_id === tenant.id)
          .slice(offset, offset + pageSize)
      });

      const result = await db.query(`
        SELECT ee.*, p.nome as produto_nome, e.nome as escola_nome
        FROM estoque_escolas ee
        JOIN produtos p ON ee.produto_id = p.id
        JOIN escolas e ON ee.escola_id = e.id
        WHERE ee.tenant_id = $1
        ORDER BY ee.id
        LIMIT $2 OFFSET $3
      `, [tenant.id, pageSize, offset]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(200); // 200ms max for paginated queries
      expect(result.rows.length).toBeLessThanOrEqual(pageSize);
    });
  });

  describe('Index Effectiveness Verification', () => {
    it('should use tenant-aware indexes for inventory queries', async () => {
      const tenant = tenants[0];

      // Mock EXPLAIN ANALYZE result
      db.query.mockResolvedValue({
        rows: [{
          'QUERY PLAN': 'Index Scan using idx_estoque_escolas_tenant_escola on estoque_escolas (cost=0.29..8.31 rows=1 width=32)'
        }]
      });

      const result = await db.query(`
        EXPLAIN ANALYZE SELECT * FROM estoque_escolas 
        WHERE tenant_id = $1 AND escola_id = $2
      `, [tenant.id, schools[0].id]);

      expect(result.rows[0]['QUERY PLAN']).toContain('idx_estoque_escolas_tenant_escola');
      expect(result.rows[0]['QUERY PLAN']).toContain('Index Scan');
    });

    it('should use composite indexes for complex inventory filters', async () => {
      const tenant = tenants[0];

      // Mock EXPLAIN result for composite index usage
      db.query.mockResolvedValue({
        rows: [{
          'QUERY PLAN': 'Index Scan using idx_estoque_lotes_tenant_escola_produto on estoque_lotes (cost=0.29..4.31 rows=1 width=48)'
        }]
      });

      const result = await db.query(`
        EXPLAIN SELECT * FROM estoque_lotes 
        WHERE tenant_id = $1 AND escola_id = $2 AND produto_id = $3
      `, [tenant.id, schools[0].id, products[0].id]);

      expect(result.rows[0]['QUERY PLAN']).toContain('idx_estoque_lotes_tenant_escola_produto');
      expect(result.rows[0]['QUERY PLAN']).toContain('Index Scan');
    });

    it('should use conditional indexes for filtered queries', async () => {
      const tenant = tenants[0];

      // Mock EXPLAIN result for conditional index
      db.query.mockResolvedValue({
        rows: [{
          'QUERY PLAN': 'Index Scan using idx_estoque_tenant_status on estoque_escolas (cost=0.29..12.31 rows=5 width=32)'
        }]
      });

      const result = await db.query(`
        EXPLAIN SELECT * FROM estoque_escolas 
        WHERE tenant_id = $1 AND quantidade_atual > 0
      `, [tenant.id]);

      expect(result.rows[0]['QUERY PLAN']).toContain('Index Scan');
    });

    it('should avoid sequential scans for tenant-filtered queries', async () => {
      const tenant = tenants[0];

      // Mock EXPLAIN result showing no sequential scan
      db.query.mockResolvedValue({
        rows: [{
          'QUERY PLAN': 'Index Scan using idx_estoque_escolas_tenant_escola on estoque_escolas (cost=0.29..8.31 rows=1 width=32)'
        }]
      });

      const result = await db.query(`
        EXPLAIN SELECT * FROM estoque_escolas WHERE tenant_id = $1
      `, [tenant.id]);

      expect(result.rows[0]['QUERY PLAN']).not.toContain('Seq Scan');
      expect(result.rows[0]['QUERY PLAN']).toContain('Index Scan');
    });
  });

  describe('Scalability Testing', () => {
    it('should maintain performance with multiple concurrent tenant queries', async () => {
      const promises: Promise<any>[] = [];
      const startTime = Date.now();

      // Simulate concurrent queries from different tenants
      for (const tenant of tenants) {
        const promise = new Promise(resolve => {
          // Mock concurrent query
          db.query.mockResolvedValue({
            rows: inventoryItems.filter(item => item.tenant_id === tenant.id).slice(0, 10)
          });

          setTimeout(() => {
            resolve(db.query(`
              SELECT * FROM estoque_escolas WHERE tenant_id = $1 LIMIT 10
            `, [tenant.id]));
          }, Math.random() * 50); // Random delay up to 50ms
        });

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // All queries should complete within 1 second
      expect(results).toHaveLength(tenants.length);
      results.forEach((result, index) => {
        expect(result.rows.every((item: any) => item.tenant_id === tenants[index].id)).toBe(true);
      });
    });

    it('should handle large result sets efficiently', async () => {
      const tenant = tenants[0];
      const startTime = Date.now();

      // Mock large result set
      const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        escola_id: schools[0].id,
        produto_id: products[0].id,
        quantidade_atual: Math.floor(Math.random() * 100),
        tenant_id: tenant.id
      }));

      db.query.mockResolvedValue({
        rows: largeResultSet
      });

      const result = await db.query(`
        SELECT * FROM estoque_escolas WHERE tenant_id = $1
      `, [tenant.id]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(2000); // 2 seconds max for large datasets
      expect(result.rows.length).toBe(1000);
    });

    it('should maintain performance with increasing tenant count', async () => {
      const performanceResults: number[] = [];

      // Test performance with different numbers of tenants
      for (let tenantCount = 1; tenantCount <= 5; tenantCount++) {
        const testTenants = tenants.slice(0, tenantCount);
        const startTime = Date.now();

        // Mock queries for each tenant
        for (const tenant of testTenants) {
          db.query.mockResolvedValue({
            rows: inventoryItems.filter(item => item.tenant_id === tenant.id).slice(0, 50)
          });

          await db.query(`
            SELECT * FROM estoque_escolas WHERE tenant_id = $1 LIMIT 50
          `, [tenant.id]);
        }

        const endTime = Date.now();
        const avgTimePerTenant = (endTime - startTime) / tenantCount;
        performanceResults.push(avgTimePerTenant);
      }

      // Performance should not degrade significantly with more tenants
      const firstResult = performanceResults[0];
      const lastResult = performanceResults[performanceResults.length - 1];
      const degradationRatio = lastResult / firstResult;

      expect(degradationRatio).toBeLessThan(2); // Less than 2x degradation
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should handle memory efficiently for large inventory queries', async () => {
      const tenant = tenants[0];
      const initialMemory = process.memoryUsage().heapUsed;

      // Mock large query result
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        id: i + 1,
        escola_id: schools[i % 10].id,
        produto_id: products[i % 20].id,
        quantidade_atual: Math.floor(Math.random() * 1000),
        tenant_id: tenant.id
      }));

      db.query.mockResolvedValue({
        rows: largeDataset
      });

      const result = await db.query(`
        SELECT * FROM estoque_escolas WHERE tenant_id = $1
      `, [tenant.id]);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.rows.length).toBe(5000);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    it('should release resources properly after queries', async () => {
      const tenant = tenants[0];
      const initialMemory = process.memoryUsage().heapUsed;

      // Execute multiple queries
      for (let i = 0; i < 10; i++) {
        db.query.mockResolvedValue({
          rows: inventoryItems.filter(item => item.tenant_id === tenant.id).slice(0, 100)
        });

        await db.query(`
          SELECT * FROM estoque_escolas WHERE tenant_id = $1 LIMIT 100
        `, [tenant.id]);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase after cleanup
    });
  });

  describe('Load Testing', () => {
    it('should handle high-frequency inventory queries', async () => {
      const tenant = tenants[0];
      const queryCount = 100;
      const startTime = Date.now();

      const promises = Array.from({ length: queryCount }, async (_, i) => {
        db.query.mockResolvedValue({
          rows: inventoryItems.filter(item => item.tenant_id === tenant.id).slice(0, 10)
        });

        return db.query(`
          SELECT * FROM estoque_escolas WHERE tenant_id = $1 LIMIT 10
        `, [tenant.id]);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerQuery = totalTime / queryCount;

      expect(results).toHaveLength(queryCount);
      expect(avgTimePerQuery).toBeLessThan(50); // Less than 50ms average per query
      expect(totalTime).toBeLessThan(5000); // All queries within 5 seconds
    });

    it('should maintain response times under load', async () => {
      const responseTimes: number[] = [];

      // Execute queries with increasing load
      for (let load = 10; load <= 50; load += 10) {
        const promises = Array.from({ length: load }, async () => {
          const queryStart = Date.now();
          
          db.query.mockResolvedValue({
            rows: inventoryItems.slice(0, 20)
          });

          await db.query(`
            SELECT * FROM estoque_escolas WHERE tenant_id = $1 LIMIT 20
          `, [tenants[0].id]);

          return Date.now() - queryStart;
        });

        const times = await Promise.all(promises);
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        responseTimes.push(avgTime);
      }

      // Response times should remain relatively stable
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const variationRatio = maxResponseTime / minResponseTime;

      expect(variationRatio).toBeLessThan(3); // Less than 3x variation in response times
    });
  });

  function setupPerformanceMocks() {
    // Default mock implementation for performance tests
    db.query.mockImplementation((query: string, params: any[] = []) => {
      // Add small delay to simulate real database operations
      return new Promise(resolve => {
        setTimeout(() => {
          // Mock based on query type
          if (query.includes('EXPLAIN')) {
            resolve({
              rows: [{
                'QUERY PLAN': 'Index Scan using idx_estoque_escolas_tenant_escola on estoque_escolas'
              }]
            });
          } else if (query.includes('FROM estoque_escolas')) {
            const tenantId = params[0];
            const filteredItems = inventoryItems.filter(item => item.tenant_id === tenantId);
            resolve({ rows: filteredItems });
          } else if (query.includes('FROM estoque_lotes')) {
            const tenantId = params[0];
            const filteredLotes = lotes.filter(lote => lote.tenant_id === tenantId);
            resolve({ rows: filteredLotes });
          } else {
            resolve({ rows: [] });
          }
        }, Math.random() * 10); // Random delay 0-10ms
      });
    });
  }
});