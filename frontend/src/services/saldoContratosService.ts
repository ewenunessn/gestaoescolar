import api from './api';

export interface SaldoContratoItem {
  contrato_produto_id: number;
  produto_id: number;
  produto_nome: string;
  produto_unidade: string;
  contrato_id: number;
  contrato_numero: string;
  data_inicio: string;
  data_fim: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  
  // Quantidades
  quantidade_original: number;
  // quantidade_aditivos: number; // Removido - módulo de aditivos excluído
  quantidade_total: number;
  quantidade_utilizada: number;
  quantidade_disponivel: number;
  quantidade_reservada: number;
  quantidade_disponivel_real: number;
  
  // Valores
  valor_unitario: number;
  valor_total_disponivel: number;
  
  // Status
  status: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO';
  percentual_utilizado: number;
}

export interface FornecedorOption {
  id: number;
  nome: string;
}

export interface SaldoContratosResponse {
  success: boolean;
  data: SaldoContratoItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  estatisticas: {
    total_itens: number;
    itens_disponiveis: number;
    itens_baixo_estoque: number;
    itens_esgotados: number;
    quantidade_total_geral: number;
    quantidade_utilizada_geral: number;
    quantidade_reservada_geral: number;
    quantidade_disponivel_geral: number;
    valor_total_disponivel: number;
  };
}

export interface SaldoContratosFilters {
  page?: number;
  limit?: number;
  status?: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO';
  contrato_numero?: string;
  produto_nome?: string;
  fornecedor_id?: number;
}

class SaldoContratosService {
  /**
   * Lista todos os saldos de contratos com filtros
   */
  async listarSaldos(filtros: SaldoContratosFilters = {}): Promise<SaldoContratosResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await api.get(`/saldos-contratos?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar saldos de contratos:', error);
      throw error;
    }
  }

  /**
   * Lista fornecedores disponíveis para filtro
   */
  async listarFornecedores(): Promise<FornecedorOption[]> {
    try {
      const response = await api.get('/saldos-contratos/fornecedores');
      return response.data.data;
    } catch (error) {
      console.error('Erro ao listar fornecedores:', error);
      throw error;
    }
  }

  /**
   * Exporta dados para CSV
   */
  async exportarCSV(filtros: SaldoContratosFilters = {}): Promise<Blob> {
    try {
      // Buscar todos os dados sem paginação
      const dadosCompletos = await this.listarSaldos({ ...filtros, limit: 10000 });
      
      // Criar CSV
      const headers = [
        'Contrato',
        'Fornecedor',
        'Produto',
        'Unidade',
        'Qtd Total',
        'Qtd Utilizada',
        'Qtd Reservada',
        'Qtd Disponível',
        'Valor Unitário',
        'Valor Total Disponível',
        'Status',
        'Percentual Utilizado',
        'Data Início',
        'Data Fim'
      ];
      
      const csvContent = [
        headers.join(','),
        ...dadosCompletos.data.map(item => [
          `"${item.contrato_numero}"`,
          `"${item.fornecedor_nome}"`,
          `"${item.produto_nome}"`,
          `"${item.produto_unidade}"`,
          item.quantidade_total,
          item.quantidade_utilizada,
          item.quantidade_reservada,
          item.quantidade_disponivel_real,
          item.valor_unitario,
          item.valor_total_disponivel,
          `"${item.status}"`,
          `${item.percentual_utilizado.toFixed(2)}%`,
          `"${new Date(item.data_inicio).toLocaleDateString('pt-BR')}"`,
          `"${new Date(item.data_fim).toLocaleDateString('pt-BR')}"`
        ].join(','))
      ].join('\n');
      
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      throw error;
    }
  }
}

export default new SaldoContratosService();