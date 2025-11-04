/**
 * Utilitários para gerenciamento de contexto de tenant
 * Facilita o uso do RLS no código da aplicação
 */

const db = require('../database');

export interface TenantContextManager {
  setTenantContext(tenantId: string): Promise<void>;
  getCurrentTenantId(): Promise<string | null>;
  clearTenantContext(): Promise<void>;
  executeWithTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T>;
}

export class DatabaseTenantContext implements TenantContextManager {
  
  /**
   * Define o contexto do tenant para a sessão atual
   */
  async setTenantContext(tenantId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔧 Definindo contexto do tenant: ${tenantId}`);
      }
      await db.query('SELECT set_tenant_context($1)', [tenantId]);
      
      // Verificar se foi definido corretamente (apenas em desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        const check = await db.query('SELECT get_current_tenant_id() as current_tenant');
        console.log(`✅ Contexto definido com sucesso: ${check.rows[0]?.current_tenant}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao definir contexto do tenant ${tenantId}:`, error);
      throw new Error(`Erro ao definir contexto do tenant ${tenantId}: ${error.message}`);
    }
  }

  /**
   * Obtém o ID do tenant atual da sessão
   */
  async getCurrentTenantId(): Promise<string | null> {
    try {
      const result = await db.query('SELECT get_current_tenant_id() as tenant_id');
      return result.rows[0]?.tenant_id || null;
    } catch (error) {
      console.error('Erro ao obter contexto do tenant:', error);
      return null;
    }
  }

  /**
   * Limpa o contexto do tenant da sessão atual
   */
  async clearTenantContext(): Promise<void> {
    try {
      await db.query('SELECT clear_tenant_context()');
    } catch (error) {
      console.error('Erro ao limpar contexto do tenant:', error);
    }
  }

  /**
   * Executa uma operação com um contexto de tenant específico
   * Restaura o contexto anterior após a execução
   */
  async executeWithTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
    const previousTenantId = await this.getCurrentTenantId();
    
    try {
      // Definir novo contexto
      await this.setTenantContext(tenantId);
      
      // Executar operação
      const result = await operation();
      
      return result;
    } finally {
      // Restaurar contexto anterior
      if (previousTenantId) {
        await this.setTenantContext(previousTenantId);
      } else {
        await this.clearTenantContext();
      }
    }
  }
}

// Instância singleton
export const tenantContext = new DatabaseTenantContext();

/**
 * Middleware helper para definir contexto de tenant baseado na requisição
 */
export async function setTenantContextFromRequest(req: any): Promise<void> {
  const tenantId = req.tenant?.id || req.tenantContext?.tenantId;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 setTenantContextFromRequest - tenantId: ${tenantId}, req.tenant: ${req.tenant?.name}`);
  }
  
  if (tenantId) {
    await tenantContext.setTenantContext(tenantId);
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Contexto de tenant definido: ${tenantId}`);
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`⚠️ Nenhum tenant encontrado na requisição`);
  }
}

/**
 * Decorator para métodos que precisam de contexto de tenant
 */
export function withTenantContext(tenantId: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return await tenantContext.executeWithTenant(tenantId, async () => {
        return await method.apply(this, args);
      });
    };
  };
}

/**
 * Utilitário para validar se um tenant está ativo
 */
export async function validateTenantActive(tenantId: string): Promise<boolean> {
  try {
    const result = await db.query(`
      SELECT status FROM tenants WHERE id = $1
    `, [tenantId]);
    
    return result.rows.length > 0 && result.rows[0].status === 'active';
  } catch (error) {
    console.error('Erro ao validar tenant:', error);
    return false;
  }
}

/**
 * Utilitário para obter informações do tenant atual
 */
export async function getCurrentTenantInfo(): Promise<any> {
  try {
    const tenantId = await tenantContext.getCurrentTenantId();
    if (!tenantId) return null;
    
    const result = await db.query(`
      SELECT id, slug, name, status, settings, limits
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao obter informações do tenant:', error);
    return null;
  }
}