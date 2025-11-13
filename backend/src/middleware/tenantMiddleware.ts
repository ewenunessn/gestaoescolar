/**
 * Middleware de tenant para identificação e contexto
 * Resolve o tenant baseado em diferentes métodos e injeta no contexto da requisição
 */

import { Request, Response, NextFunction } from 'express';
import { Tenant, TenantContext, TenantNotFoundError, TenantInactiveError } from '../types/tenant';
import { tenantResolver } from '../services/tenantResolver';
const db = require('../database');

// Estender interface Request para incluir tenant context
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantContext?: TenantContext;
    }
  }
}

export interface TenantMiddlewareOptions {
  required?: boolean; // Se true, rejeita requisições sem tenant
  fallbackToDefault?: boolean; // Se true, usa tenant padrão quando não encontrar
  skipPaths?: string[]; // Caminhos que não precisam de tenant
}

/**
 * Middleware principal de tenant
 */
export function tenantMiddleware(options: TenantMiddlewareOptions = {}) {
  const {
    required = true,
    fallbackToDefault = true,
    skipPaths = ['/health', '/api/test-db', '/api/tenants']
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`\n🔍 [TENANT MIDDLEWARE] ${req.method} ${req.path}`);
      
      // Verificar se o path deve ser ignorado
      if (skipPaths.some(path => req.path.startsWith(path))) {
        console.log('⏭️ Path ignorado pelo middleware de tenant');
        return next();
      }

      // Tentar resolver tenant por diferentes métodos
      let tenant: Tenant | null = null;
      let method: string | null = null;

      // 1. Tentar por header X-Tenant-ID PRIMEIRO (maior prioridade para troca de tenant)
      const tenantHeader = req.get('X-Tenant-ID');
      if (tenantHeader) {
        console.log('🔍 Tentando resolver por header X-Tenant-ID:', tenantHeader);
        const result = await tenantResolver.resolve('header', tenantHeader);
        if (result.tenant) {
          tenant = result.tenant;
          method = 'header';
          console.log('✅ Tenant resolvido por header:', tenant.name);
        } else {
          console.log('❌ Não foi possível resolver tenant por header');
        }
      }

      // 2. Tentar por subdomínio (se não resolveu por header)
      if (!tenant) {
        const host = req.get('host') || '';
        const subdomain = extractSubdomain(host);
        if (subdomain && subdomain !== 'www') {
          const result = await tenantResolver.resolve('subdomain', subdomain);
          if (result.tenant) {
            tenant = result.tenant;
            method = 'subdomain';
          }
        }
      }

      // 3. Tentar por token JWT (fallback se não tem header)
      if (!tenant) {
        const authHeader = req.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          console.log('🔍 Tentando resolver por token JWT');
          const result = await tenantResolver.resolve('token', token);
          if (result.tenant) {
            tenant = result.tenant;
            method = 'token';
            console.log('✅ Tenant resolvido por token:', tenant.name);
          } else {
            console.log('❌ Não foi possível resolver tenant por token');
          }
        }
      }

      // 4. Tentar por domínio customizado
      if (!tenant) {
        const result = await tenantResolver.resolve('domain', host);
        if (result.tenant) {
          tenant = result.tenant;
          method = 'domain';
        }
      }

      // 5. Fallback para tenant padrão se permitido (APENAS para rotas públicas)
      if (!tenant && fallbackToDefault) {
        console.log('🔄 Usando fallback para tenant padrão (apenas para rotas públicas)');
        const result = await tenantResolver.resolve('header', '00000000-0000-0000-0000-000000000000');
        if (result.tenant) {
          tenant = result.tenant;
          method = 'fallback';
          console.log('✅ Tenant resolvido por fallback:', tenant.name);
        } else {
          console.log('❌ Fallback falhou, tentando query direta');
          // Fallback final: buscar diretamente no banco
          try {
            const db = require('../database');
            const fallbackResult = await db.query(`
              SELECT id, slug, name, settings, status, created_at as "createdAt", updated_at as "updatedAt"
              FROM tenants 
              WHERE id = '00000000-0000-0000-0000-000000000000'
              LIMIT 1
            `);
            if (fallbackResult.rows.length > 0) {
              tenant = {
                id: fallbackResult.rows[0].id,
                slug: fallbackResult.rows[0].slug,
                name: fallbackResult.rows[0].name,
                status: fallbackResult.rows[0].status,
                settings: fallbackResult.rows[0].settings || {},
                limits: fallbackResult.rows[0].limits || {
                  maxUsers: 100,
                  maxSchools: 50,
                  maxProducts: 1000,
                  storageLimit: 1024,
                  apiRateLimit: 100,
                  maxContracts: 50,
                  maxOrders: 1000
                },
                createdAt: fallbackResult.rows[0].createdAt,
                updatedAt: fallbackResult.rows[0].updatedAt
              };
              method = 'fallback-direct';
              console.log('✅ Tenant resolvido por query direta:', tenant.name);
            }
          } catch (dbError) {
            console.error('❌ Erro ao buscar tenant padrão:', dbError);
          }
        }
      }

      // Verificar se tenant é obrigatório
      if (!tenant && required) {
        console.log('❌ Tenant não encontrado e é obrigatório');
        console.log('Detalhes:', {
          host,
          subdomain,
          hasHeader: !!req.get('X-Tenant-ID'),
          hasToken: !!req.get('Authorization'),
          required,
          fallbackToDefault
        });
        return res.status(400).json({
          success: false,
          error: 'TENANT_NOT_FOUND',
          message: 'Tenant não identificado. Verifique o subdomínio, header X-Tenant-ID ou token.',
          details: {
            host,
            subdomain,
            hasHeader: !!req.get('X-Tenant-ID'),
            hasToken: !!req.get('Authorization')
          }
        });
      }

      // Se encontrou tenant, validar status e configurar contexto
      if (tenant) {
        console.log(`✅ Tenant encontrado: ${tenant.name} via ${method}`);
        
        // Validar status do tenant
        tenantResolver.validateTenantStatus(tenant);

        // Configurar contexto do tenant na requisição
        req.tenant = tenant;
        req.tenantContext = await createTenantContext(tenant, req);

        // Configurar contexto do tenant no banco de dados
        await setDatabaseTenantContext(tenant.id);

        console.log(`🏢 Tenant configurado: ${tenant.name} (${tenant.id})`);
      } else {
        console.log('⚠️ Nenhum tenant foi resolvido, mas não é obrigatório');
      }

      next();
    } catch (error) {
      console.error('❌ Erro no middleware de tenant:', error);

      if (error instanceof TenantNotFoundError) {
        return res.status(404).json({
          success: false,
          error: 'TENANT_NOT_FOUND',
          message: error.message
        });
      }

      if (error instanceof TenantInactiveError) {
        return res.status(403).json({
          success: false,
          error: 'TENANT_INACTIVE',
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        error: 'TENANT_RESOLUTION_ERROR',
        message: 'Erro interno na resolução de tenant'
      });
    }
  };
}

