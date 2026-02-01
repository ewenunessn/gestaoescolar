/**
 * Controller for managing tenant user associations and roles
 */

import { Request, Response } from 'express';
import { tenantUserService } from '../services/tenantUserService';
import { 
  CreateTenantUserInput, 
  UpdateTenantUserInput, 
  TenantUserFilters 
} from '../types/tenant';

export class TenantUserController {

  /**
   * Create a new tenant user association
   */
  async createTenantUser(req: Request, res: Response) {
    try {
      const input: CreateTenantUserInput = req.body;

      // Validate required fields
      if (!input.tenantId || !input.userId || !input.role) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: userId, role'
        });
      }

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(input.tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      const tenantUser = await tenantUserService.createTenantUser(input);

      res.status(201).json({
        success: true,
        data: tenantUser,
        message: 'Usuário associado ao tenant com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar associação tenant-usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Update a tenant user association
   */
  async updateTenantUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const input: UpdateTenantUserInput = req.body;

      // Get current association to check permissions
      const currentAssociation = await tenantUserService.getTenantUser(id);
      if (!currentAssociation) {
        return res.status(404).json({
          success: false,
          message: 'Associação tenant-usuário não encontrada'
        });
      }

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(currentAssociation.tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      const tenantUser = await tenantUserService.updateTenantUser(id, input);

      res.json({
        success: true,
        data: tenantUser,
        message: 'Associação tenant-usuário atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar associação tenant-usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Delete a tenant user association
   */
  async deleteTenantUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Get current association to check permissions
      const currentAssociation = await tenantUserService.getTenantUser(id);
      if (!currentAssociation) {
        return res.status(404).json({
          success: false,
          message: 'Associação tenant-usuário não encontrada'
        });
      }

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(currentAssociation.tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      // Prevent removing the last tenant admin
      if (currentAssociation.role === 'tenant_admin') {
        const admins = await tenantUserService.getTenantAdmins(currentAssociation.tenantId);
        if (admins.length <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Não é possível remover o último administrador do tenant'
          });
        }
      }

      await tenantUserService.deleteTenantUser(id);

      res.json({
        success: true,
        message: 'Associação tenant-usuário removida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover associação tenant-usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Get a tenant user association by ID
   */
  async getTenantUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tenantUser = await tenantUserService.getTenantUser(id);
      if (!tenantUser) {
        return res.status(404).json({
          success: false,
          message: 'Associação tenant-usuário não encontrada'
        });
      }

      // Check if user has permission to view users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && 
          !req.tenantAuth?.canAccessTenant(tenantUser.tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para visualizar usuários neste tenant'
        });
      }

      res.json({
        success: true,
        data: tenantUser
      });
    } catch (error) {
      console.error('Erro ao buscar associação tenant-usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * List tenant users with filters
   */
  async listTenantUsers(req: Request, res: Response) {
    try {
      const filters: TenantUserFilters = {
        tenantId: req.query.tenantId as string,
        role: req.query.role as any,
        status: req.query.status as any,
        search: req.query.search as string
      };

      // If not system admin, filter by accessible tenants
      if (!req.tenantAuth?.isSystemAdmin()) {
        if (filters.tenantId && !req.tenantAuth?.canAccessTenant(filters.tenantId)) {
          return res.status(403).json({
            success: false,
            message: 'Sem permissão para visualizar usuários neste tenant'
          });
        }

        // If no specific tenant requested, show only user's tenants
        if (!filters.tenantId && req.user?.tenants) {
          // This would require a more complex query to filter by multiple tenants
          // For now, require tenantId for non-system admins
          return res.status(400).json({
            success: false,
            message: 'Parâmetro tenantId é obrigatório'
          });
        }
      }

      const tenantUsers = await tenantUserService.listTenantUsers(filters);

      res.json({
        success: true,
        data: tenantUsers,
        count: tenantUsers.length
      });
    } catch (error) {
      console.error('Erro ao listar associações tenant-usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Get users for a specific tenant
   */
  async getTenantUsers(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;

      // Check if user has permission to view users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && 
          !req.tenantAuth?.canAccessTenant(tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para visualizar usuários neste tenant'
        });
      }

      const tenantUsers = await tenantUserService.getTenantUsers(tenantId);

      res.json({
        success: true,
        data: tenantUsers,
        count: tenantUsers.length
      });
    } catch (error) {
      console.error('Erro ao buscar usuários do tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Get tenants for a specific user
   */
  async getUserTenants(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      // Check if user has permission (system admin or own user)
      if (!req.tenantAuth?.isSystemAdmin() && req.user?.id !== userIdNum) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para visualizar tenants deste usuário'
        });
      }

      const userTenants = await tenantUserService.getUserTenants(userIdNum);

      res.json({
        success: true,
        data: userTenants,
        count: userTenants.length
      });
    } catch (error) {
      console.error('Erro ao buscar tenants do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Promote user to tenant admin
   */
  async promoteToTenantAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      const tenantUser = await tenantUserService.promoteToTenantAdmin(userIdNum);

      res.json({
        success: true,
        data: tenantUser,
        message: 'Usuário promovido a administrador do tenant com sucesso'
      });
    } catch (error) {
      console.error('Erro ao promover usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Demote user from tenant admin
   */
  async demoteFromTenantAdmin(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      // Prevent demoting the last tenant admin
      const admins = await tenantUserService.getTenantAdmins(tenantId);
      if (admins.length <= 1 && admins[0]?.userId === userIdNum) {
        return res.status(400).json({
          success: false,
          message: 'Não é possível rebaixar o último administrador do tenant'
        });
      }

      const tenantUser = await tenantUserService.demoteFromTenantAdmin(userIdNum);

      res.json({
        success: true,
        data: tenantUser,
        message: 'Usuário rebaixado de administrador do tenant com sucesso'
      });
    } catch (error) {
      console.error('Erro ao rebaixar usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Suspend user access to tenant
   */
  async suspendUserAccess(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      const tenantUser = await tenantUserService.suspendUserAccess(userIdNum);

      res.json({
        success: true,
        data: tenantUser,
        message: 'Acesso do usuário ao tenant suspenso com sucesso'
      });
    } catch (error) {
      console.error('Erro ao suspender acesso do usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Restore user access to tenant
   */
  async restoreUserAccess(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      // Check if user has permission to manage users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin(tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para gerenciar usuários neste tenant'
        });
      }

      const tenantUser = await tenantUserService.restoreUserAccess(userIdNum);

      res.json({
        success: true,
        data: tenantUser,
        message: 'Acesso do usuário ao tenant restaurado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao restaurar acesso do usuário:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Get tenant admins
   */
  async getTenantAdmins(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;

      // Check if user has permission to view users in this tenant
      if (!req.tenantAuth?.isSystemAdmin() && 
          !req.tenantAuth?.canAccessTenant(tenantId)) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para visualizar usuários neste tenant'
        });
      }

      const admins = await tenantUserService.getTenantAdmins(tenantId);

      res.json({
        success: true,
        data: admins,
        count: admins.length
      });
    } catch (error) {
      console.error('Erro ao buscar administradores do tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Get current user's tenant context
   */
  async getCurrentUserContext(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const userTenants = await tenantUserService.getUserTenants(req.user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            nome: req.user.nome,
            email: req.user.email,
            tipo: req.user.tipo,
            isSystemAdmin: req.user.isSystemAdmin
          },
          currentTenant: req.user.tenant,
          tenantRole: req.user.tenantRole,
          availableTenants: userTenants.map(tu => ({
            id: tu.name: tu.tenant?.name,
            slug: tu.tenant?.slug,
            role: tu.role,
            status: tu.status
          })),
          permissions: req.tenantAuth ? {
            canManageUsers: req.tenantAuth.hasPermission('users:create'),
            canManageConfig: req.tenantAuth.hasPermission('tenant:manage_config'),
            canViewReports: req.tenantAuth.hasPermission('reports:read'),
            isSystemAdmin: req.tenantAuth.isSystemAdmin(),
            isTenantAdmin: req.tenantAuth.isTenantAdmin()
          } : {}
        }
      });
    } catch (error) {
      console.error('Erro ao buscar contexto do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Export singleton instance
export const tenantUserController = new TenantUserController();