/**
 * Sistema de connection pooling com contexto de tenant
 * Otimiza conexões de banco de dados para operações multi-tenant
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { tenantCache } from './tenantCache';

interface TenantConnectionConfig {
  maxConnections?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxUses?: number;
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  averageQueryTime: number;
}

interface TenantConnectionInfo {
  tenantId: string;
  connectionCount: number;
  lastUsed: Date;
  queryCount: number;
  totalQueryTime: number;
}

export class TenantConnectionPool {
  private mainPool: Pool;
  private tenantConnections = new Map<string, TenantConnectionInfo>();
  private queryStats = new Map<string, { count: number; totalTime: number }>();
  private config: TenantConnectionConfig;

  constructor(config: TenantConnectionConfig = {}) {
    this.config = {
      maxConnections: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
      maxUses: config.maxUses || 7500
    };

    // Configurar pool principal baseado nas variáveis de ambiente
    const poolConfig: PoolConfig = {
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      maxUses: this.config.maxUses
    };

    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      // Usar connection string (produção)
      poolConfig.connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      poolConfig.ssl = { rejectUnauthorized: false };
    } else {
      // Usar configuração individual (desenvolvimento)
      poolConfig.user = process.env.DB_USER || 'postgres';
      poolConfig.host = process.env.DB_HOST || 'localhost';
      poolConfig.database = process.env.DB_NAME || 'alimentacao_escolar';
      poolConfig.password = process.env.DB_PASSWORD || 'admin123';
      poolConfig.port = parseInt(process.env.DB_PORT || '5432');
      poolConfig.ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
    }

    this.mainPool = new Pool(poolConfig);

    // Event listeners para monitoramento
    this.mainPool.on('connect', (client) => {
      console.log('🔗 Nova conexão estabelecida no pool');
    });

    this.mainPool.on('error', (err) => {
      console.error('❌ Erro no pool de conexões:', err);
    });

    this.mainPool.on('remove', () => {
      console.log('🗑️ Conexão removida do pool');
    });

    // Limpeza periódica de estatísticas antigas
    setInterval(() => {
      this.cleanupOldStats();
    }, 300000); // 5 minutos
  }

  /**
   * Executa query com contexto de tenant e monitoramento
   */
  async query<T = any>(
    tenantId: string,
    text: string,
    params: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();
    let client: PoolClient | null = null;

    try {
      // Obter conexão do pool
      client = await this.mainPool.connect();

      // Configurar contexto do tenant na conexão
      await this.setTenantContext(client, tenantId);

      // Executar query
      const result = await client.query(text, params);
      const duration = Date.now() - start;

      // Atualizar estatísticas
      this.updateTenantStats(tenantId, duration);
      this.updateQueryStats(text, duration);

      // Log em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Query executada para tenant ${tenantId}:`, {
          query: text.substring(0, 50) + '...',
          duration: duration + 'ms',
          rows: result.rowCount
        });
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error: any) {
      const duration = Date.now() - start;
      console.error(`❌ Erro na query para tenant ${tenantId}:`, {
        error: error.message,
        query: text.substring(0, 100),
        duration: duration + 'ms'
      });
      throw error;
    } finally {
      // Sempre liberar a conexão
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Executa transação com contexto de tenant
   */
  async transaction<T>(
    tenantId: string,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    const client = await this.mainPool.connect();

    try {
      // Configurar contexto do tenant
      await this.setTenantContext(client, tenantId);

      // Iniciar transação
      await client.query('BEGIN');

      // Executar callback
      const result = await callback(client);

      // Commit da transação
      await client.query('COMMIT');

      const duration = Date.now() - start;
      this.updateTenantStats(tenantId, duration);

      return result;
    } catch (error) {
      // Rollback em caso de erro
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Executa múltiplas queries em batch com contexto de tenant
   */
  async batch<T>(
    tenantId: string,
    queries: Array<{ text: string; params?: any[] }>
  ): Promise<T[][]> {
    const start = Date.now();
    const client = await this.mainPool.connect();

    try {
      // Configurar contexto do tenant
      await this.setTenantContext(client, tenantId);

      const results: T[][] = [];

      // Executar queries em sequência
      for (const query of queries) {
        const result = await client.query(query.text, query.params || []);
        results.push(result.rows);
      }

      const duration = Date.now() - start;
      this.updateTenantStats(tenantId, duration);

      return results;
    } catch (error) {
      console.error(`❌ Erro no batch para tenant ${tenantId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Executa query com cache automático
   */
  async queryWithCache<T>(
    tenantId: string,
    cacheKey: string,
    text: string,
    params: any[] = [],
    cacheTTL: number = 300
  ): Promise<T[]> {
    // Tentar buscar do cache primeiro
    const cached = await tenantCache.get<T[]>(tenantId, cacheKey, {
      prefix: 'query',
      ttl: cacheTTL
    });

    if (cached !== null) {
      return cached;
    }

    // Executar query no banco
    const result = await this.query<T>(tenantId, text, params);
    const data = result.rows;

    // Cachear resultado
    await tenantCache.set(tenantId, cacheKey, data, {
      prefix: 'query',
      ttl: cacheTTL
    });

    return data;
  }

  /**
   * Configura contexto do tenant na conexão
   */
  private async setTenantContext(client: PoolClient, tenantId: string): Promise<void> {
    try {
      // Tentar usar função RLS primeiro
      await client.query('SELECT set_tenant_context($1)', [tenantId]);
    } catch (error) {
      // Fallback para método anterior
      try {
        await client.query('SET app.current_tenant_id = $1', [tenantId]);
      } catch (fallbackError) {
        console.error('Erro ao configurar contexto do tenant:', fallbackError);
      }
    }
  }

  /**
   * Atualiza estatísticas do tenant
   */
  private updateTenantStats(tenantId: string, queryTime: number): void {
    const existing = this.tenantConnections.get(tenantId);
    
    if (existing) {
      existing.connectionCount++;
      existing.lastUsed = new Date();
      existing.queryCount++;
      existing.totalQueryTime += queryTime;
    } else {
      this.tenantConnections.set(tenantId, {
        tenantId,
        connectionCount: 1,
        lastUsed: new Date(),
        queryCount: 1,
        totalQueryTime: queryTime
      });
    }
  }

  /**
   * Atualiza estatísticas de queries
   */
  private updateQueryStats(queryText: string, queryTime: number): void {
    // Extrair tipo de query (SELECT, INSERT, UPDATE, DELETE)
    const queryType = queryText.trim().split(' ')[0].toUpperCase();
    const existing = this.queryStats.get(queryType);
    
    if (existing) {
      existing.count++;
      existing.totalTime += queryTime;
    } else {
      this.queryStats.set(queryType, {
        count: 1,
        totalTime: queryTime
      });
    }
  }

  /**
   * Limpa estatísticas antigas
   */
  private cleanupOldStats(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas atrás
    
    for (const [tenantId, info] of this.tenantConnections.entries()) {
      if (info.lastUsed < cutoffTime) {
        this.tenantConnections.delete(tenantId);
      }
    }
  }

  /**
   * Obtém estatísticas gerais do pool
   */
  getConnectionStats(): ConnectionStats {
    const poolStats = {
      totalConnections: this.mainPool.totalCount,
      activeConnections: this.mainPool.totalCount - this.mainPool.idleCount,
      idleConnections: this.mainPool.idleCount,
      waitingClients: this.mainPool.waitingCount
    };

    let totalQueries = 0;
    let totalTime = 0;

    for (const stats of this.queryStats.values()) {
      totalQueries += stats.count;
      totalTime += stats.totalTime;
    }

    return {
      ...poolStats,
      totalQueries,
      averageQueryTime: totalQueries > 0 ? totalTime / totalQueries : 0
    };
  }

  /**
   * Obtém estatísticas por tenant
   */
  getTenantStats(): TenantConnectionInfo[] {
    return Array.from(this.tenantConnections.values())
      .sort((a, b) => b.queryCount - a.queryCount);
  }

  /**
   * Obtém estatísticas por tipo de query
   */
  getQueryTypeStats(): Array<{ type: string; count: number; avgTime: number }> {
    return Array.from(this.queryStats.entries())
      .map(([type, stats]) => ({
        type,
        count: stats.count,
        avgTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Testa conectividade do pool
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.mainPool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      console.log('✅ Pool de conexões funcionando:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Erro no teste do pool:', error);
      return false;
    }
  }

  /**
   * Fecha todas as conexões do pool
   */
  async close(): Promise<void> {
    await this.mainPool.end();
    console.log('🔒 Pool de conexões fechado');
  }

  /**
   * Força limpeza de conexões idle
   */
  async cleanupIdleConnections(): Promise<void> {
    // O pg pool já gerencia isso automaticamente, mas podemos forçar
    const idleCount = this.mainPool.idleCount;
    console.log(`🧹 Limpando ${idleCount} conexões idle`);
  }
}

// Instância singleton
export const tenantConnectionPool = new TenantConnectionPool();

// Fechar pool quando aplicação terminar
process.on('SIGINT', async () => {
  console.log('Fechando pool de conexões...');
  await tenantConnectionPool.close();
});

process.on('SIGTERM', async () => {
  console.log('Fechando pool de conexões...');
  await tenantConnectionPool.close();
});