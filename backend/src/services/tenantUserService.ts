/**
 * Service for managing tenant user associations and roles
 */

import { 
  TenantUser, 
  TenantUserRole, 
  TenantUserStatus,
  CreateTenantUserInput,
  UpdateTenantUserInput,
  TenantUserFilters
} from '../types/tenant';

const db = require('../database');

export class TenantUserService {
  
  /**
   * Create a new tenant user association
   */
  async createTenantUser(input: CreateTenantUserInput): Promise<TenantUser> {
    const { tenantId, userId, role, status = 'active' } = input;

    // Validate that tenant exists and is active
    const tenantResult = await db.query(`
      SELECT id, status FROM tenants WHERE id = $1
    `, [tenantId]);

    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant não encontrado');
    }

    if (tenantResult.rows[0].status !== 'active') {
      throw new Error('Tenant não está ativo');
    }

    // Validate that user exists and is active
    const userResult = await db.query(`
      SELECT id, ativo FROM usuarios WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      throw new Error('Usuário não encontrado');
    }

    if (!userResult.rows[0].ativo) {
      throw new Error('Usuário não está ativo');
    }

    // Check if association already exists
    const existingResult = await db.query(`
      SELECT id FROM tenant_users WHERE tenant_id = $1 AND user_id = $2
    `, [tenantId, userId]);

    if (existingResult.rows.length > 0) {
      throw new Error('Usuário já está associado a este tenant');
    }

    // Create the association
    const result = await db.query(`
      INSERT INTO tenant_users (tenant_id, user_id, role, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [tenantId, userId, role, status]);

    return this.mapTenantUser(result.rows[0]);
  }

