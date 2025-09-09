import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.18.12:3000";

// Interface RelatorioConsistencia removida - módulo de relatórios descontinuado

export interface AuditoriaContrato {
  contrato_id: number;
  produto_id: number;
  nome_produto: string;
  saldo_inicial: number;
  total_pedido: number;
  total_recebido: number;
  total_faturado: number;
  saldo_atual: number;
  divergencias: string[];
  status_auditoria: 'OK' | 'DIVERGENCIA' | 'CRITICA';
}

class ConsistenciaService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Interceptor para adicionar token de autenticação
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Verifica a consistência de dados de um pedido específico
   */
  async verificarConsistenciaPedido(pedidoId: number): Promise<any> {
    try {
      const response = await this.api.get(`/consistencia/pedido/${pedidoId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar consistência do pedido:', error);
      throw error;
    }
  }

  /**
   * Verifica a consistência de todos os pedidos
   */
  async verificarConsistenciaGeral(): Promise<any[]> {
    try {
      const response = await this.api.get('/consistencia/geral');
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar consistência geral:', error);
      throw error;
    }
  }

  /**
   * Auditoria completa de um contrato
   */
  async auditoriaContrato(contratoId: number): Promise<AuditoriaContrato[]> {
    try {
      const response = await this.api.get(`/consistencia/contrato/${contratoId}`);
      return response.data;
    } catch (error) {
      console.error('Erro na auditoria do contrato:', error);
      throw error;
    }
  }

  /**
   * Sincroniza dados entre módulos (força recálculo)
   */
  async sincronizarDados(pedidoId?: number): Promise<{ sucesso: boolean; mensagem: string }> {
    try {
      const endpoint = pedidoId ? `/consistencia/sincronizar/${pedidoId}` : '/consistencia/sincronizar';
      const response = await this.api.post(endpoint);
      return response.data;
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      throw error;
    }
  }

  // Função relatorioDivergencias removida - módulo de relatórios descontinuado

  /**
   * Dashboard de consistência em tempo real
   */
  async dashboardConsistencia(): Promise<{
    resumo_geral: {
      total_pedidos: number;
      pedidos_consistentes: number;
      pedidos_com_divergencia: number;
      percentual_consistencia: number;
    };
    alertas_criticos: Array<{
      tipo: string;
      pedido_id: number;
      numero_pedido: string;
      descricao: string;
      data_deteccao: string;
    }>;
    metricas_por_status: Array<{
      status: string;
      quantidade: number;
      percentual_consistencia: number;
    }>;
  }> {
    try {
      const response = await this.api.get('/consistencia/dashboard');
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar dashboard de consistência:', error);
      throw error;
    }
  }
}

export const consistenciaService = new ConsistenciaService();