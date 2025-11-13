/**
 * Serviço de gerenciamento de tenants
 * Operações CRUD e provisioning de tenants
 */

import { 
  Tenant, 
  TenantConfiguration, 
  TenantUser,
  CreateTenantInput,
  UpdateTenantInput,
  CreateTenantUserInput,
  UpdateTenantUserInput,
  CreateTenantConfigurationInput,
  UpdateTenantConfigurationInput,
  TenantFilters,
  TenantProvisioningRequest,
  TenantProvisioningResult,
  TenantStats,
  DEFAULT_TENANT_SETTINGS,
  DEFAULT_TENANT_LIMITS,
  TenantSlugConflictError,
  TenantSubdomainConflictError,
  TenantNotFoundError
} from '../types/tenant';
const db = require('../database');

export interface TenantServiceInterface {
  // Tenant management
  createTenant(data: CreateTenantInput): Promise<Tenant>;
  updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  getTenant(id: string): Promise<Tenant | null>;
  getTenantBySlug(slug: string): Promise<Tenant | null>;
  listTenants(filters?: TenantFilters): Promise<Tenant[]>;
  
  // Tenant provisioning
  provisionTenant(request: TenantProvisioningRequest): Promise<TenantProvisioningResult>;
  deprovisionTenant(tenantId: string): Promise<void>;
  
  // Configuration management
  getTenantConfig(tenantId: string, category?: string): Promise<TenantConfiguration[]>;
  setTenantConfig(tenantId: string, config: CreateTenantConfigurationInput): Promise<TenantConfiguration>;
  updateTenantConfig(configId: string, data: UpdateTenantConfigurationInput): Promise<TenantConfiguration>;
  deleteTenantConfig(configId: string): Promise<void>;
  
  // User management
  getTenantUsers(tenantId: string): Promise<TenantUser[]>;
  addTenantUser(data: CreateTenantUserInput): Promise<TenantUser>;
  updateTenantUser(id: string, data: UpdateTenantUserInput): Promise<TenantUser>;
  removeTenantUser(id: string): Promise<void>;
  
  // Statistics
  getTenantStats(tenantId: string): Promise<TenantStats>;
}

export class TenantService implements TenantServiceInterface {
  
