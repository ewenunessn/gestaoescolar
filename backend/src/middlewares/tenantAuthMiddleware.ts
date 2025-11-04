import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { TenantContext, TenantUserRole } from "../types/tenant";
const db = require("../database");

// Extend Request interface to include tenant authentication context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        nome: string;
        email: string;
        tipo: string;
        tenant?: {
          id: string;
          slug: string;
          name: string;
          role: TenantUserRole;
        };
        tenantRole?: TenantUserRole;
        isSystemAdmin?: boolean;
        tenants?: Array<{
          id: string;
          slug: string;
          name: string;
          role: TenantUserRole;
        }>;
      };
      tenantAuth?: {
        canAccessTenant: (tenantId: string) => boolean;
        hasRole: (role: TenantUserRole, tenantId?: string) => boolean;
        hasPermission: (permission: string, tenantId?: string) => boolean;
        isSystemAdmin: () => boolean;
        isTenantAdmin: (tenantId?: string) => boolean;
      };
    }
  }
}

export interface TenantAuthOptions {
  required?: boolean;
  allowSystemAdmin?: boolean;
  requiredRole?: TenantUserRole;
  requiredPermissions?: string[];
}

/**
 * Enhanced authentication middleware with tenant context validation
 */
export function tenantAuthMiddleware(options: TenantAuthOptions = {}) {
  const {
    required = true,
    allowSystemAdmin = true,
    requiredRole,
    requiredPermissions = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('🔐 [TENANT-AUTH] Middleware executado para:', req.method, req.originalUrl);

      // Em desenvolvimento, permitir acesso sem token se não houver header de autorização
      const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const authHeader = req.headers.authorization;

      console.log('🔐 [TENANT-AUTH] Modo desenvolvimento:', isDevelopment);
      console.log('🔐 [TENANT-AUTH] Header Authorization:', authHeader ? 'Presente' : 'Ausente');

      if (isDevelopment && !authHeader && !required) {
        console.log('🔓 Modo desenvolvimento: Permitindo acesso sem token');
        req.user = { 
          id: 1, 
          nome: 'Usuário Dev', 
          email: 'dev@sistema.com',
          tipo: 'admin',
          isSystemAdmin: true
        };
        req.tenantAuth = createTenantAuthHelpers(req.user);
        return next();
      }

      // Se há header de autorização, validar o token
      if (!authHeader) {
        if (!required) {
          return next();
        }
        return res.status(401).json({
          success: false,
          message: "Token de autorização não fornecido."
        });
      }

      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
          success: false,
          message: "Formato de token inválido. Use: Bearer <token>"
        });
      }

      const token = parts[1];

      // Verificar se é um token de gestor (legacy)
      if (token.startsWith('gestor_')) {
        console.log('🔓 Token de gestor detectado:', token);
        const tokenParts = token.split('_');
        const escolaId = tokenParts[1];
        req.user = {
          id: parseInt(escolaId) || 1,
          nome: 'Gestor Escola',
          email: 'gestor@escola.com',
          tipo: 'gestor',
          tenantRole: 'user'
        };
        req.tenantAuth = createTenantAuthHelpers(req.user);
        return next();
      }

      try {
        console.log('🔐 [TENANT-AUTH] Validando JWT com secret:', config.jwtSecret);
        const decoded = jwt.verify(token, config.jwtSecret) as any;
        console.log('✅ [TENANT-AUTH] Token decodificado:', { 
          id: decoded.id, 
          tipo: decoded.tipo,
          tenant: decoded.tenant?.slug,
          tenantRole: decoded.tenantRole,
          isSystemAdmin: decoded.isSystemAdmin
        });

        // Validar se o usuário ainda existe e está ativo
        const userResult = await db.query(`
          SELECT id, nome, email, tipo, ativo
          FROM usuarios 
          WHERE id = $1 AND ativo = true
        `, [decoded.id]);

        if (userResult.rows.length === 0) {
          return res.status(401).json({
            success: false,
            message: "Usuário não encontrado ou inativo."
          });
        }

        const user = userResult.rows[0];

        // Validar associações de tenant se não for admin do sistema
        if (!decoded.isSystemAdmin && decoded.tenant) {
          const tenantAssociation = await db.query(`
            SELECT 
              tu.role,
              tu.status,
              t.status as tenant_status
            FROM tenant_users tu
            JOIN tenants t ON tu.tenant_id = t.id
            WHERE tu.user_id = $1 AND tu.tenant_id = $2
          `, [decoded.id, decoded.tenant.id]);

          if (tenantAssociation.rows.length === 0) {
            return res.status(403).json({
              success: false,
              message: "Usuário não tem acesso ao tenant especificado."
            });
          }

          const association = tenantAssociation.rows[0];
          if (association.status !== 'active' || association.tenant_status !== 'active') {
            return res.status(403).json({
              success: false,
              message: "Acesso ao tenant foi revogado ou tenant está inativo."
            });
          }

          // Atualizar role se mudou
          if (association.role !== decoded.tenantRole) {
            decoded.tenantRole = association.role;
            decoded.tenant.role = association.role;
          }
        }

        // Configurar contexto do usuário
        req.user = {
          id: decoded.id,
          nome: decoded.nome,
          email: decoded.email,
          tipo: decoded.tipo,
          tenant: decoded.tenant,
          tenantRole: decoded.tenantRole,
          isSystemAdmin: decoded.isSystemAdmin,
          tenants: decoded.tenants
        };

        // Criar helpers de autorização
        req.tenantAuth = createTenantAuthHelpers(req.user);

        // Validar role obrigatório
        if (requiredRole && !req.tenantAuth.hasRole(requiredRole)) {
          return res.status(403).json({
            success: false,
            message: `Role necessário: ${requiredRole}`
          });
        }

        // Validar permissões obrigatórias
        for (const permission of requiredPermissions) {
          if (!req.tenantAuth.hasPermission(permission)) {
            return res.status(403).json({
              success: false,
              message: `Permissão necessária: ${permission}`
            });
          }
        }

        next();
      } catch (jwtError: any) {
        console.error('❌ Erro de validação JWT:', jwtError.message);

        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: "Token expirado. Faça login novamente."
          });
        }

        if (jwtError.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            message: "Token inválido."
          });
        }

        return res.status(401).json({
          success: false,
          message: "Erro na validação do token."
        });
      }
    } catch (error) {
      console.error('❌ Erro no middleware de autenticação tenant:', error);
      return res.status(500).json({
        success: false,
        message: "Erro interno de autenticação."
      });
    }
  };
}

