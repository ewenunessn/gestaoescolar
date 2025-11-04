/**
 * Utilitário para análise e otimização de queries de estoque
 * Fornece ferramentas para monitorar performance e identificar gargalos
 */

const db = require("../database");

interface QueryAnalysisResult {
  query: string;
  executionTime: number;
  planningTime: number;
  totalTime: number;
  rowsReturned: number;
  indexesUsed: string[];
  recommendations: string[];
  performance: 'excellent' | 'good' | 'fair' | 'poor';
}

interface QueryOptimizationOptions {
  enableExplain?: boolean;
  enableAnalyze?: boolean;
  enableBuffers?: boolean;
  enableTiming?: boolean;
  logSlowQueries?: boolean;
  slowQueryThreshold?: number; // em ms
}

/**
 * Classe para análise e otimização de queries
 */
export class QueryAnalyzer {
  private options: QueryOptimizationOptions;
  
  constructor(options: QueryOptimizationOptions = {}) {
    this.options = {
      enableExplain: true,
      enableAnalyze: true,
      enableBuffers: false,
      enableTiming: true,
      logSlowQueries: true,
      slowQueryThreshold: 1000, // 1 segundo
      ...options
    };
  }

  /**
   * Executa uma query com análise de performance
   */
  async executeWithAnalysis(
    query: string, 
    params: any[] = [], 
    context: string = 'unknown'
  ): Promise<{ result: any; analysis: QueryAnalysisResult }> {
    const startTime = Date.now();
    
    try {
      // Executar EXPLAIN ANALYZE se habilitado
      let planAnalysis = null;
      if (this.options.enableExplain) {
        planAnalysis = await this.analyzeQueryPlan(query, params);
      }
      
      // Executar a query real
      const result = await db.query(query, params);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Criar análise de resultado
      const analysis: QueryAnalysisResult = {
        query: this.sanitizeQuery(query),
        executionTime,
        planningTime: planAnalysis?.planningTime || 0,
        totalTime: executionTime,
        rowsReturned: result.rows.length,
        indexesUsed: planAnalysis?.indexesUsed || [],
        recommendations: this.generateRecommendations(planAnalysis, executionTime, result.rows.length),
        performance: this.classifyPerformance(executionTime, result.rows.length)
      };
      
      // Log de queries lentas
      if (this.options.logSlowQueries && executionTime > (this.options.slowQueryThreshold || 1000)) {
        console.warn(`🐌 Slow Query Detected (${executionTime}ms) in ${context}:`, {
          query: this.sanitizeQuery(query),
          executionTime,
          rowsReturned: result.rows.length,
          recommendations: analysis.recommendations
        });
      }
      
      return { result, analysis };
      
    } catch (error) {
      console.error(`❌ Query Analysis Error in ${context}:`, error);
      throw error;
    }
  }

  /**
   * Analisa o plano de execução de uma query
   */
  private async analyzeQueryPlan(query: string, params: any[] = []) {
    try {
      const explainOptions = [];
      if (this.options.enableAnalyze) explainOptions.push('ANALYZE');
      if (this.options.enableBuffers) explainOptions.push('BUFFERS');
      if (this.options.enableTiming) explainOptions.push('TIMING');
      
      const explainQuery = `EXPLAIN (FORMAT JSON, ${explainOptions.join(', ')}) ${query}`;
      const explainResult = await db.query(explainQuery, params);
      
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      
      return {
        planningTime: plan['Planning Time'] || 0,
        executionTime: plan['Execution Time'] || 0,
        indexesUsed: this.extractIndexesFromPlan(plan),
        seqScans: this.countSequentialScans(plan),
        nestedLoops: this.countNestedLoops(plan),
        totalCost: plan.Plan?.['Total Cost'] || 0
      };
      
    } catch (error) {
      console.warn('Could not analyze query plan:', error.message);
      return null;
    }
  }

