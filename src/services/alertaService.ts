import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Alerta {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  usuario_id: number;
  lido: boolean;
  data_criacao: string;
  data_expiracao?: string;
  metadados?: any;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  usuario_nome?: string;
}

export interface FiltroAlertas {
  tipo?: string;
  lido?: boolean;
  prioridade?: string;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  limit?: number;
}

export interface DashboardAlertas {
  resumo_por_tipo: Array<{
    tipo: string;
    total: number;
    nao_lidos: number;
  }>;
  resumo_por_prioridade: Array<{
    prioridade: string;
    total: number;
    nao_lidos: number;
  }>;
  alertas_recentes: Array<{
    data: string;
    total: number;
  }>;
}

class AlertaService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  async listarAlertas(filtros: FiltroAlertas = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await axios.get(
        `${API_URL}/alertas?${params.toString()}`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      throw error;
    }
  }

  async contarNaoLidos(): Promise<{ quantidade: number }> {
    try {
      const response = await axios.get(
        `${API_URL}/alertas/nao-lidos/count`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao contar alertas não lidos:', error);
      throw error;
    }
  }

  async marcarComoLido(alertaId: number) {
    try {
      const response = await axios.put(
        `${API_URL}/alertas/${alertaId}/marcar-lido`,
        {},
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar alerta como lido:', error);
      throw error;
    }
  }

  async marcarTodosComoLidos() {
    try {
      const response = await axios.put(
        `${API_URL}/alertas/marcar-todos-lidos`,
        {},
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar todos os alertas como lidos:', error);
      throw error;
    }
  }

  async obterDashboard(): Promise<DashboardAlertas> {
    try {
      const response = await axios.get(
        `${API_URL}/alertas/dashboard`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao obter dashboard de alertas:', error);
      throw error;
    }
  }

  async criarAlerta(alerta: {
    tipo: string;
    titulo: string;
    mensagem: string;
    usuario_destino_id?: number;
    prioridade?: string;
    data_expiracao?: string;
  }) {
    try {
      const response = await axios.post(
        `${API_URL}/alertas/criar`,
        alerta,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      throw error;
    }
  }

  async criarAlertaGeral(alerta: {
    tipo: string;
    titulo: string;
    mensagem: string;
    prioridade?: string;
    data_expiracao?: string;
  }) {
    try {
      const response = await axios.post(
        `${API_URL}/alertas/criar-geral`,
        alerta,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar alerta geral:', error);
      throw error;
    }
  }

  // Métodos utilitários
  formatarTipoAlerta(tipo: string): string {
    const tipos: { [key: string]: string } = {
      'pedido_atrasado': 'Pedido Atrasado',
      'divergencia_recebimento': 'Divergência no Recebimento',
      'produto_vencendo': 'Produto Vencendo',
      'estoque_minimo': 'Estoque Mínimo',
      'aprovacao_pendente': 'Aprovação Pendente',
      'fornecedor_atraso': 'Fornecedor em Atraso',
      'sistema_manutencao': 'Manutenção do Sistema'
    };
    return tipos[tipo] || tipo;
  }

  getCorPrioridade(prioridade: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
    switch (prioridade) {
      case 'critica': return 'error';
      case 'alta': return 'warning';
      case 'media': return 'info';
      case 'baixa': return 'default';
      default: return 'default';
    }
  }

  getIconePrioridade(prioridade: string): string {
    switch (prioridade) {
      case 'critica': return '🚨';
      case 'alta': return '⚠️';
      case 'media': return 'ℹ️';
      case 'baixa': return '📝';
      default: return 'ℹ️';
    }
  }
}

export const alertaService = new AlertaService();