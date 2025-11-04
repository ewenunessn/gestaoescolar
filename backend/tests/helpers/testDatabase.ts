/**
 * Test database utilities
 * Provides database setup and cleanup for tests
 */

const db = require('../../src/database');

export interface TestTenant {
  id: string;
  slug: string;
  name: string;
  subdomain: string;
  domain?: string;
  status: string;
  settings: any;
  limits: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestUser {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  tenant_id?: string;
}

export class TestDatabaseHelper {
  private createdTenants: string[] = [];
  private createdUsers: number[] = [];

  /**
   * Create a test tenant
   */
  async createTestTenant(overrides: Partial<TestTenant> = {}): Promise<TestTenant> {
    const now = new Date();
    const tenant = {
      id: overrides.id || this.generateUUID(),
      slug: overrides.slug || `test-tenant-${Date.now()}`,
      name: overrides.name || `Test Tenant ${Date.now()}`,
      subdomain: overrides.subdomain || `test${Date.now()}`,
      domain: overrides.domain,
      status: overrides.status || 'active',
      settings: overrides.settings || { features: { inventory: true } },
      limits: overrides.limits || { maxUsers: 100 },
      createdAt: overrides.createdAt || now,
      updatedAt: overrides.updatedAt || now
    };

    // Mock the database call since we're using mocked db
    if (db.query && typeof db.query.mockResolvedValue === 'function') {
      db.query.mockResolvedValue({ rows: [tenant] });
    } else {
      await db.query(`
        INSERT INTO tenants (id, slug, name, subdomain, domain, status, settings, limits)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [tenant.id, tenant.slug, tenant.name, tenant.subdomain, tenant.domain, tenant.status, tenant.settings, tenant.limits]);
    }

    this.createdTenants.push(tenant.id);
    return tenant;
  }

  /**
   * Create a test user
   */
  async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const user = {
      id: Math.floor(Math.random() * 10000),
      nome: overrides.nome || `Test User ${Date.now()}`,
      email: overrides.email || `test${Date.now()}@example.com`,
      tipo: overrides.tipo || 'usuario',
      tenant_id: overrides.tenant_id
    };

    // Mock the database call since we're using mocked db
    if (db.query && typeof db.query.mockResolvedValue === 'function') {
      db.query.mockResolvedValue({ rows: [user] });
    } else {
      const result = await db.query(`
        INSERT INTO usuarios (nome, email, tipo, senha, tenant_id)
        VALUES ($1, $2, $3, 'test-password', $4)
        RETURNING id, nome, email, tipo, tenant_id
      `, [user.nome, user.email, user.tipo, user.tenant_id]);
      user.id = result.rows[0].id;
    }

    this.createdUsers.push(user.id);
    return user;
  }

  /**
   * Create tenant user association
   */
  async createTenantUser(tenantId: string, userId: number, role: string = 'user'): Promise<void> {
    await db.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3, status = 'active'
    `, [tenantId, userId, role]);
  }

  /**
   * Create test school for tenant
   */
  async createTestSchool(tenantId: string, name: string = 'Test School'): Promise<any> {
    const school = {
      id: Math.floor(Math.random() * 10000),
      nome: name,
      endereco: 'Test Address',
      telefone: '123456789',
      tenant_id: tenantId
    };

    // Mock the database call since we're using mocked db
    if (db.query && typeof db.query.mockResolvedValue === 'function') {
      db.query.mockResolvedValue({ rows: [school] });
    } else {
      const result = await db.query(`
        INSERT INTO escolas (nome, endereco, telefone, tenant_id)
        VALUES ($1, 'Test Address', '123456789', $2)
        RETURNING *
      `, [name, tenantId]);
      return result.rows[0];
    }

    return school;
  }

  /**
   * Create test product for tenant
   */
  async createTestProduct(tenantId: string, name: string = 'Test Product'): Promise<any> {
    const product = {
      id: Math.floor(Math.random() * 10000),
      nome: name,
      categoria: 'Test Category',
      unidade_medida: 'kg',
      tenant_id: tenantId
    };

    // Mock the database call since we're using mocked db
    if (db.query && typeof db.query.mockResolvedValue === 'function') {
      db.query.mockResolvedValue({ rows: [product] });
    } else {
      const result = await db.query(`
        INSERT INTO produtos (nome, categoria, unidade_medida, tenant_id)
        VALUES ($1, 'Test Category', 'kg', $2)
        RETURNING *
      `, [name, tenantId]);
      return result.rows[0];
    }

    return product;
  }

  /**
   * Set tenant context for database operations
   */
  async setTenantContext(tenantId: string): Promise<void> {
    try {
      await db.query('SELECT set_tenant_context($1)', [tenantId]);
    } catch (error) {
      // Fallback to older method
      await db.query('SET app.current_tenant_id = $1', [tenantId]);
    }
  }

  /**
   * Clear tenant context
   */
  async clearTenantContext(): Promise<void> {
    try {
      await db.query('SELECT clear_tenant_context()');
    } catch (error) {
      // Fallback to older method
      await db.query('RESET app.current_tenant_id');
    }
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    try {
      // Clear tenant context first
      await this.clearTenantContext();

      // Delete tenant users
      if (this.createdTenants.length > 0) {
        await db.query(`
          DELETE FROM tenant_users WHERE tenant_id = ANY($1)
        `, [this.createdTenants]);
      }

      // Delete users
      if (this.createdUsers.length > 0) {
        await db.query(`
          DELETE FROM usuarios WHERE id = ANY($1)
        `, [this.createdUsers]);
      }

      // Delete tenants (cascade will handle related data)
      if (this.createdTenants.length > 0) {
        await db.query(`
          DELETE FROM tenants WHERE id = ANY($1)
        `, [this.createdTenants]);
      }

      // Reset arrays
      this.createdTenants = [];
      this.createdUsers = [];
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  }

  /**
   * Generate UUID for testing
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Verify tenant isolation by checking data visibility
   */
  async verifyTenantIsolation(tenant1Id: string, tenant2Id: string): Promise<{
    tenant1Data: any[];
    tenant2Data: any[];
    crossTenantAccess: boolean;
  }> {
    // Set context to tenant 1 and query data
    await this.setTenantContext(tenant1Id);
    const tenant1Result = await db.query('SELECT * FROM escolas');
    const tenant1Data = tenant1Result.rows;

    // Set context to tenant 2 and query data
    await this.setTenantContext(tenant2Id);
    const tenant2Result = await db.query('SELECT * FROM escolas');
    const tenant2Data = tenant2Result.rows;

    // Check if there's any cross-tenant data visibility
    const tenant1Ids = tenant1Data.map(row => row.id);
    const tenant2Ids = tenant2Data.map(row => row.id);
    const crossTenantAccess = tenant1Ids.some(id => tenant2Ids.includes(id));

    return {
      tenant1Data,
      tenant2Data,
      crossTenantAccess
    };
  }
}

export const testDb = new TestDatabaseHelper();