  /**
   * Update a tenant user association
   */
  async updateTenantUser(id: string, input: UpdateTenantUserInput): Promise<TenantUser> {
    const { role, status } = input;

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      throw new Error('Nenhum campo para atualizar');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await db.query(`
      UPDATE tenant_users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      throw new Error('Associação tenant-usuário não encontrada');
    }

    return this.mapTenantUser(result.rows[0]);
  }

  /**
   * Delete a tenant user association
   */
  async deleteTenantUser(id: string): Promise<void> {
    const result = await db.query(`
      DELETE FROM tenant_users WHERE id = $1
    `, [id]);

    if (result.rowCount === 0) {
      throw new Error('Associação tenant-usuário não encontrada');
    }
  }

  /**
   * Get a tenant user association by ID
   */
  async getTenantUser(id: string): Promise<TenantUser | null> {
    const result = await db.query(`
      SELECT 
        tu.*,
        u.nome as user_nome,
        u.email as user_email,
        u.tipo as user_tipo,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM tenant_users tu
      JOIN usuarios u ON tu.user_id = u.id
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTenantUserWithRelations(result.rows[0]);
  }

  /**
   * Get tenant user association by tenant and user
   */
  async getTenantUserByTenantAndUser(tenantId: string, userId: number): Promise<TenantUser | null> {
    const result = await db.query(`
      SELECT 
        tu.*,
        u.nome as user_nome,
        u.email as user_email,
        u.tipo as user_tipo,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM tenant_users tu
      JOIN usuarios u ON tu.user_id = u.id
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.tenant_id = $1 AND tu.user_id = $2
    `, [tenantId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapTenantUserWithRelations(result.rows[0]);
  }

  /**
   * List tenant users with filters
   */
  async listTenantUsers(filters: TenantUserFilters = {}): Promise<TenantUser[]> {
    const { tenantId, role, status, search } = filters;

    let query = `
      SELECT 
        tu.*,
        u.nome as user_nome,
        u.email as user_email,
        u.tipo as user_tipo,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM tenant_users tu
      JOIN usuarios u ON tu.user_id = u.id
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND tu.tenant_id = $${paramIndex++}`;
      queryParams.push(tenantId);
    }

    if (role) {
      query += ` AND tu.role = $${paramIndex++}`;
      queryParams.push(role);
    }

    if (status) {
      query += ` AND tu.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (search) {
      query += ` AND (u.nome ILIKE $${paramIndex++} OR u.email ILIKE $${paramIndex++})`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY tu.created_at DESC`;

    const result = await db.query(query, queryParams);
    return result.rows.map(row => this.mapTenantUserWithRelations(row));
  }

  /**
   * Get users for a specific tenant
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    return this.listTenantUsers({ tenantId });
  }

  /**
   * Get tenants for a specific user
   */
  async getUserTenants(userId: number): Promise<TenantUser[]> {
    const result = await db.query(`
      SELECT 
        tu.*,
        u.nome as user_nome,
        u.email as user_email,
        u.tipo as user_tipo,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM tenant_users tu
      JOIN usuarios u ON tu.user_id = u.id
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.status = 'active' AND t.status = 'active'
      ORDER BY tu.created_at ASC
    `, [userId]);

    return result.rows.map(row => this.mapTenantUserWithRelations(row));
  }

  /**
   * Check if user has access to tenant
   */
  async hasUserAccessToTenant(userId: number, tenantId: string): Promise<boolean> {
    const result = await db.query(`
      SELECT 1 FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.tenant_id = $2 
        AND tu.status = 'active' AND t.status = 'active'
    `, [userId, tenantId]);

    return result.rows.length > 0;
  }

  /**
   * Check if user has specific role in tenant
   */
  async hasUserRoleInTenant(userId: number, tenantId: string, role: TenantUserRole): Promise<boolean> {
    const result = await db.query(`
      SELECT 1 FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.tenant_id = $2 AND tu.role = $3
        AND tu.status = 'active' AND t.status = 'active'
    `, [userId, tenantId, role]);

    return result.rows.length > 0;
  }

  /**
   * Get user's role in tenant
   */
  async getUserRoleInTenant(userId: number, tenantId: string): Promise<TenantUserRole | null> {
    const result = await db.query(`
      SELECT tu.role FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.user_id = $1 AND tu.tenant_id = $2 
        AND tu.status = 'active' AND t.status = 'active'
    `, [userId, tenantId]);

    return result.rows.length > 0 ? result.rows[0].role : null;
  }

  /**
   * Promote user to tenant admin
   */
  async promoteToTenantAdmin(tenantId: string, userId: number): Promise<TenantUser> {
    const association = await this.getTenantUserByTenantAndUser(tenantId, userId);
    if (!association) {
      throw new Error('Usuário não está associado ao tenant');
    }

    return this.updateTenantUser(association.id, { role: 'tenant_admin' });
  }

  /**
   * Demote user from tenant admin
   */
  async demoteFromTenantAdmin(tenantId: string, userId: number): Promise<TenantUser> {
    const association = await this.getTenantUserByTenantAndUser(tenantId, userId);
    if (!association) {
      throw new Error('Usuário não está associado ao tenant');
    }

    return this.updateTenantUser(association.id, { role: 'user' });
  }

  /**
   * Suspend user access to tenant
   */
  async suspendUserAccess(tenantId: string, userId: number): Promise<TenantUser> {
    const association = await this.getTenantUserByTenantAndUser(tenantId, userId);
    if (!association) {
      throw new Error('Usuário não está associado ao tenant');
    }

    return this.updateTenantUser(association.id, { status: 'suspended' });
  }

  /**
   * Restore user access to tenant
   */
  async restoreUserAccess(tenantId: string, userId: number): Promise<TenantUser> {
    const association = await this.getTenantUserByTenantAndUser(tenantId, userId);
    if (!association) {
      throw new Error('Usuário não está associado ao tenant');
    }

    return this.updateTenantUser(association.id, { status: 'active' });
  }

  /**
   * Get tenant admins
   */
  async getTenantAdmins(tenantId: string): Promise<TenantUser[]> {
    return this.listTenantUsers({ 
      tenantId, 
      role: 'tenant_admin', 
      status: 'active' 
    });
  }

  /**
   * Count users by tenant
   */
  async countUsersByTenant(tenantId: string): Promise<number> {
    const result = await db.query(`
      SELECT COUNT(*) as count FROM tenant_users 
      WHERE tenant_id = $1 AND status = 'active'
    `, [tenantId]);

    return parseInt(result.rows[0].count);
  }

  /**
   * Map database row to TenantUser object
   */
  private mapTenantUser(row: any): TenantUser {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Map database row with relations to TenantUser object
   */
  private mapTenantUserWithRelations(row: any): TenantUser {
    const tenantUser = this.mapTenantUser(row);
    
    if (row.user_nome) {
      tenantUser.user = {
        id: row.user_id,
        nome: row.user_nome,
        email: row.user_email,
        tipo: row.user_tipo
      };
    }

    if (row.tenant_name) {
      tenantUser.tenant = {
        id: row.tenant_id,
        name: row.tenant_name,
        slug: row.tenant_slug
      };
    }

    return tenantUser;
  }
}

// Export singleton instance
export const tenantUserService = new TenantUserService();