/**
 * Middleware que requer autenticação
 */
export function requireAuth() {
  return tenantAuthMiddleware({ required: true });
}

/**
 * Middleware que requer role de administrador do tenant
 */
export function requireTenantAdmin() {
  return tenantAuthMiddleware({ 
    required: true, 
    requiredRole: 'tenant_admin' 
  });
}

/**
 * Middleware que requer administrador do sistema
 */
export function requireSystemAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const middleware = tenantAuthMiddleware({ required: true });
    middleware(req, res, (err) => {
      if (err) return next(err);
      
      if (!req.tenantAuth?.isSystemAdmin()) {
        return res.status(403).json({
          success: false,
          message: "Acesso restrito a administradores do sistema."
        });
      }
      
      next();
    });
  };
}

/**
 * Middleware que requer permissões específicas
 */
export function requirePermissions(...permissions: string[]) {
  return tenantAuthMiddleware({ 
    required: true, 
    requiredPermissions: permissions 
  });
}

/**
 * Middleware que permite acesso a administradores do sistema ou do tenant
 */
export function requireAdminAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const middleware = tenantAuthMiddleware({ required: true });
    middleware(req, res, (err) => {
      if (err) return next(err);
      
      if (!req.tenantAuth?.isSystemAdmin() && !req.tenantAuth?.isTenantAdmin()) {
        return res.status(403).json({
          success: false,
          message: "Acesso restrito a administradores."
        });
      }
      
      next();
    });
  };
}

