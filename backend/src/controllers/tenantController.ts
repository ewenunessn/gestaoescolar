/**
 * Controller para gerenciamento de tenants
 * Endpoints para CRUD e operações de tenant
 */

import { Request, Response } from 'express';
import { tenantService } from '../services/tenantService';
import { tenantResolver } from '../services/tenantResolver';
import { 
  tenantCreateSchema,
  tenantUpdateSchema,
  tenantProvisioningSchema
} from '../schemas';

/**
 * Lista todos os tenants
 */
export async function listTenants(req: Request, res: Response) {
  try {
    const { status, search, createdAfter, createdBefore } = req.query;

    const filters = {
      status: status as any,
      search: search as string,
      createdAfter: createdAfter as string,
      createdBefore: createdBefore as string
    };

    const tenants = await tenantService.listTenants(filters);

    res.json({
      success: true,
      data: tenants,
      total: tenants.length
    });
  } catch (error) {
    console.error('Erro ao listar tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar tenants',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Busca tenant por ID
 */
export async function getTenant(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const tenant = await tenantService.getTenant(id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('Erro ao buscar tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Cria novo tenant
 */
export async function createTenant(req: Request, res: Response) {
  try {
    // Validar dados de entrada
    const validatedData = tenantCreateSchema.parse(req.body);

    const tenant = await tenantService.createTenant(validatedData as any);

    res.status(201).json({
      success: true,
      message: 'Tenant criado com sucesso',
      data: tenant
    });
  } catch (error) {
    console.error('Erro ao criar tenant:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao criar tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Atualiza tenant existente
 */
export async function updateTenant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Validar dados de entrada
    const validatedData = tenantUpdateSchema.parse(req.body);

    const tenant = await tenantService.updateTenant(id, validatedData as any);

    res.json({
      success: true,
      message: 'Tenant atualizado com sucesso',
      data: tenant
    });
  } catch (error) {
    console.error('Erro ao atualizar tenant:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Remove tenant
 */
export async function deleteTenant(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await tenantService.deleteTenant(id);

    res.json({
      success: true,
      message: 'Tenant removido com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Provisiona novo tenant completo
 */
export async function provisionTenant(req: Request, res: Response) {
  try {
    // Validar dados de entrada
    const validatedData = tenantProvisioningSchema.parse(req.body);

    const result = await tenantService.provisionTenant(validatedData as any);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Tenant provisionado com sucesso',
        data: result,
        warnings: result.warnings
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro no provisionamento do tenant',
        errors: result.errors,
        warnings: result.warnings
      });
    }
  } catch (error) {
    console.error('Erro ao provisionar tenant:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao provisionar tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Testa resolução de tenant
 */
export async function testTenantResolution(req: Request, res: Response) {
  try {
    const { method, identifier } = req.query;

    if (!method || !identifier) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros method e identifier são obrigatórios'
      });
    }

    const result = await tenantResolver.resolve(method as string, identifier as string);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao testar resolução de tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar resolução de tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Resolve tenant automaticamente baseado no contexto da requisição
 */
export async function resolveTenant(req: Request, res: Response) {
  try {
    console.log('🔍 [RESOLVE-TENANT] Iniciando resolução de tenant');
    console.log('🔍 [RESOLVE-TENANT] Headers:', {
      'x-tenant-id': req.headers['x-tenant-id'],
      'host': req.get('host'),
      'authorization': req.headers.authorization ? 'Present' : 'Absent'
    });
    
    // Tentar resolver por diferentes métodos
    let tenant = null;
    let method = null;

    // 1. Tentar por header X-Tenant-ID
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader) {
      console.log('🔍 [RESOLVE-TENANT] Tentando resolver por header X-Tenant-ID:'Header);
      // Primeiro tentar por ID (UUID), depois por slug
      tenant = await tenantService.getTenant(tenantIdHeader);
      if (!tenant) {
        console.log('🔍 [RESOLVE-TENANT] Não encontrado por ID, tentando por slug');
        tenant = await tenantService.getTenantBySlug(tenantIdHeader);
      }
      if (tenant) {
        console.log('✅ [RESOLVE-TENANT] Tenant encontrado por header:', tenant.name);
        method = 'header';
      } else {
        console.log('❌ [RESOLVE-TENANT] Tenant não encontrado por header');
      }
    }

    // 2. Tentar por subdomínio
    if (!tenant) {
      const host = req.get('host') || '';
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
        tenant = await tenantService.getTenantBySubdomain(subdomain);
        if (tenant) {
          method = 'subdomain';
        }
      }
    }

    // 3. Tentar por token JWT (se disponível)
    if (!tenant && req.user?.tenant) {
      console.log('🔍 [RESOLVE-TENANT] Tentando resolver por token JWT:', req.user.tenant.name);
      tenant = req.user.tenant;
      method = 'token';
    }

    console.log('🔍 [RESOLVE-TENANT] Resultado final:', {
      tenant: tenant ? tenant.name : null,
      method: tenant ? tenant.id : null
    });

    res.json({
      success: true,
      data: {
        tenant,
        method,
        error: tenant ? null : 'Tenant não encontrado'
      }
    });
  } catch (error) {
    console.error('Erro ao resolver tenant:', error);
    res.json({
      success: false,
      data: {
        tenant: null,
        method: null,
        error: error instanceof Error ? error.message : 'Erro ao resolver tenant'
      }
    });
  }
}

/**
 * Obtém contexto atual do tenant
 */
export async function getCurrentTenantContext(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      data: {
        tenant: req.tenant || null,
        tenantContext: req.tenantContext || null,
        hasContext: !!req.tenant
      }
    });
  } catch (error) {
    console.error('Erro ao obter contexto do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter contexto do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Obtém configurações de um tenant
 */
export async function getTenantConfigurations(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { category } = req.query;

    const configurations = await tenantService.getTenantConfig(id, category as string);

    res.json({
      success: true,
      data: configurations,
      total: configurations.length
    });
  } catch (error) {
    console.error('Erro ao buscar configurações do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar configurações do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Define configuração de um tenant
 */
export async function setTenantConfiguration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { category, key, value } = req.body;

    const configuration = await tenantService.setTenantConfig(id, {
      tenantId: id,
      category,
      key,
      value
    });

    res.json({
      success: true,
      message: 'Configuração definida com sucesso',
      data: configuration
    });
  } catch (error) {
    console.error('Erro ao definir configuração do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao definir configuração do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Atualiza configuração de um tenant
 */
export async function updateTenantConfiguration(req: Request, res: Response) {
  try {
    const { configId } = req.params;
    const { value } = req.body;

    const configuration = await tenantService.updateTenantConfig(configId, { value });

    res.json({
      success: true,
      message: 'Configuração atualizada com sucesso',
      data: configuration
    });
  } catch (error) {
    console.error('Erro ao atualizar configuração do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar configuração do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Remove configuração de um tenant
 */
export async function deleteTenantConfiguration(req: Request, res: Response) {
  try {
    const { configId } = req.params;

    await tenantService.deleteTenantConfig(configId);

    res.json({
      success: true,
      message: 'Configuração removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover configuração do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover configuração do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Lista usuários de um tenant
 */
export async function getTenantUsers(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const users = await tenantService.getTenantUsers(id);

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Erro ao buscar usuários do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuários do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Adiciona usuário a um tenant
 */
export async function addTenantUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { userId, role, status } = req.body;

    const tenantUser = await tenantService.addTenantUser({
      tenantId: id,
      userId,
      role: role || 'user',
      status: status || 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Usuário adicionado ao tenant com sucesso',
      data: tenantUser
    });
  } catch (error) {
    console.error('Erro ao adicionar usuário ao tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao adicionar usuário ao tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Atualiza usuário de um tenant
 */
export async function updateTenantUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { role, status } = req.body;

    const tenantUser = await tenantService.updateTenantUser(userId, {
      role,
      status
    });

    res.json({
      success: true,
      message: 'Usuário do tenant atualizado com sucesso',
      data: tenantUser
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Remove usuário de um tenant
 */
export async function removeTenantUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    await tenantService.removeTenantUser(userId);

    res.json({
      success: true,
      message: 'Usuário removido do tenant com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover usuário do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao remover usuário do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Obtém estatísticas de um tenant
 */
export async function getTenantStats(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const stats = await tenantService.getTenantStats(id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar estatísticas do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Desprovisiona um tenant completamente
 */
export async function deprovisionTenant(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { confirm } = req.body;

    // Verificar confirmação
    if (!confirm || confirm !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Confirmação necessária. Envie { "confirm": "DELETE" } para confirmar a operação.'
      });
    }

    // Verificar se tenant existe
    const tenant = await tenantService.getTenant(id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant não encontrado'
      });
    }

    // Desprovisionar tenant
    await tenantService.deprovisionTenant(id);

    res.json({
      success: true,
      message: `Tenant '${tenant.name}' desprovisionado com sucesso`
    });
  } catch (error) {
    console.error('Erro ao desprovisionar tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao desprovisionar tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

/**
 * Ativa ou desativa um tenant
 */
export async function toggleTenantStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: active, inactive ou suspended'
      });
    }

    const tenant = await tenantService.updateTenant(id, { status });

    res.json({
      success: true,
      message: `Status do tenant alterado para '${status}' com sucesso`,
      data: tenant
    });
  } catch (error) {
    console.error('Erro ao alterar status do tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar status do tenant',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}