  /**
   * Cria um novo tenant
   */
  async createTenant(data: CreateTenantInput): Promise<Tenant> {
    try {
      // Verificar se slug já existe
      const existingSlug = await this.getTenantBySlug(data.slug);
      if (existingSlug) {
        throw new TenantSlugConflictError(data.slug);
      }

      // Verificar se subdomínio já existe
      if (data.subdomain) {
        const existingSubdomain = await db.query(`
          SELECT id FROM tenants WHERE subdomain = $1
        `, [data.subdomain]);
        
        if (existingSubdomain.rows.length > 0) {
          throw new TenantSubdomainConflictError(data.subdomain);
        }
      }

      // Mesclar configurações padrão com as fornecidas
      const settings = { ...DEFAULT_TENANT_SETTINGS, ...data.settings };
      const limits = { ...DEFAULT_TENANT_LIMITS, ...data.limits };

      const result = await db.query(`
        INSERT INTO tenants (
          slug, name, domain, subdomain, settings, limits
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id,
          slug,
          name,
          domain,
          subdomain,
          status,
          settings,
          limits,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [
        data.slug,
        data.name,
        data.domain || null,
        data.subdomain || null,
        JSON.stringify(settings),
        JSON.stringify(limits)
      ]);

      const tenant = this.mapTenantFromDb(result.rows[0]);

      // Criar configurações padrão
      await this.createDefaultConfigurations(tenant.id, settings, limits);

      // Log de auditoria
      await this.logTenantOperation('CREATE', 'tenants', tenant.id, null, tenant);

      return tenant;
    } catch (error) {
      console.error('Erro ao criar tenant:', error);
      throw error;
    }
  }

  /**
   * Atualiza um tenant existente
   */
  async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
    try {
      // Buscar tenant atual
      const currentTenant = await this.getTenant(id);
      if (!currentTenant) {
        throw new TenantNotFoundError(id);
      }

      // Verificar conflitos de slug/subdomínio se alterados
      if (data.subdomain && data.subdomain !== currentTenant.subdomain) {
        const existingSubdomain = await db.query(`
          SELECT id FROM tenants WHERE subdomain = $1 AND id != $2
        `, [data.subdomain, id]);
        
        if (existingSubdomain.rows.length > 0) {
          throw new TenantSubdomainConflictError(data.subdomain);
        }
      }

      // Construir query de atualização dinamicamente
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(data.name);
      }
      if (data.domain !== undefined) {
        updateFields.push(`domain = $${paramIndex++}`);
        updateValues.push(data.domain);
      }
      if (data.subdomain !== undefined) {
        updateFields.push(`subdomain = $${paramIndex++}`);
        updateValues.push(data.subdomain);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(data.status);
      }
      if (data.settings !== undefined) {
        const mergedSettings = { ...currentTenant.settings, ...data.settings };
        updateFields.push(`settings = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedSettings));
      }
      if (data.limits !== undefined) {
        const mergedLimits = { ...currentTenant.limits, ...data.limits };
        updateFields.push(`limits = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedLimits));
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await db.query(`
        UPDATE tenants SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id,
          slug,
          name,
          domain,
          subdomain,
          status,
          settings,
          limits,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, updateValues);

      const updatedTenant = this.mapTenantFromDb(result.rows[0]);

      // Log de auditoria
      await this.logTenantOperation('UPDATE', 'tenants', id, currentTenant, updatedTenant);

      return updatedTenant;
    } catch (error) {
      console.error('Erro ao atualizar tenant:', error);
      throw error;
    }
  }

  /**
   * Remove um tenant
   */
  async deleteTenant(id: string): Promise<void> {
    try {
      const tenant = await this.getTenant(id);
      if (!tenant) {
        throw new TenantNotFoundError(id);
      }

      // Usar transação para garantir consistência
      await db.transaction(async (client: any) => {
        // Remover dados relacionados (cascade deve cuidar disso, mas garantir)
        await client.query('DELETE FROM tenant_users WHERE tenant_id = $1', [id]);
        await client.query('DELETE FROM tenant_configurations WHERE tenant_id = $1', [id]);
        
        // Remover tenant
        await client.query('DELETE FROM tenants WHERE id = $1', [id]);
      });

      // Log de auditoria
      await this.logTenantOperation('DELETE', 'tenants', id, tenant, null);
    } catch (error) {
      console.error('Erro ao deletar tenant:', error);
      throw error;
    }
  }

  /**
   * Busca tenant por ID
   */
  async getTenant(id: string): Promise<Tenant | null> {
    try {
      console.log('🔍 [getTenant] Buscando tenant:', id);
      const result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          status,
          settings,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE id = $1
      `, [id]);

      console.log('🔍 [getTenant] Resultado:', result.rows.length > 0 ? 'Encontrado' : 'Não encontrado');
      if (result.rows.length > 0) {
        console.log('🔍 [getTenant] Dados:', result.rows[0]);
        return {
          id: result.rows[0].id,
          slug: result.rows[0].slug,
          name: result.rows[0].name,
          status: result.rows[0].status,
          settings: result.rows[0].settings || {},
          limits: result.rows[0].limits || {
            maxUsers: 100,
            maxSchools: 50,
            maxProducts: 1000,
            storageLimit: 1024,
            apiRateLimit: 100,
            maxContracts: 50,
            maxOrders: 1000
          },
          domain: null,
          subdomain: null,
          createdAt: result.rows[0].createdAt,
          updatedAt: result.rows[0].updatedAt
        };
      }

      return null;
    } catch (error) {
      console.error('❌ [getTenant] Erro ao buscar tenant:', error);
      return null;
    }
  }

  /**
   * Busca tenant por slug
   */
  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          status,
          settings,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE slug = $1
      `, [slug]);

      if (result.rows.length > 0) {
        return {
          id: result.rows[0].id,
          slug: result.rows[0].slug,
          name: result.rows[0].name,
          status: result.rows[0].status,
          settings: result.rows[0].settings || {},
          limits: result.rows[0].limits || {
            maxUsers: 100,
            maxSchools: 50,
            maxProducts: 1000,
            storageLimit: 1024,
            apiRateLimit: 100,
            maxContracts: 50,
            maxOrders: 1000
          },
          domain: null,
          subdomain: null,
          createdAt: result.rows[0].createdAt,
          updatedAt: result.rows[0].updatedAt
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar tenant por slug:', error);
      return null;
    }
  }

  /**
   * Busca tenant por subdomínio
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    try {
      const result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          domain,
          slug as subdomain,
          status,
          settings,
          limits,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE slug = $1
      `, [subdomain]);

      return result.rows.length > 0 ? this.mapTenantFromDb(result.rows[0]) : null;
    } catch (error) {
      console.error('Erro ao buscar tenant por subdomínio:', error);
      return null;
    }
  }

  /**
   * Lista tenants com filtros
   * Updated: 2025-01-13 - Added institution_id to SELECT
   */
  async listTenants(filters: TenantFilters = {}): Promise<Tenant[]> {
    try {
      console.log('🔍 [listTenants] Listando tenants com filtros:', filters);
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(filters.status);
      }

      if (filters.search) {
        whereClause += ` AND (name ILIKE $${paramIndex++} OR slug ILIKE $${paramIndex++})`;
        params.push(`%${filters.search}%`, `%${filters.search}%`);
        paramIndex++;
      }

      if (filters.createdAfter) {
        whereClause += ` AND created_at >= $${paramIndex++}`;
        params.push(filters.createdAfter);
      }

      if (filters.createdBefore) {
        whereClause += ` AND created_at <= $${paramIndex++}`;
        params.push(filters.createdBefore);
      }

      const result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          domain,
          slug as subdomain,
          institution_id,
          status,
          settings,
          limits,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        ${whereClause}
        ORDER BY created_at DESC
      `, params);

      console.log(`🔍 [listTenants] Encontrados ${result.rows.length} tenants`);
      if (result.rows.length > 0) {
        console.log('🔍 [listTenants] Primeiro tenant:', {
          id: result.rows[0].id,
          name: result.rows[0].name,
          institution_id: result.rows[0].institution_id
        });
      }

      return result.rows.map(row => this.mapTenantFromDb(row));
    } catch (error) {
      console.error('Erro ao listar tenants:', error);
      return [];
    }
  }

  /**
   * Provisiona um novo tenant completo
   */
  async provisionTenant(request: TenantProvisioningRequest): Promise<TenantProvisioningResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      return await db.transaction(async (client: any) => {
        // 1. Criar tenant
        const tenant = await this.createTenant(request.tenant);

        // 2. Criar usuário administrador
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(request.adminUser.senha, 10);

        const userResult = await client.query(`
          INSERT INTO usuarios (nome, email, senha, tipo, ativo)
          VALUES ($1, $2, $3, 'admin', true)
          RETURNING id
        `, [
          request.adminUser.nome,
          request.adminUser.email,
          hashedPassword
        ]);

        const userId = userResult.rows[0].id;

        // 3. Associar usuário ao tenant como admin
        const tenantUser = await this.addTenantUser({
          tenantId: tenant.id,
          userId,
          role: 'tenant_admin'
        });

        // 4. Criar dados iniciais se fornecidos
        if (request.initialData) {
          if (request.initialData.schools) {
            // Criar escolas iniciais
            for (const school of request.initialData.schools) {
              try {
                await client.query(`
                  INSERT INTO escolas (nome, endereco, telefone, email, tenant_id)
                  VALUES ($1, $2, $3, $4, $5)
                `, [school.nome, school.endereco, school.telefone, school.email, tenant.id]);
              } catch (error) {
                warnings.push(`Erro ao criar escola ${school.nome}: ${error.message}`);
              }
            }
          }

          if (request.initialData.products) {
            // Criar produtos iniciais
            for (const product of request.initialData.products) {
              try {
                await client.query(`
                  INSERT INTO produtos (nome, descricao, unidade, categoria, tenant_id)
                  VALUES ($1, $2, $3, $4, $5)
                `, [product.nome, product.descricao, product.unidade, product.categoria, tenant.id]);
              } catch (error) {
                warnings.push(`Erro ao criar produto ${product.nome}: ${error.message}`);
              }
            }
          }
        }

        return {
          success: true,
          tenant,
          adminUser: tenantUser,
          errors,
          warnings
        };
      });
    } catch (error) {
      console.error('Erro no provisionamento de tenant:', error);
      errors.push(error.message);
      
      return {
        success: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Remove completamente um tenant e seus dados
   */
  async deprovisionTenant(tenantId: string): Promise<void> {
    try {
      await db.transaction(async (client: any) => {
        // Remover dados do tenant em ordem (devido às foreign keys)
        const tables = [
          'estoque_escolas_historico',
          'estoque_escolas',
          'estoque_lotes',
          'pedidos_itens',
          'pedidos',
          'contrato_produtos',
          'contratos',
          'escola_modalidades',
          'escolas',
          'produtos',
          'tenant_users',
          'tenant_configurations',
          'tenants'
        ];

        for (const table of tables) {
          await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
        }
      });
    } catch (error) {
      console.error('Erro ao desprovisionar tenant:', error);
      throw error;
    }
  }

  // Métodos de configuração, usuários e estatísticas continuam...
  // (implementação similar aos métodos acima)

  /**
   * Mapeia dados do banco para objeto Tenant
   */
  private mapTenantFromDb(row: any): Tenant {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      domain: row.domain,
      subdomain: row.subdomain,
      status: row.status,
      settings: row.settings || {},
      limits: row.limits || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Cria configurações padrão para um tenant usando o novo sistema de configuração
   */
  private async createDefaultConfigurations(tenantId: string, settings: any, limits: any): Promise<void> {
    try {
      // Import the configuration service
      const { tenantConfigurationService } = require('./tenantConfigurationService');
      
      // Build complete configuration object
      const configurations = {
        features: settings.features || {},
        branding: settings.branding || {},
        notifications: settings.notifications || {},
        integrations: settings.integrations || {},
        limits: limits || {}
      };

      // Create initial configuration version
      await tenantConfigurationService.updateTenantConfiguration(
        tenantId,
        configurations,
        {
          description: 'Initial tenant configuration',
          userId: null
        }
      );
    } catch (error) {
      console.error('Error creating default configurations:', error);
      // Fallback to old method if new system fails
      await this.createDefaultConfigurationsLegacy(tenantId, settings, limits);
    }
  }

  /**
   * Método legado para criar configurações (fallback)
   */
  private async createDefaultConfigurationsLegacy(tenantId: string, settings: any, limits: any): Promise<void> {
    const configs = [
      // Features
      { category: 'features', key: 'inventory', value: settings.features?.inventory || true },
      { category: 'features', key: 'contracts', value: settings.features?.contracts || true },
      { category: 'features', key: 'deliveries', value: settings.features?.deliveries || true },
      { category: 'features', key: 'reports', value: settings.features?.reports || true },
      { category: 'features', key: 'mobile', value: settings.features?.mobile || true },
      { category: 'features', key: 'analytics', value: settings.features?.analytics || false },
      
      // Limits
      { category: 'limits', key: 'maxUsers', value: limits.maxUsers || 100 },
      { category: 'limits', key: 'maxSchools', value: limits.maxSchools || 50 },
      { category: 'limits', key: 'maxProducts', value: limits.maxProducts || 1000 },
      { category: 'limits', key: 'storageLimit', value: limits.storageLimit || 1024 },
      { category: 'limits', key: 'apiRateLimit', value: limits.apiRateLimit || 100 },
      
      // Branding
      { category: 'branding', key: 'primaryColor', value: settings.branding?.primaryColor || '#1976d2' },
      { category: 'branding', key: 'secondaryColor', value: settings.branding?.secondaryColor || '#dc004e' },
      
      // Notifications
      { category: 'notifications', key: 'email', value: settings.notifications?.email || true },
      { category: 'notifications', key: 'sms', value: settings.notifications?.sms || false },
      { category: 'notifications', key: 'push', value: settings.notifications?.push || true },
      
      // Integrations
      { category: 'integrations', key: 'whatsapp', value: settings.integrations?.whatsapp || false },
      { category: 'integrations', key: 'email', value: settings.integrations?.email || true },
      { category: 'integrations', key: 'sms', value: settings.integrations?.sms || false }
    ];

    for (const config of configs) {
      await db.query(`
        INSERT INTO tenant_configurations (tenant_id, category, key, value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, category, key) DO NOTHING
      `, [tenantId, config.category, config.key, JSON.stringify(config.value)]);
    }
  }

  /**
   * Log de operações de tenant para auditoria
   */
  private async logTenantOperation(
    operation: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    userId?: number
  ): Promise<void> {
    try {
      await db.query(`
        INSERT INTO tenant_audit_log (
          tenant_id, operation, entity_type, entity_id, 
          old_values, new_values, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [
        entityType === 'tenants' ? entityId : null,
        operation,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        userId || null
      ]);
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      // Não falhar a operação principal por causa do log
    }
  }

  /**
   * Obtém configurações de um tenant
   */
  async getTenantConfig(tenantId: string, category?: string): Promise<TenantConfiguration[]> {
    try {
      let whereClause = 'WHERE tenant_id = $1';
      const params = [tenantId];

      if (category) {
        whereClause += ' AND category = $2';
        params.push(category);
      }

      const result = await db.query(`
        SELECT 
          id,
          tenant_id as "tenantId",
          category,
          key,
          value,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_configurations 
        ${whereClause}
        ORDER BY category, key
      `, params);

      return result.rows.map(row => ({
        ...row,
        value: JSON.parse(row.value)
      }));
    } catch (error) {
      console.error('Erro ao buscar configurações do tenant:', error);
      return [];
    }
  }

  /**
   * Define configuração de um tenant
   */
  async setTenantConfig(tenantId: string, config: CreateTenantConfigurationInput): Promise<TenantConfiguration> {
    try {
      const result = await db.query(`
        INSERT INTO tenant_configurations (tenant_id, category, key, value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, category, key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
        RETURNING 
          id,
          tenant_id as "tenantId",
          category,
          key,
          value,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [tenantId, config.category, config.key, JSON.stringify(config.value)]);

      const configuration = result.rows[0];
      return {
        ...configuration,
        value: JSON.parse(configuration.value)
      };
    } catch (error) {
      console.error('Erro ao definir configuração do tenant:', error);
      throw error;
    }
  }

  /**
   * Atualiza configuração de um tenant
   */
  async updateTenantConfig(configId: string, data: UpdateTenantConfigurationInput): Promise<TenantConfiguration> {
    try {
      const result = await db.query(`
        UPDATE tenant_configurations 
        SET value = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING 
          id,
          tenant_id as "tenantId",
          category,
          key,
          value,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [JSON.stringify(data.value), configId]);

      if (result.rows.length === 0) {
        throw new Error('Configuração não encontrada');
      }

      const configuration = result.rows[0];
      return {
        ...configuration,
        value: JSON.parse(configuration.value)
      };
    } catch (error) {
      console.error('Erro ao atualizar configuração do tenant:', error);
      throw error;
    }
  }

  /**
   * Remove configuração de um tenant
   */
  async deleteTenantConfig(configId: string): Promise<void> {
    try {
      const result = await db.query(`
        DELETE FROM tenant_configurations WHERE id = $1
        RETURNING id
      `, [configId]);

      if (result.rows.length === 0) {
        throw new Error('Configuração não encontrada');
      }
    } catch (error) {
      console.error('Erro ao deletar configuração do tenant:', error);
      throw error;
    }
  }

  /**
   * Obtém usuários de um tenant
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    try {
      const result = await db.query(`
        SELECT 
          tu.id,
          tu.tenant_id as "tenantId",
          tu.user_id as "userId",
          tu.role,
          tu.status,
          tu.created_at as "createdAt",
          tu.updated_at as "updatedAt",
          u.nome as "userName",
          u.email as "userEmail"
        FROM tenant_users tu
        JOIN usuarios u ON tu.user_id = u.id
        WHERE tu.tenant_id = $1
        ORDER BY tu.created_at DESC
      `, [tenantId]);

      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar usuários do tenant:', error);
      return [];
    }
  }

  /**
   * Adiciona usuário a um tenant
   */
  async addTenantUser(data: CreateTenantUserInput): Promise<TenantUser> {
    try {
      // Verificar se usuário já está associado ao tenant
      const existing = await db.query(`
        SELECT id FROM tenant_users 
        WHERE tenant_id = $1 AND user_id = $2
      `, [data.tenantId, data.userId]);

      if (existing.rows.length > 0) {
        throw new Error('Usuário já está associado a este tenant');
      }

      const result = await db.query(`
        INSERT INTO tenant_users (tenant_id, user_id, role, status)
        VALUES ($1, $2, $3, $4)
        RETURNING 
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          role,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, [data.tenantId, data.userId, data.role, data.status]);

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao adicionar usuário ao tenant:', error);
      throw error;
    }
  }

  /**
   * Atualiza usuário de um tenant
   */
  async updateTenantUser(id: string, data: UpdateTenantUserInput): Promise<TenantUser> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.role !== undefined) {
        updateFields.push(`role = $${paramIndex++}`);
        updateValues.push(data.role);
      }
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(data.status);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(id);

      const result = await db.query(`
        UPDATE tenant_users SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          role,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Usuário do tenant não encontrado');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao atualizar usuário do tenant:', error);
      throw error;
    }
  }

  /**
   * Remove usuário de um tenant
   */
  async removeTenantUser(id: string): Promise<void> {
    try {
      const result = await db.query(`
        DELETE FROM tenant_users WHERE id = $1
        RETURNING id
      `, [id]);

      if (result.rows.length === 0) {
        throw new Error('Usuário do tenant não encontrado');
      }
    } catch (error) {
      console.error('Erro ao remover usuário do tenant:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de um tenant
   */
  async getTenantStats(tenantId: string): Promise<TenantStats> {
    try {
      // Buscar estatísticas básicas
      const statsResult = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = $1) as total_users,
          (SELECT COUNT(*) FROM escolas WHERE tenant_id = $1) as total_schools,
          (SELECT COUNT(*) FROM produtos WHERE tenant_id = $1) as total_products,
          (SELECT COUNT(*) FROM contratos WHERE tenant_id = $1) as total_contracts,
          (SELECT COUNT(*) FROM pedidos WHERE tenant_id = $1) as total_orders
      `, [tenantId]);

      const stats = statsResult.rows[0];

      // Buscar estatísticas de uso de storage (aproximado em MB)
      const storageResult = await db.query(`
        SELECT 
          COALESCE(
            SUM(pg_total_relation_size(schemaname||'.'||tablename)) / 1024 / 1024, 
            0
          )::integer as storage_used_mb
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      return {
        totalUsers: parseInt(stats.total_users) || 0,
        activeUsers: parseInt(stats.total_users) || 0, // Implementar lógica real de usuários ativos
        totalSchools: parseInt(stats.total_schools) || 0,
        totalProducts: parseInt(stats.total_products) || 0,
        totalContracts: parseInt(stats.total_contracts) || 0,
        totalOrders: parseInt(stats.total_orders) || 0,
        storageUsed: parseInt(storageResult.rows[0]?.storage_used_mb) || 0,
        apiCallsToday: 0, // Implementar lógica real de API calls
        lastActivity: new Date().toISOString() // Implementar lógica real de última atividade
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do tenant:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalSchools: 0,
        totalProducts: 0,
        totalContracts: 0,
        totalOrders: 0,
        storageUsed: 0,
        apiCallsToday: 0,
        lastActivity: new Date().toISOString()
      };
    }
  }
}

// Instância singleton
export const tenantService = new TenantService();