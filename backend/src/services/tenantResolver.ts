/**
 * Serviço de resolução de tenant
 * Identifica o tenant baseado em diferentes métodos
 */

import { Tenant, TenantResolutionResult, TenantNotFoundError, TenantInactiveError } from '../types/tenant';
const db = require('../database');

export interface TenantResolverInterface {
  resolveBySubdomain(subdomain: string): Promise<Tenant | null>;
  resolveByHeader(tenantId: string): Promise<Tenant | null>;
  resolveByToken(token: string): Promise<Tenant | null>;
  resolveByDomain(domain: string): Promise<Tenant | null>;
  resolve(method: string, identifier: string): Promise<TenantResolutionResult>;
}

export class TenantResolver implements TenantResolverInterface {
  private cache = new Map<string, { tenant: Tenant; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Resolve tenant por subdomínio
   */
  async resolveBySubdomain(subdomain: string): Promise<Tenant | null> {
    try {
      const cacheKey = `subdomain:${subdomain}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          settings,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE subdomain = $1 AND status = 'active'
      `, [subdomain]);

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = this.mapTenantFromDb(result.rows[0]);
      this.setCache(cacheKey, tenant);
      return tenant;
    } catch (error) {
      console.error('Erro ao resolver tenant por subdomínio:', error);
      return null;
    }
  }

  /**
   * Resolve tenant por header X-Tenant-ID
   */
  async resolveByHeader(tenantId: string): Promise<Tenant | null> {
    try {
      console.log('🔍 resolveByHeader chamado com:', tenantId);
      const cacheKey = `header:${tenantId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('✅ Tenant encontrado no cache');
        return cached;
      }

      // Tentar primeiro por slug (string)
      console.log('🔍 Buscando por slug:', tenantId);
      let result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          settings,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE slug = $1
      `, [tenantId]);

      // Se não encontrou por slug, tentar por ID (UUID)
      if (result.rows.length === 0) {
        console.log('❌ Não encontrado por slug, tentando por UUID');
        try {
          result = await db.query(`
            SELECT 
              id,
              slug,
              name,
              settings,
              status,
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM tenants 
            WHERE id = $1::uuid
          `, [tenantId]);
          
          if (result.rows.length > 0) {
            console.log('✅ Tenant encontrado por UUID');
          }
        } catch (uuidError) {
          console.log('❌ Erro ao converter para UUID:', uuidError);
          // Se falhar a conversão para UUID, significa que não é um UUID válido
          // Retorna resultado vazio da busca por slug
        }
      } else {
        console.log('✅ Tenant encontrado por slug');
      }

      if (result.rows.length === 0) {
        console.log('❌ Tenant não encontrado no banco');
        return null;
      }

      const tenant = this.mapTenantFromDb(result.rows[0]);
      this.setCache(cacheKey, tenant);
      console.log('✅ Tenant resolvido:', tenant.name);
      return tenant;
    } catch (error) {
      console.error('❌ Erro ao resolver tenant por header:', error);
      return null;
    }
  }

  /**
   * Resolve tenant por JWT token
   */
  async resolveByToken(token: string): Promise<Tenant | null> {
    try {
      // Implementar decodificação do JWT para extrair tenant_id
      const jwt = require('jsonwebtoken');
      const { config } = require('../config/config');
      const decoded = jwt.verify(token, config.jwtSecret);
      
      // Suportar ambos os formatos: tenant.id (novo) e tenant_id (antigo)
      const tenantId = decoded.tenant?.id || decoded.tenant_id;
      
      if (!tenantId) {
        console.log('⚠️ Token JWT não contém informação de tenant');
        return null;
      }

      console.log('🔍 Resolvendo tenant do token:', tenantId);
      return await this.resolveByHeader(tenantId);
    } catch (error) {
      console.error('Erro ao resolver tenant por token:', error);
      return null;
    }
  }

  /**
   * Resolve tenant por domínio customizado
   */
  async resolveByDomain(domain: string): Promise<Tenant | null> {
    try {
      const cacheKey = `domain:${domain}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const result = await db.query(`
        SELECT 
          id,
          slug,
          name,
          settings,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants 
        WHERE domain = $1 AND status = 'active'
      `, [domain]);

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = this.mapTenantFromDb(result.rows[0]);
      this.setCache(cacheKey, tenant);
      return tenant;
    } catch (error) {
      console.error('Erro ao resolver tenant por domínio:', error);
      return null;
    }
  }

  /**
   * Método principal de resolução com fallback
   */
  async resolve(method: string, identifier: string): Promise<TenantResolutionResult> {
    let tenant: Tenant | null = null;
    let resolvedMethod: string | null = null;
    let error: string | undefined;

    try {
      switch (method) {
        case 'subdomain':
          tenant = await this.resolveBySubdomain(identifier);
          resolvedMethod = tenant ? 'subdomain' : null;
          break;
        case 'header':
          tenant = await this.resolveByHeader(identifier);
          resolvedMethod = tenant ? 'header' : null;
          break;
        case 'token':
          tenant = await this.resolveByToken(identifier);
          resolvedMethod = tenant ? 'token' : null;
          break;
        case 'domain':
          tenant = await this.resolveByDomain(identifier);
          resolvedMethod = tenant ? 'domain' : null;
          break;
        default:
          error = `Método de resolução inválido: ${method}`;
      }

      // Se não encontrou, tentar fallback para tenant padrão
      if (!tenant && method !== 'header') {
        tenant = await this.resolveByHeader('00000000-0000-0000-0000-000000000000');
        resolvedMethod = tenant ? 'fallback' : null;
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido na resolução de tenant';
    }

    return {
      tenant,
      method: resolvedMethod as any,
      error
    };
  }

  /**
   * Valida se o tenant está ativo
   */
  validateTenantStatus(tenant: Tenant): void {
    if (tenant.status !== 'active') {
      throw new TenantInactiveError(tenant.id);
    }
  }

  /**
   * Limpa o cache de tenant
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Obtém tenant do cache
   */
  private getFromCache(key: string): Tenant | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.tenant;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Armazena tenant no cache
   */
  private setCache(key: string, tenant: Tenant): void {
    this.cache.set(key, {
      tenant,
      expires: Date.now() + this.CACHE_TTL
    });
  }

  /**
   * Mapeia dados do banco para objeto Tenant
   */
  private mapTenantFromDb(row: any): Tenant {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      domain: row.domain || null,
      subdomain: row.subdomain || null,
      status: row.status,
      settings: row.settings || {},
      limits: row.limits || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

// Instância singleton
export const tenantResolver = new TenantResolver();