/**
 * Cria helpers de autorização para o contexto do usuário
 */
function createTenantAuthHelpers(user: any) {
  return {
    canAccessTenant: (tenantId: string): boolean => {
      if (user.isSystemAdmin) return true;
      if (!user.tenants) return false;
      return user.tenants.some((t: any) => t.id === tenantId);
    },

    hasRole: (role: TenantUserRole, tenantId?: string): boolean => {
      if (user.isSystemAdmin) return true;
      
      if (tenantId) {
        const tenant = user.tenants?.find((t: any) => t.id === tenantId);
        return tenant?.role === role;
      }
      
      return user.tenantRole === role;
    },

    hasPermission: (permission: string, tenantId?: string): boolean => {
      if (user.isSystemAdmin) return true;
      
      let role = user.tenantRole;
      if (tenantId) {
        const tenant = user.tenants?.find((t: any) => t.id === tenantId);
        role = tenant?.role;
      }
      
      const permissions = getTenantPermissions(role || 'user');
      return permissions.includes(permission);
    },

    isSystemAdmin: (): boolean => {
      return user.isSystemAdmin === true;
    },

    isTenantAdmin: (tenantId?: string): boolean => {
      if (user.isSystemAdmin) return true;
      
      if (tenantId) {
        const tenant = user.tenants?.find((t: any) => t.id === tenantId);
        return tenant?.role === 'tenant_admin';
      }
      
      return user.tenantRole === 'tenant_admin';
    }
  };
}

/**
 * Obtém permissões baseadas no role do tenant
 */
function getTenantPermissions(role: TenantUserRole): string[] {
  const permissions: Record<TenantUserRole, string[]> = {
    tenant_admin: [
      'tenant:read',
      'tenant:update',
      'tenant:manage_users',
      'tenant:manage_config',
      'schools:create',
      'schools:read',
      'schools:update',
      'schools:delete',
      'products:create',
      'products:read',
      'products:update',
      'products:delete',
      'inventory:create',
      'inventory:read',
      'inventory:update',
      'inventory:delete',
      'contracts:create',
      'contracts:read',
      'contracts:update',
      'contracts:delete',
      'orders:create',
      'orders:read',
      'orders:update',
      'orders:delete',
      'reports:read',
      'reports:export',
      'users:create',
      'users:read',
      'users:update',
      'users:delete'
    ],
    user: [
      'schools:read',
      'products:read',
      'inventory:read',
      'inventory:update',
      'contracts:read',
      'orders:read',
      'orders:create',
      'orders:update',
      'reports:read'
    ],
    viewer: [
      'schools:read',
      'products:read',
      'inventory:read',
      'contracts:read',
      'orders:read',
      'reports:read'
    ]
  };

  return permissions[role] || permissions.viewer;
}

/**
 * Utilitário para verificar se o usuário pode acessar um tenant específico
 */
export function canAccessTenant(req: Request, tenantId: string): boolean {
  return req.tenantAuth?.canAccessTenant(tenantId) || false;
}

/**
 * Utilitário para verificar se o usuário tem um role específico
 */
export function hasRole(req: Request, role: TenantUserRole, tenantId?: string): boolean {
  return req.tenantAuth?.hasRole(role, tenantId) || false;
}

/**
 * Utilitário para verificar se o usuário tem uma permissão específica
 */
export function hasPermission(req: Request, permission: string, tenantId?: string): boolean {
  return req.tenantAuth?.hasPermission(permission, tenantId) || false;
}

/**
 * Utilitário para verificar se o usuário é administrador do sistema
 */
export function isSystemAdmin(req: Request): boolean {
  return req.tenantAuth?.isSystemAdmin() || false;
}

/**
 * Utilitário para verificar se o usuário é administrador do tenant
 */
export function isTenantAdmin(req: Request, tenantId?: string): boolean {
  return req.tenantAuth?.isTenantAdmin(tenantId) || false;
}