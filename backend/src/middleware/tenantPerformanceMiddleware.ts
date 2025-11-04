/**
 * Middleware de monitoramento de performance para operações multi-tenant
 * Coleta métricas e otimiza automaticamente queries baseadas no tenant
 */

import { Request, Response, NextFunction } from 'express';
import { tenantCache } from '../utils/tenantCache';
import { tenantConnectionPool } from '../utils/tenantConnectionPool';

interface PerformanceMetrics {
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  slowQueries: number;
  cacheHitRate: number;
  lastUpdated: Date;
}

interface TenantPerformanceData {
  tenantId: string;
  metrics: PerformanceMetrics;
  slowestEndpoints: Array<{
    path: string;
    method: string;
    averageTime: number;
    count: number;
  }>;
}

export class TenantPerformanceMonitor {
  private tenantMetrics = new Map<string, PerformanceMetrics>();
  private endpointMetrics = new Map<string, Map<string, { totalTime: number; count: number }>>();
  private slowQueryThreshold = 1000; // 1 segundo
  private cacheWarningThreshold = 50; // 50% hit rate

  /**
   * Middleware principal de monitoramento
   */
  monitor() {
    const self = this;
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const tenantId = req.tenant?.id;

      // Interceptar resposta para coletar métricas
      const originalSend = res.send;
      res.send = function(data: any) {
        const responseTime = Date.now() - startTime;
        
        if (tenantId) {
          // Atualizar métricas do tenant
          self.updateTenantMetrics(tenantId, responseTime);
          
          // Atualizar métricas do endpoint
          self.updateEndpointMetrics(tenantId, req.method, req.path, responseTime);
          
          // Verificar se é uma query lenta
          if (responseTime > self.slowQueryThreshold) {
            self.logSlowQuery(tenantId, req.method, req.path, responseTime);
          }
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Atualiza métricas do tenant
   */
  private updateTenantMetrics(tenantId: string, responseTime: number): void {
    const existing = this.tenantMetrics.get(tenantId);
    
    if (existing) {
      existing.requestCount++;
      existing.totalResponseTime += responseTime;
      existing.averageResponseTime = existing.totalResponseTime / existing.requestCount;
      existing.lastUpdated = new Date();
      
      if (responseTime > this.slowQueryThreshold) {
        existing.slowQueries++;
      }
    } else {
      this.tenantMetrics.set(tenantId, {
        requestCount: 1,
        totalResponseTime: responseTime,
        averageResponseTime: responseTime,
        slowQueries: responseTime > this.slowQueryThreshold ? 1 : 0,
        cacheHitRate: 0,
        lastUpdated: new Date()
      });
    }
  }

  /**
   * Atualiza métricas por endpoint
   */
  private updateEndpointMetrics(
    tenantId: string, 
    method: string, 
    path: string, 
    responseTime: number
  ): void {
    const endpointKey = `${method} ${path}`;
    
    if (!this.endpointMetrics.has(tenantId)) {
      this.endpointMetrics.set(tenantId, new Map());
    }
    
    const tenantEndpoints = this.endpointMetrics.get(tenantId)!;
    const existing = tenantEndpoints.get(endpointKey);
    
    if (existing) {
      existing.totalTime += responseTime;
      existing.count++;
    } else {
      tenantEndpoints.set(endpointKey, {
        totalTime: responseTime,
        count: 1
      });
    }
  }

  /**
   * Log de queries lentas
   */
  private logSlowQuery(tenantId: string, method: string, path: string, responseTime: number): void {
    console.warn(`🐌 Query lenta detectada:`, {
      tenantId,
      endpoint: `${method} ${path}`,
      responseTime: `${responseTime}ms`,
      threshold: `${this.slowQueryThreshold}ms`
    });

    // Armazenar no cache para análise posterior
    tenantCache.set(
      tenantId,
      `slow_query:${Date.now()}`,
      {
        method,
        path,
        responseTime,
        timestamp: new Date()
      },
      { ttl: 3600, prefix: 'performance' } // 1 hora
    );
  }

  /**
   * Obtém métricas de um tenant específico
   */
  getTenantMetrics(tenantId: string): TenantPerformanceData | null {
    const metrics = this.tenantMetrics.get(tenantId);
    if (!metrics) return null;

    // Atualizar cache hit rate
    const cacheStats = tenantCache.getStats();
    metrics.cacheHitRate = cacheStats.hitRate;

    // Obter endpoints mais lentos
    const tenantEndpoints = this.endpointMetrics.get(tenantId);
    const slowestEndpoints: TenantPerformanceData['slowestEndpoints'] = [];

    if (tenantEndpoints) {
      for (const [endpoint, stats] of tenantEndpoints.entries()) {
        const [method, ...pathParts] = endpoint.split(' ');
        const path = pathParts.join(' ');
        const averageTime = stats.totalTime / stats.count;

        slowestEndpoints.push({
          method,
          path,
          averageTime,
          count: stats.count
        });
      }

      // Ordenar por tempo médio (mais lentos primeiro)
      slowestEndpoints.sort((a, b) => b.averageTime - a.averageTime);
    }

    return {
      tenantId,
      metrics,
      slowestEndpoints: slowestEndpoints.slice(0, 10) // Top 10
    };
  }

  /**
   * Obtém métricas de todos os tenants
   */
  getAllTenantMetrics(): TenantPerformanceData[] {
    const results: TenantPerformanceData[] = [];
    
    for (const tenantId of this.tenantMetrics.keys()) {
      const data = this.getTenantMetrics(tenantId);
      if (data) {
        results.push(data);
      }
    }

    // Ordenar por número de requests (mais ativos primeiro)
    return results.sort((a, b) => b.metrics.requestCount - a.metrics.requestCount);
  }

  /**
   * Obtém alertas de performance
   */
  getPerformanceAlerts(): Array<{
    tenantId: string;
    type: 'slow_queries' | 'low_cache_hit' | 'high_response_time';
    message: string;
    severity: 'warning' | 'critical';
  }> {
    const alerts: any[] = [];

    for (const [tenantId, metrics] of this.tenantMetrics.entries()) {
      // Alerta para queries lentas
      const slowQueryRate = (metrics.slowQueries / metrics.requestCount) * 100;
      if (slowQueryRate > 10) {
        alerts.push({
          tenantId,
          type: 'slow_queries',
          message: `${slowQueryRate.toFixed(1)}% das queries estão lentas (>${this.slowQueryThreshold}ms)`,
          severity: slowQueryRate > 25 ? 'critical' : 'warning'
        });
      }

      // Alerta para baixo cache hit rate
      if (metrics.cacheHitRate < this.cacheWarningThreshold) {
        alerts.push({
          tenantId,
          type: 'low_cache_hit',
          message: `Cache hit rate baixo: ${metrics.cacheHitRate.toFixed(1)}%`,
          severity: metrics.cacheHitRate < 25 ? 'critical' : 'warning'
        });
      }

      // Alerta para tempo de resposta alto
      if (metrics.averageResponseTime > 500) {
        alerts.push({
          tenantId,
          type: 'high_response_time',
          message: `Tempo médio de resposta alto: ${metrics.averageResponseTime.toFixed(0)}ms`,
          severity: metrics.averageResponseTime > 1000 ? 'critical' : 'warning'
        });
      }
    }

    return alerts;
  }

  /**
   * Limpa métricas antigas
   */
  cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas

    for (const [tenantId, metrics] of this.tenantMetrics.entries()) {
      if (metrics.lastUpdated < cutoffTime) {
        this.tenantMetrics.delete(tenantId);
        this.endpointMetrics.delete(tenantId);
      }
    }
  }

  /**
   * Reseta métricas de um tenant
   */
  resetTenantMetrics(tenantId: string): void {
    this.tenantMetrics.delete(tenantId);
    this.endpointMetrics.delete(tenantId);
  }

  /**
   * Reseta todas as métricas
   */
  resetAllMetrics(): void {
    this.tenantMetrics.clear();
    this.endpointMetrics.clear();
  }

  /**
   * Configura thresholds de performance
   */
  setThresholds(slowQueryMs: number, cacheHitRatePercent: number): void {
    this.slowQueryThreshold = slowQueryMs;
    this.cacheWarningThreshold = cacheHitRatePercent;
  }

  /**
   * Obtém estatísticas do sistema
   */
  getSystemStats(): {
    totalTenants: number;
    totalRequests: number;
    averageResponseTime: number;
    connectionPoolStats: any;
    cacheStats: any;
  } {
    let totalRequests = 0;
    let totalResponseTime = 0;

    for (const metrics of this.tenantMetrics.values()) {
      totalRequests += metrics.requestCount;
      totalResponseTime += metrics.totalResponseTime;
    }

    return {
      totalTenants: this.tenantMetrics.size,
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      connectionPoolStats: tenantConnectionPool.getConnectionStats(),
      cacheStats: tenantCache.getStats()
    };
  }
}

// Instância singleton
export const tenantPerformanceMonitor = new TenantPerformanceMonitor();

// Limpeza periódica de métricas antigas
setInterval(() => {
  tenantPerformanceMonitor.cleanupOldMetrics();
}, 60 * 60 * 1000); // 1 hora

/**
 * Middleware para endpoints de performance
 */
export function performanceEndpoints() {
  return {
    // GET /api/performance/tenant/:tenantId
    getTenantMetrics: (req: Request, res: Response) => {
      const { tenantId } = req.params;
      const metrics = tenantPerformanceMonitor.getTenantMetrics(tenantId);
      
      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: 'Métricas não encontradas para este tenant'
        });
      }

      res.json({
        success: true,
        data: metrics
      });
    },

    // GET /api/performance/tenants
    getAllMetrics: (req: Request, res: Response) => {
      const metrics = tenantPerformanceMonitor.getAllTenantMetrics();
      res.json({
        success: true,
        data: metrics
      });
    },

    // GET /api/performance/alerts
    getAlerts: (req: Request, res: Response) => {
      const alerts = tenantPerformanceMonitor.getPerformanceAlerts();
      res.json({
        success: true,
        data: alerts
      });
    },

    // GET /api/performance/system
    getSystemStats: (req: Request, res: Response) => {
      const stats = tenantPerformanceMonitor.getSystemStats();
      res.json({
        success: true,
        data: stats
      });
    },

    // POST /api/performance/reset/:tenantId
    resetTenantMetrics: (req: Request, res: Response) => {
      const { tenantId } = req.params;
      tenantPerformanceMonitor.resetTenantMetrics(tenantId);
      
      res.json({
        success: true,
        message: 'Métricas do tenant resetadas com sucesso'
      });
    }
  };
}