  /**
   * Extrai índices utilizados do plano de execução
   */
  private extractIndexesFromPlan(plan: any): string[] {
    const indexes: string[] = [];
    
    const extractFromNode = (node: any) => {
      if (node['Node Type'] === 'Index Scan' || node['Node Type'] === 'Index Only Scan') {
        if (node['Index Name']) {
          indexes.push(node['Index Name']);
        }
      }
      
      if (node.Plans) {
        node.Plans.forEach((childNode: any) => extractFromNode(childNode));
      }
    };
    
    if (plan.Plan) {
      extractFromNode(plan.Plan);
    }
    
    return [...new Set(indexes)]; // Remove duplicatas
  }

  /**
   * Conta sequential scans no plano
   */
  private countSequentialScans(plan: any): number {
    let count = 0;
    
    const countInNode = (node: any) => {
      if (node['Node Type'] === 'Seq Scan') {
        count++;
      }
      
      if (node.Plans) {
        node.Plans.forEach((childNode: any) => countInNode(childNode));
      }
    };
    
    if (plan.Plan) {
      countInNode(plan.Plan);
    }
    
    return count;
  }

  /**
   * Conta nested loops no plano
   */
  private countNestedLoops(plan: any): number {
    let count = 0;
    
    const countInNode = (node: any) => {
      if (node['Node Type'] === 'Nested Loop') {
        count++;
      }
      
      if (node.Plans) {
        node.Plans.forEach((childNode: any) => countInNode(childNode));
      }
    };
    
    if (plan.Plan) {
      countInNode(plan.Plan);
    }
    
    return count;
  }

  /**
   * Gera recomendações baseadas na análise
   */
  private generateRecommendations(planAnalysis: any, executionTime: number, rowCount: number): string[] {
    const recommendations: string[] = [];
    
    // Recomendações baseadas no tempo de execução
    if (executionTime > 5000) {
      recommendations.push('Query muito lenta (>5s) - considere otimização urgente');
    } else if (executionTime > 1000) {
      recommendations.push('Query lenta (>1s) - considere otimização');
    }
    
    // Recomendações baseadas no plano de execução
    if (planAnalysis) {
      if (planAnalysis.seqScans > 0) {
        recommendations.push(`${planAnalysis.seqScans} sequential scan(s) detectado(s) - considere adicionar índices`);
      }
      
      if (planAnalysis.nestedLoops > 2) {
        recommendations.push('Muitos nested loops - considere reescrever a query ou adicionar índices');
      }
      
      if (planAnalysis.indexesUsed.length === 0 && rowCount > 100) {
        recommendations.push('Nenhum índice utilizado para query com muitos resultados');
      }
      
      if (planAnalysis.planningTime > 100) {
        recommendations.push('Tempo de planejamento alto - considere ANALYZE nas tabelas');
      }
    }
    
    // Recomendações baseadas no número de linhas
    if (rowCount > 10000) {
      recommendations.push('Muitas linhas retornadas - considere paginação');
    }
    
    // Recomendações específicas para queries de estoque
    if (this.isInventoryQuery(planAnalysis?.query || '')) {
      if (!planAnalysis?.indexesUsed.some(idx => idx.includes('tenant'))) {
        recommendations.push('Query de estoque sem uso de índice tenant - verifique filtros de tenant');
      }
    }
    
    return recommendations;
  }

  /**
   * Classifica a performance da query
   */
  private classifyPerformance(executionTime: number, rowCount: number): 'excellent' | 'good' | 'fair' | 'poor' {
    // Calcular score baseado em tempo e eficiência
    const timeScore = executionTime < 100 ? 4 : executionTime < 500 ? 3 : executionTime < 1000 ? 2 : 1;
    const efficiencyScore = rowCount === 0 ? 3 : executionTime / rowCount < 1 ? 4 : executionTime / rowCount < 5 ? 3 : executionTime / rowCount < 10 ? 2 : 1;
    
    const avgScore = (timeScore + efficiencyScore) / 2;
    
    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    return 'poor';
  }

  /**
   * Verifica se é uma query de estoque
   */
  private isInventoryQuery(query: string): boolean {
    const inventoryKeywords = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico'];
    return inventoryKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }

  /**
   * Remove dados sensíveis da query para log
   */
  private sanitizeQuery(query: string): string {
    // Remove valores de parâmetros e mantém apenas a estrutura
    return query
      .replace(/\$\d+/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limita o tamanho
  }

  /**
   * Gera relatório de performance para múltiplas queries
   */
  async generatePerformanceReport(queries: Array<{ name: string; query: string; params?: any[] }>) {
    const results = [];
    
    console.log('🔍 Iniciando análise de performance de queries...');
    
    for (const { name, query, params = [] } of queries) {
      try {
        const { analysis } = await this.executeWithAnalysis(query, params, name);
        results.push({ name, ...analysis });
      } catch (error) {
        results.push({
          name,
          error: error.message,
          performance: 'poor' as const
        });
      }
    }
    
    // Gerar resumo
    const summary = {
      totalQueries: results.length,
      excellent: results.filter(r => r.performance === 'excellent').length,
      good: results.filter(r => r.performance === 'good').length,
      fair: results.filter(r => r.performance === 'fair').length,
      poor: results.filter(r => r.performance === 'poor').length,
      averageExecutionTime: results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length,
      slowestQuery: results.reduce((slowest, current) => 
        (current.executionTime || 0) > (slowest.executionTime || 0) ? current : slowest, results[0]
      )
    };
    
    console.log('📊 Relatório de Performance:', summary);
    
    return { results, summary };
  }

  /**
   * Monitora queries em tempo real
   */
  startQueryMonitoring(callback?: (analysis: QueryAnalysisResult) => void) {
    console.log('🔍 Monitoramento de queries iniciado');
    
    // Interceptar queries do pool de conexão (implementação específica do driver)
    // Esta é uma implementação conceitual - a implementação real dependeria do driver usado
    
    return {
      stop: () => {
        console.log('⏹️ Monitoramento de queries parado');
      }
    };
  }
}

/**
 * Instância singleton do analisador de queries
 */
export const queryAnalyzer = new QueryAnalyzer({
  enableExplain: true,
  enableAnalyze: true,
  enableTiming: true,
  logSlowQueries: true,
  slowQueryThreshold: 1000
});

/**
 * Wrapper para executar queries com análise automática
 */
export const executeOptimizedQuery = async (
  query: string, 
  params: any[] = [], 
  context: string = 'unknown'
) => {
  const { result, analysis } = await queryAnalyzer.executeWithAnalysis(query, params, context);
  
  // Log apenas se a performance for ruim
  if (analysis.performance === 'poor' || analysis.performance === 'fair') {
    console.warn(`⚠️ Query Performance Issue in ${context}:`, {
      performance: analysis.performance,
      executionTime: analysis.executionTime,
      recommendations: analysis.recommendations
    });
  }
  
  return result;
};

/**
 * Função para testar performance de queries de estoque
 */
export const testInventoryQueryPerformance = async (tenantId: string) => {
  const testQueries = [
    {
      name: 'Listar Estoque Escola',
      query: `
        SELECT ee.*, p.nome as produto_nome 
        FROM estoque_escolas ee 
        JOIN produtos p ON p.id = ee.produto_id 
        WHERE ee.tenant_id = $1 AND p.tenant_id = $1
        LIMIT 100
      `,
      params: [tenantId]
    },
    {
      name: 'Produtos Próximos Vencimento',
      query: `
        SELECT el.*, p.nome as produto_nome 
        FROM estoque_lotes el 
        JOIN produtos p ON p.id = el.produto_id 
        WHERE el.tenant_id = $1 AND el.data_validade <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY el.data_validade ASC
        LIMIT 50
      `,
      params: [tenantId]
    },
    {
      name: 'Histórico Movimentações',
      query: `
        SELECT eeh.*, p.nome as produto_nome, e.nome as escola_nome
        FROM estoque_escolas_historico eeh
        JOIN produtos p ON p.id = eeh.produto_id
        JOIN escolas e ON e.id = eeh.escola_id
        WHERE eeh.tenant_id = $1 AND eeh.data_movimentacao >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY eeh.data_movimentacao DESC
        LIMIT 100
      `,
      params: [tenantId]
    }
  ];
  
  return queryAnalyzer.generatePerformanceReport(testQueries);
};

export default {
  QueryAnalyzer,
  queryAnalyzer,
  executeOptimizedQuery,
  testInventoryQueryPerformance
};