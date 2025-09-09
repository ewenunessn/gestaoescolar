import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Interfaces para relatórios de integridade
export interface IntegrityIssue {
  tipo: 'CRITICO' | 'AVISO' | 'INFO';
  categoria: 'DADOS' | 'REFERENCIA' | 'CALCULO' | 'CONSISTENCIA';
  descricao: string;
  campo?: string;
  valorEsperado?: any;
  valorEncontrado?: any;
  sugestaoCorrecao?: string;
}

export interface IntegrityReport {
  pedidoId: number;
  numeroPedido: string;
  status: string;
  problemas: IntegrityIssue[];
  score: number;
  recomendacoes: string[];
  dataVerificacao: string;
}

export interface SystemIntegrityReport {
  totalPedidos: number;
  pedidosComProblemas: number;
  problemasEncontrados: IntegrityIssue[];
  estatisticas: {
    problemasCriticos: number;
    problemasAvisos: number;
    problemasInfo: number;
  };
  recomendacoes: string[];
  dataVerificacao: string;
}

export interface AutoFixResult {
  corrigidos: number;
  naoCorrigidos: IntegrityIssue[];
  // relatorio removido - módulo de relatórios descontinuado
  sucesso: boolean;
}

// Configuração do axios
const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Serviço de integridade de pedidos
export const pedidoIntegrityService = {
  // Verificar integridade de um pedido específico
  async checkPedidoIntegrity(pedidoId: number): Promise<IntegrityReport> {
    try {
      const response = await api.get(`/pedidos-modernos/${pedidoId}/integrity-check`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar integridade do pedido');
    }
  },

  // Verificar integridade de todo o sistema
  async checkSystemIntegrity(): Promise<SystemIntegrityReport> {
    try {
      const response = await api.get('/pedidos-modernos/system/integrity-check');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao verificar integridade do sistema');
    }
  },

  // Corrigir problemas automaticamente
  async autoFixPedidoIssues(pedidoId: number): Promise<AutoFixResult> {
    try {
      const response = await api.post(`/pedidos-modernos/${pedidoId}/auto-fix`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao corrigir problemas automaticamente');
    }
  },

  // Recalcular estatísticas de um pedido
  async recalcularEstatisticas(pedidoId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(`/pedidos-modernos/${pedidoId}/recalcular-estatisticas`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao recalcular estatísticas');
    }
  },

  // Validar dados antes de submissão
  async validateBeforeSubmit(dadosPedido: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const response = await api.post('/pedidos-modernos/validate-data', dadosPedido);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao validar dados do pedido');
    }
  },

  // Obter histórico de verificações de integridade
  async getIntegrityHistory(pedidoId: number): Promise<IntegrityReport[]> {
    try {
      const response = await api.get(`/pedidos-modernos/${pedidoId}/integrity-history`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao obter histórico de integridade');
    }
  },

  // Executar limpeza de dados órfãos
  async cleanOrphanedData(): Promise<{
    success: boolean;
    message: string;
    cleaned: {
      pedidos: number;
      fornecedores: number;
      itens: number;
    };
  }> {
    try {
      const response = await api.post('/pedidos-modernos/system/clean-orphaned');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao limpar dados órfãos');
    }
  },

  // Executar migração de integridade
  async runIntegrityMigration(): Promise<{
    success: boolean;
    message: string;
    details: string[];
  }> {
    try {
      const response = await api.post('/pedidos-modernos/system/run-integrity-migration');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao executar migração de integridade');
    }
  },

  // Obter métricas de performance
  async getPerformanceMetrics(): Promise<{
    averageValidationTime: number;
    totalValidations: number;
    successRate: number;
    commonIssues: Array<{
      tipo: string;
      categoria: string;
      count: number;
      percentage: number;
    }>;
  }> {
    try {
      const response = await api.get('/pedidos-modernos/system/performance-metrics');
      return response.data.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao obter métricas de performance');
    }
  }
};

// Utilitários para análise de integridade
export const integrityUtils = {
  // Calcular score de integridade baseado nos problemas
  calculateIntegrityScore(problemas: IntegrityIssue[]): number {
    if (problemas.length === 0) return 100;

    let penalidade = 0;
    problemas.forEach(problema => {
      switch (problema.tipo) {
        case 'CRITICO':
          penalidade += 20;
          break;
        case 'AVISO':
          penalidade += 5;
          break;
        case 'INFO':
          penalidade += 1;
          break;
      }
    });

    return Math.max(0, 100 - penalidade);
  },

  // Agrupar problemas por categoria
  groupProblemsByCategory(problemas: IntegrityIssue[]): Record<string, IntegrityIssue[]> {
    return problemas.reduce((acc, problema) => {
      if (!acc[problema.categoria]) {
        acc[problema.categoria] = [];
      }
      acc[problema.categoria].push(problema);
      return acc;
    }, {} as Record<string, IntegrityIssue[]>);
  },

  // Agrupar problemas por tipo
  groupProblemsByType(problemas: IntegrityIssue[]): Record<string, IntegrityIssue[]> {
    return problemas.reduce((acc, problema) => {
      if (!acc[problema.tipo]) {
        acc[problema.tipo] = [];
      }
      acc[problema.tipo].push(problema);
      return acc;
    }, {} as Record<string, IntegrityIssue[]>);
  },

  // Obter cor baseada no score
  getScoreColor(score: number): 'success' | 'warning' | 'error' {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  },

  // Obter ícone baseado no tipo de problema
  getIssueIcon(tipo: IntegrityIssue['tipo']): string {
    switch (tipo) {
      case 'CRITICO':
        return '🔴';
      case 'AVISO':
        return '🟡';
      case 'INFO':
        return '🔵';
      default:
        return '⚪';
    }
  },

  // Gerar resumo textual do relatório
  generateReportSummary(report: IntegrityReport): string {
    const { problemas, score } = report;
    
    if (problemas.length === 0) {
      return `✅ Pedido ${report.numeroPedido} está íntegro (Score: ${score}/100)`;
    }

    const criticos = problemas.filter(p => p.tipo === 'CRITICO').length;
    const avisos = problemas.filter(p => p.tipo === 'AVISO').length;
    const infos = problemas.filter(p => p.tipo === 'INFO').length;

    let summary = `📊 Pedido ${report.numeroPedido} (Score: ${score}/100) - `;
    const parts = [];
    
    if (criticos > 0) parts.push(`${criticos} críticos`);
    if (avisos > 0) parts.push(`${avisos} avisos`);
    if (infos > 0) parts.push(`${infos} informativos`);
    
    summary += parts.join(', ');
    
    return summary;
  },

  // Verificar se problemas podem ser corrigidos automaticamente
  canAutoFix(problemas: IntegrityIssue[]): boolean {
    return problemas.some(problema => 
      problema.categoria === 'CALCULO' && 
      problema.valorEsperado !== undefined
    );
  },

  // Filtrar problemas por severidade
  filterProblemsBySeverity(problemas: IntegrityIssue[], severidade: IntegrityIssue['tipo'][]): IntegrityIssue[] {
    return problemas.filter(problema => severidade.includes(problema.tipo));
  },

  // Obter recomendações baseadas nos problemas
  generateRecommendations(problemas: IntegrityIssue[]): string[] {
    const recomendacoes: string[] = [];
    const categorias = new Set(problemas.map(p => p.categoria));

    if (categorias.has('REFERENCIA')) {
      recomendacoes.push('Verificar e corrigir referências órfãs (produtos, fornecedores, contratos)');
    }

    if (categorias.has('CALCULO')) {
      recomendacoes.push('Recalcular valores e subtotais do pedido');
    }

    if (categorias.has('DADOS')) {
      recomendacoes.push('Validar e corrigir dados básicos do pedido');
    }

    if (categorias.has('CONSISTENCIA')) {
      recomendacoes.push('Verificar consistência dos dados relacionados');
    }

    const criticos = problemas.filter(p => p.tipo === 'CRITICO').length;
    if (criticos > 0) {
      recomendacoes.push(`Priorizar correção de ${criticos} problemas críticos`);
    }

    if (recomendacoes.length === 0) {
      recomendacoes.push('Nenhuma ação necessária - dados íntegros');
    }

    return recomendacoes;
  },

  // Validar se relatório indica problemas críticos
  hasCriticalIssues(report: IntegrityReport): boolean {
    return report.problemas.some(problema => problema.tipo === 'CRITICO');
  },

  // Obter próxima ação recomendada
  getNextRecommendedAction(report: IntegrityReport): string {
    const criticos = report.problemas.filter(p => p.tipo === 'CRITICO');
    
    if (criticos.length > 0) {
      const calculosCriticos = criticos.filter(p => p.categoria === 'CALCULO');
      if (calculosCriticos.length > 0) {
        return 'Executar correção automática de cálculos';
      }
      
      const referenciasCriticas = criticos.filter(p => p.categoria === 'REFERENCIA');
      if (referenciasCriticas.length > 0) {
        return 'Corrigir referências órfãs manualmente';
      }
      
      return 'Revisar e corrigir problemas críticos';
    }

    const avisos = report.problemas.filter(p => p.tipo === 'AVISO');
    if (avisos.length > 0) {
      return 'Revisar avisos de consistência';
    }

    return 'Nenhuma ação necessária';
  }
};

export default pedidoIntegrityService;