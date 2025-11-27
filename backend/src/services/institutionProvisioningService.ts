import { Pool } from 'pg';
import { InstitutionModel } from '../models/Institution';
import bcrypt from 'bcryptjs';

interface ProvisionInstitutionData {
  // Institution data
  institution: {
    name: string;
    slug: string;
    legal_name?: string;
    document_number?: string;
    type?: 'prefeitura' | 'secretaria' | 'organizacao' | 'empresa';
    email?: string;
    phone?: string;
    plan_id?: string;
    address?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      zipcode?: string;
    };
  };
  
  // Initial tenant
  tenant: {
    name: string;
    slug: string;
    subdomain?: string;
  };
  
  // Admin user
  admin: {
    nome: string;
    email: string;
    senha: string;
  };
}

export class InstitutionProvisioningService {
  private institutionModel: InstitutionModel;

  constructor(private db: Pool) {
    this.institutionModel = new InstitutionModel(db);
  }

  /**
   * Complete provisioning flow:
   * 1. Create institution
   * 2. Create initial tenant for the institution
   * 3. Create admin user
   * 4. Link user to institution and tenant
   */
  async provisionComplete(data: ProvisionInstitutionData): Promise<any> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Create institution
      const institutionQuery = `
        INSERT INTO institutions (
          slug, name, legal_name, document_number, type, status,
          email, phone, plan_id,
          address_street, address_number, address_complement,
          address_neighborhood, address_city, address_state, address_zipcode
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;
      
      const institutionValues = [
        data.institution.slug,
        data.institution.name,
        data.institution.legal_name,
        data.institution.document_number,
        data.institution.type || 'prefeitura',
        'active',
        data.institution.email,
        data.institution.phone,
        data.institution.plan_id || null,
        data.institution.address?.street,
        data.institution.address?.number,
        data.institution.address?.complement,
        data.institution.address?.neighborhood,
        data.institution.address?.city,
        data.institution.address?.state,
        data.institution.address?.zipcode
      ];
      
      const institutionResult = await client.query(institutionQuery, institutionValues);
      const institution = institutionResult.rows[0];

      // 2. Create initial tenant
      const tenantQuery = `
        INSERT INTO tenants (
          institution_id, slug, name, subdomain, status
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const tenantValues = [
        institution.id,
        data.tenant.slug,
        data.tenant.name,
        data.tenant.subdomain || data.tenant.slug,
        'active'
      ];
      
      const tenantResult = await client.query(tenantQuery, tenantValues);
      const tenant = tenantResult.rows[0];

      // 3. Create admin user
      const hashedPassword = await bcrypt.hash(data.admin.senha, 10);
      
      const userQuery = `
        INSERT INTO usuarios (
          nome, email, senha, tipo, ativo, institution_id, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nome, email, tipo, ativo, institution_id, tenant_id, created_at
      `;
      
      const userValues = [
        data.admin.nome,
        data.admin.email,
        hashedPassword,
        'admin',
        true,
        institution.id,
        tenant.id
      ];
      
      const userResult = await client.query(userQuery, userValues);
      const user = userResult.rows[0];

      // 4. Link user to institution with admin role
      const institutionUserQuery = `
        INSERT INTO institution_users (
          institution_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const institutionUserResult = await client.query(institutionUserQuery, [
        institution.id,
        user.id,
        'institution_admin',
        'active'
      ]);

      // 5. Link user to tenant with admin role
      const tenantUserQuery = `
        INSERT INTO tenant_users (
          tenant_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const tenantUserResult = await client.query(tenantUserQuery, [
        tenant.id,
        user.id,
        'tenant_admin',
        'active'
      ]);

      // 6. Create audit log
      await client.query(`
        INSERT INTO institution_audit_log (
          institution_id, operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        institution.id,
        'CREATE',
        'institution_provisioning',
        institution.id,
        JSON.stringify({
          institution: institution.name,
          tenant: tenant.name,
          admin: user.email
        }),
        user.id
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Instituição provisionada com sucesso',
        data: {
          institution: {
            id: institution.id,
            slug: institution.slug,
            name: institution.name,
            status: institution.status
          },
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            subdomain: tenant.subdomain
          },
          admin: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            tipo: user.tipo
          }
        }
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro no provisionamento:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create additional tenant for existing institution
   */
  async createTenant(institutionId: string, tenantData: any, userId: number): Promise<any> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check institution exists and limits
      const institutionResult = await client.query(
        'SELECT * FROM institutions WHERE id = $1',
        [institutionId]
      );
      
      if (institutionResult.rows.length === 0) {
        throw new Error('Instituição não encontrada');
      }

      const institution = institutionResult.rows[0];

      // Check tenant limit
      const tenantCountResult = await client.query(
        'SELECT COUNT(*) as count FROM tenants WHERE institution_id = $1',
        [institutionId]
      );
      
      const tenantCount = parseInt(tenantCountResult.rows[0].count);
      const maxTenants = institution.limits?.max_tenants || 5;

      if (tenantCount >= maxTenants) {
        throw new Error(`Limite de ${maxTenants} tenants atingido para esta instituição`);
      }

      // Create tenant
      const tenantQuery = `
        INSERT INTO tenants (
          institution_id, slug, name, subdomain, status, settings
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const tenantValues = [
        institutionId,
        tenantData.slug,
        tenantData.name,
        tenantData.subdomain || tenantData.slug,
        'active',
        JSON.stringify(tenantData.settings || {})
      ];
      
      const tenantResult = await client.query(tenantQuery, tenantValues);
      const tenant = tenantResult.rows[0];

      // Create audit log
      await client.query(`
        INSERT INTO institution_audit_log (
          institution_id, operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        institutionId,
        'CREATE',
        'tenant',
        tenant.id,
        JSON.stringify(tenant),
        userId
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Tenant criado com sucesso',
        data: tenant
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create user for institution
   */
  async createUser(institutionId: string, userData: any, creatorUserId: number): Promise<any> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Check institution exists and limits
      const institutionResult = await client.query(
        'SELECT * FROM institutions WHERE id = $1',
        [institutionId]
      );
      
      if (institutionResult.rows.length === 0) {
        throw new Error('Instituição não encontrada');
      }

      const institution = institutionResult.rows[0];

      // Check user limit
      const userCountResult = await client.query(
        'SELECT COUNT(*) as count FROM institution_users WHERE institution_id = $1 AND status = $2',
        [institutionId, 'active']
      );
      
      const userCount = parseInt(userCountResult.rows[0].count);
      const maxUsers = institution.limits?.max_users || 100;

      if (userCount >= maxUsers) {
        throw new Error(`Limite de ${maxUsers} usuários atingido para esta instituição`);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.senha, 10);

      // Create user
      const userQuery = `
        INSERT INTO usuarios (
          nome, email, senha, tipo, ativo, institution_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, tipo, ativo, institution_id, created_at
      `;
      
      const userValues = [
        userData.nome,
        userData.email,
        hashedPassword,
        userData.tipo || 'usuario',
        true,
        institutionId
      ];
      
      const userResult = await client.query(userQuery, userValues);
      const user = userResult.rows[0];

      // Link to institution
      await client.query(`
        INSERT INTO institution_users (
          institution_id, user_id, role, status
        ) VALUES ($1, $2, $3, $4)
      `, [
        institutionId,
        user.id,
        userData.institution_role || 'user',
        'active'
      ]);

      // Link to tenant if specified
      if (userData.tenant_id) {
        await client.query(`
          INSERT INTO tenant_users (
            tenant_id, user_id, role, status
          ) VALUES ($1, $2, $3, $4)
        `, [
          userData.tenant_id,
          user.id,
          userData.tenant_role || 'user',
          'active'
        ]);
      }

      // Create audit log
      await client.query(`
        INSERT INTO institution_audit_log (
          institution_id, operation, entity_type, entity_id, new_values, user_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        institutionId,
        'CREATE',
        'user',
        user.id.toString(),
        JSON.stringify({ email: user.email, nome: user.nome }),
        creatorUserId
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Usuário criado com sucesso',
        data: user
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get complete institution hierarchy
   */
  async getHierarchy(institutionId: string): Promise<any> {
    const query = `
      SELECT 
        i.id as institution_id,
        i.name as institution_name,
        i.slug as institution_slug,
        i.status as institution_status,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug,
            'subdomain', t.subdomain,
            'status', t.status
          )
        ) FILTER (WHERE t.id IS NOT NULL) as tenants,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'nome', u.nome,
            'email', u.email,
            'tipo', u.tipo,
            'institution_role', iu.role,
            'tenant_id', u.tenant_id
          )
        ) FILTER (WHERE u.id IS NOT NULL) as users
      FROM institutions i
      LEFT JOIN tenants t ON t.institution_id = i.id
      LEFT JOIN institution_users iu ON iu.institution_id = i.id AND iu.status = 'active'
      LEFT JOIN usuarios u ON u.id = iu.user_id
      WHERE i.id = $1
      GROUP BY i.id, i.name, i.slug, i.status
    `;
    
    const result = await this.db.query(query, [institutionId]);
    return result.rows[0] || null;
  }
}
