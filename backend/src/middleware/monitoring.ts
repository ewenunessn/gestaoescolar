/**
 * Middleware de monitoramento e métricas
 * Coleta dados de performance, uso e erros
 */

import { Request, Response, NextFunction } from 'express';

interface RequestMetrics {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  userId?: number;
  error?: string;
}

interface SystemMetrics {
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  activeUsers: Set<number>;
  endpointStats: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
  }>;
}

class MonitoringService {
  private metrics: RequestMetrics[] = [];
  private systemMetrics: SystemMetrics = {
    totalRequests: 0,
    errorRate: 0,
    averageResponseTime: 0,
    activeUsers: new Set(),
    endpointStats: new Map()
  };

  // Manter apenas as últimas 1000 requisições em memória
  private readonly MAX_METRICS = 1000;

  /**
   * Registra uma nova métrica de requisição
   */
  recordRequest(metric: RequestMetrics): void {
    this.metrics.push(metric);
    
    // Manter apenas as últimas métricas
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Atualizar métricas do sistema
    this.updateSystemMetrics(metric);
  }

  /**
   * Atualiza métricas agregadas do sistema
   */
  private updateSystemMetrics(metric: RequestMetrics): void {
    this.systemMetrics.totalRequests++;
    
    // Usuário ativo
    if (metric.userId) {
      this.systemMetrics.activeUsers.add(metric.userId);
    }

    // Estatísticas por endpoint
    const endpoint = `${metric.method} ${metric.path}`;
    const endpointStat = this.systemMetrics.endpointStats.get(endpoint) || {
      count: 0,
      totalTime: 0,
      errors: 0
    };

    endpointStat.count++;
    endpointStat.totalTime += metric.responseTime;
    
    if (metric.statusCode >= 400) {
      endpointStat.errors++;
    }

    this.systemMetrics.endpointStats.set(endpoint, endpointStat);

    // Recalcular métricas agregadas
    this.recalculateAggregates();
  }

  /**
   * Recalcula métricas agregadas
   */
  private recalculateAggregates(): void {
    const recentMetrics = this.metrics.slice(-100); // Últimas 100 requisições
    
    if (recentMetrics.length === 0) return;

    // Taxa de erro
    const errors = recentMetrics.filter(m => m.statusCode >= 400).length;
    this.systemMetrics.errorRate = (errors / recentMetrics.length) * 100;

    // Tempo médio de resposta
    const totalTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    this.systemMetrics.averageResponseTime = totalTime / recentMetrics.length;
  }

  /**
   * Retorna métricas do sistema
   */
  getSystemMetrics(): SystemMetrics & {
    topEndpoints: Array<{
      endpoint: string;
      count: number;
      avgTime: number;
      errorRate: number;
    }>;
    recentErrors: RequestMetrics[];
  } {
    // Top endpoints por uso
    const topEndpoints = Array.from(this.systemMetrics.endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        errorRate: (stats.errors / stats.count) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Erros recentes
    const recentErrors = this.metrics
      .filter(m => m.statusCode >= 400)
      .slice(-20);

    return {
      ...this.systemMetrics,
      activeUsers: new Set(this.systemMetrics.activeUsers), // Clone do Set
      topEndpoints,
      recentErrors
    };
  }

  /**
   * Retorna métricas de performance por período
   */
  getPerformanceMetrics(hours: number = 1): {
    requestsPerHour: number;
    averageResponseTime: number;
    errorRate: number;
    slowestEndpoints: Array<{
      endpoint: string;
      avgTime: number;
      count: number;
    }>;
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const periodMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    if (periodMetrics.length === 0) {
      return {
        requestsPerHour: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowestEndpoints: []
      };
    }

    const requestsPerHour = periodMetrics.length / hours;
    const totalTime = periodMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    const averageResponseTime = totalTime / periodMetrics.length;
    const errors = periodMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errors / periodMetrics.length) * 100;

    // Endpoints mais lentos
    const endpointTimes = new Map<string, { totalTime: number; count: number }>();
    
    periodMetrics.forEach(metric => {
      const endpoint = `${metric.method} ${metric.path}`;
      const current = endpointTimes.get(endpoint) || { totalTime: 0, count: 0 };
      current.totalTime += metric.responseTime;
      current.count++;
      endpointTimes.set(endpoint, current);
    });

    const slowestEndpoints = Array.from(endpointTimes.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);

    return {
      requestsPerHour,
      averageResponseTime,
      errorRate,
      slowestEndpoints
    };
  }

  /**
   * Limpa métricas antigas
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    
    // Limpar usuários ativos antigos (implementar lógica se necessário)
    // Por enquanto, manter todos os usuários ativos
  }
}

// Instância singleton
const monitoringService = new MonitoringService();

// Limpar métricas antigas a cada hora
setInterval(() => {
  monitoringService.cleanup();
}, 60 * 60 * 1000);

/**
 * Middleware principal de monitoramento
 */
export const monitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Interceptar o final da resposta
  const originalSend = res.send;
  
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Registrar métrica
    monitoringService.recordRequest({
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date(),
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.id,
      error: res.statusCode >= 400 ? data?.message || data?.error : undefined
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware para alertas de performance
 */
export const performanceAlertMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  const originalSend = res.send;
  
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    // Alertas de performance
    if (responseTime > 5000) { // Mais de 5 segundos
      console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.path} - ${responseTime}ms`);
    }
    
    if (res.statusCode >= 500) {
      console.error(`💥 SERVER ERROR: ${req.method} ${req.path} - Status ${res.statusCode}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Endpoint para métricas (para dashboard)
 */
export const getMetricsHandler = (req: Request, res: Response) => {
  try {
    const systemMetrics = monitoringService.getSystemMetrics();
    const performanceMetrics = monitoringService.getPerformanceMetrics(1); // Última hora
    
    res.json({
      success: true,
      data: {
        system: {
          totalRequests: systemMetrics.totalRequests,
          errorRate: Math.round(systemMetrics.errorRate * 100) / 100,
          averageResponseTime: Math.round(systemMetrics.averageResponseTime * 100) / 100,
          activeUsers: systemMetrics.activeUsers.size
        },
        performance: performanceMetrics,
        topEndpoints: systemMetrics.topEndpoints,
        recentErrors: systemMetrics.recentErrors.slice(0, 5) // Apenas os 5 mais recentes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter métricas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};

/**
 * Endpoint para health check
 */
export const healthCheckHandler = (req: Request, res: Response) => {
  const metrics = monitoringService.getPerformanceMetrics(0.25); // Últimos 15 minutos
  
  const isHealthy = 
    metrics.errorRate < 5 && // Menos de 5% de erro
    metrics.averageResponseTime < 2000; // Menos de 2 segundos em média
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    metrics: {
      errorRate: metrics.errorRate,
      averageResponseTime: metrics.averageResponseTime,
      requestsPerHour: metrics.requestsPerHour
    }
  });
};

export default monitoringService;