/**
 * Middleware para endpoints que requerem tenant específico
 */
export function requireTenant() {
  return tenantMiddleware({ required: true, fallbackToDefault: false });
}

/**
 * Middleware para endpoints que podem funcionar sem tenant
 */
export function optionalTenant() {
  return tenantMiddleware({ required: false, fallbackToDefault: true });
}

/**
 * Middleware para endpoints administrativos (sem tenant)
 */
export function noTenant() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Limpar qualquer contexto de tenant
    req.tenant = undefined;
    req.tenantContext = undefined;
    next();
  };
}

/**
 * Extrai subdomínio do host
 */
function extractSubdomain(host: string): string | null {
  // Remove porta se presente
  const hostname = host.split(':')[0];
  
  // Dividir por pontos
  const parts = hostname.split('.');
  
  // Se tem pelo menos 3 partes (subdomain.domain.tld), retorna a primeira
  if (parts.length >= 3) {
    return parts[0];
  }
  
  // Para localhost ou IPs, não há subdomínio
  return null;
}

/**
 * Cria contexto completo do tenant
 */
async function createTenantContext(tenant: Tenant, req: Request): Promise<TenantContext> {
  // Extrair informações do usuário se autenticado
  let user: any = undefined;
  let permissions: string[] = [];

  // Se há token JWT, extrair informações do usuário
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/config');
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwtSecret);
      
      if (decoded.id) {
        // Usar informações do token se disponíveis (novo formato)
        if (decoded.tenant && decoded.tenantRole) {
          user = {
            id: decoded.id,
            nome: decoded.nome,
            email: decoded.email,
            tipo: decoded.tipo,
            tenant_role: decoded.tenantRole,
            tenant_status: 'active'
          };
          permissions = getTenantPermissions(decoded.tenantRole);
        } else {
          // Fallback para buscar no banco (formato antigo)
          const userResult = await db.query(`
            SELECT 
              u.id,
              u.nome,
              u.email,
              u.tipo,
              tu.role as tenant_role,
              tu.status as tenant_status
            FROM usuarios u
            LEFT JOIN tenant_users tu ON (u.id = tu.user_id AND tu.tenant_id = $1)
            WHERE u.id = $2
          `, [tenant.id, decoded.id]);

          if (userResult.rows.length > 0) {
            user = userResult.rows[0];
            
            // Definir permissões baseadas no role do tenant
            permissions = getTenantPermissions(user.tenant_role || 'user');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao extrair usuário do token:', error);
    }
  }

  return {
    tenantId: tenant.id,
    tenant,
    user,
    permissions,
    settings: tenant.settings,
    limits: tenant.limits
  };
}

/**
 * Configura contexto do tenant no banco de dados usando RLS
 */
async function setDatabaseTenantContext(tenantId: string): Promise<void> {
  try {
    // Usar a função RLS para definir contexto de tenant
    await db.query(`SELECT set_tenant_context($1)`, [tenantId]);
  } catch (error) {
    console.error('Erro ao configurar contexto do tenant no banco:', error);
    // Fallback para método anterior se a função RLS falhar
    try {
      await db.query(`SET app.current_tenant_id = $1`, [tenantId]);
    } catch (fallbackError) {
      console.error('Erro no fallback de contexto do tenant:', fallbackError);
    }
  }
}

/**
 * Obtém permissões baseadas no role do tenant
 */
function getTenantPermissions(role: string): string[] {
  const permissions: Record<string, string[]> = {
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
      'reports:export'
    ],
    user: [
      'schools:read',
      'products:read',
      'inventory:read',
      'inventory:update',
      'contracts:read',
      'orders:read',
      'orders:create',
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
 * Utilitário para verificar permissão
 */
export function hasPermission(req: Request, permission: string): boolean {
  return req.tenantContext?.permissions.includes(permission) || false;
}

/**
 * Middleware para verificar permissão específica
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!hasPermission(req, permission)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Permissão necessária: ${permission}`
      });
    }
    next();
  };
}