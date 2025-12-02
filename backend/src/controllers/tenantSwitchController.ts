/**
 * Controller for tenant switching functionality
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { tenantUserService } from '../services/tenantUserService';
import { tenantService } from '../services/tenantService';

const db = require('../database');

export class TenantSwitchController {

  /**
   * Switch user's current tenant context
   */
  async switchTenant(req: Request, res: Response) {
    try {
      const { tenantId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'tenantId é obrigatório'
        });
      }

      // Verificar se o usuário tem acesso ao tenant
      const hasAccess = await tenantUserService.hasUserAccessToTenant(userId, tenantId);
      if (!hasAccess && !req.user?.isSystemAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Usuário não tem acesso ao tenant especificado'
        });
      }

      // Buscar informações do tenant
      console.log('🔍 [SWITCH] Buscando tenant:', tenantId);
      console.log('🔍 [SWITCH] Tipo do tenantId:', typeof tenantId);
      console.log('🔍 [SWITCH] Usuário:', { id: userId, isSystemAdmin: req.user?.isSystemAdmin });
      
      const tenant = await tenantService.getTenant(tenantId);
      console.log('🔍 [SWITCH] Tenant encontrado:', tenant ? 'Sim' : 'Não');
      
      if (!tenant) {
        console.log('❌ [SWITCH] Tenant não encontrado no banco:', tenantId);
        
        // Debug: listar alguns tenants disponíveis
        try {
          const allTenants = await tenantService.listTenants({ status: 'active' });
          console.log('📋 [SWITCH] Tenants disponíveis:', allTenants.length);
          if (allTenants.length > 0) {
            console.log('📋 [SWITCH] Primeiro tenant:', allTenants[0]);
          }
        } catch (debugError) {
          console.error('❌ [SWITCH] Erro ao listar tenants para debug:', debugError);
        }
        
        return res.status(404).json({
          success: false,
          message: 'Tenant não encontrado'
        });
      }

      if (tenant.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Tenant não está ativo'
        });
      }

      // Buscar role do usuário no tenant
      let tenantRole = 'user';
      if (!req.user?.isSystemAdmin) {
        const userRole = await tenantUserService.getUserRoleInTenant(userId, tenantId);
        if (userRole) {
          tenantRole = userRole;
        }
      } else {
        tenantRole = 'tenant_admin'; // System admin has full access
      }

      // Buscar todas as associações do usuário
      const userTenants = await tenantUserService.getUserTenants(userId);

      // Gerar novo token com o tenant atualizado
      const tokenPayload = {
        id: req.user.id,
        tipo: req.user.tipo,
        email: req.user.email,
        nome: req.user.nome,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          role: tenantRole
        },
        tenantRole,
        isSystemAdmin: req.user.isSystemAdmin,
        tenants: userTenants.map(ut => ({
          id: ut.tenantId,
          slug: ut.tenant?.slug,
          name: ut.tenant?.name,
          role: ut.role
        }))
      };

      const newToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '24h' });

      res.json({
        success: true,
        data: {
          token: newToken,
          tenant: {
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            role: tenantRole
          },
          tenantRole,
          message: `Contexto alterado para: ${tenant.name}`
        }
      });
    } catch (error) {
      console.error('Erro ao trocar tenant:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Get available tenants for current user
   */
  async getAvailableTenants(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      // Para desenvolvimento, permitir acesso sem autenticação
      if (!userId && process.env.NODE_ENV === 'development') {
        const allTenants = await tenantService.listTenants({ status: 'active' });
        const availableTenants = allTenants.map(tenant => ({
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          institution_id: tenant.institution_id,
          role: 'tenant_admin',
          status: 'active',
          isSystemAdmin: true
        }));

        return res.json({
          success: true,
          data: {
            currentTenant: null,
            availableTenants,
            isSystemAdmin: true
          }
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      let availableTenants;

      if (req.user?.isSystemAdmin) {
        // System admin can access all active tenants
        const allTenants = await tenantService.listTenants({ status: 'active' });
        availableTenants = allTenants.map(tenant => ({
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          institution_id: tenant.institution_id,
          role: 'tenant_admin',
          status: 'active',
          isSystemAdmin: true
        }));
      } else {
        // Regular user - get their tenant associations
        const userTenants = await tenantUserService.getUserTenants(userId);
        availableTenants = userTenants.map(ut => ({
          id: ut.tenantId,
          slug: ut.tenant?.slug,
          name: ut.tenant?.name,
          institution_id: (ut.tenant as any)?.institution_id,
          role: ut.role,
          status: ut.status,
          isSystemAdmin: false
        }));
      }

      res.json({
        success: true,
        data: {
          currentTenant: req.user?.tenant,
          availableTenants,
          isSystemAdmin: req.user?.isSystemAdmin || false
        }
      });
    } catch (error) {
      console.error('Erro ao buscar tenants disponíveis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Refresh current user's token with updated tenant information
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      // Buscar informações atualizadas do usuário
      const userResult = await db.query(`
        SELECT id, nome, email, tipo, ativo
        FROM usuarios 
        WHERE id = $1 AND ativo = true
      `, [userId]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não encontrado ou inativo'
        });
      }

      const user = userResult.rows[0];

      // Buscar associações de tenant atualizadas
      const userTenants = await tenantUserService.getUserTenants(userId);

      // Determinar tenant atual
      let currentTenant = req.user?.tenant;
      let tenantRole = req.user?.tenantRole || 'user';

      if (currentTenant) {
        // Verificar se ainda tem acesso ao tenant atual
        const currentAssociation = userTenants.find(ut => ut.tenantId === currentTenant.id);
        if (currentAssociation) {
          tenantRole = currentAssociation.role;
          currentTenant.role = tenantRole;
        } else if (!req.user?.isSystemAdmin) {
          // Se perdeu acesso e não é admin, usar primeiro tenant disponível
          if (userTenants.length > 0) {
            const firstTenant = userTenants[0];
            currentTenant = {
              id: firstTenant.tenantId,
              slug: firstTenant.tenant?.slug || '',
              name: firstTenant.tenant?.name || '',
              role: firstTenant.role
            };
            tenantRole = firstTenant.role;
          } else {
            currentTenant = null;
            tenantRole = 'user';
          }
        }
      } else if (userTenants.length > 0 && !req.user?.isSystemAdmin) {
        // Se não tinha tenant, usar o primeiro disponível
        const firstTenant = userTenants[0];
        currentTenant = {
          id: firstTenant.tenantId,
          slug: firstTenant.tenant?.slug || '',
          name: firstTenant.tenant?.name || '',
          role: firstTenant.role
        };
        tenantRole = firstTenant.role;
      }

      // Gerar novo token
      const tokenPayload = {
        id: user.id,
        tipo: user.tipo,
        email: user.email,
        nome: user.nome,
        tenant: currentTenant,
        tenantRole,
        isSystemAdmin: req.user?.isSystemAdmin || false,
        tenants: userTenants.map(ut => ({
          id: ut.tenantId,
          slug: ut.tenant?.slug,
          name: ut.tenant?.name,
          role: ut.role
        }))
      };

      const newToken = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '24h' });

      res.json({
        success: true,
        data: {
          token: newToken,
          user: {
            id: user.id,
            nome: user.nome,
            email: user.email,
            tipo: user.tipo,
            isSystemAdmin: req.user?.isSystemAdmin || false
          },
          tenant: currentTenant,
          tenantRole,
          availableTenants: userTenants.map(ut => ({
            id: ut.tenantId,
            slug: ut.tenant?.slug,
            name: ut.tenant?.name,
            role: ut.role
          }))
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

// Export singleton instance
export const tenantSwitchController = new TenantSwitchController();