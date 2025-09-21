import api from './api';

export interface SaldoContratoItem {
  id: number;
  contrato_id: number;
  produto_id: number;
  produto_nome: string;
  unidade: string;
  contrato_numero: string;
  data_inicio: string;
  data_fim: string;
  fornecedor_id: number;
  fornecedor_nome: string;
  contrato_status: string;
  
  // Quantidades
  quantidade_total: number;
  quantidade_utilizada: number;
  
  quantidade_disponivel_real: number;
  
  // Valores
  preco_unitario: number;
  valor_total_disponivel: number;
  
  // Status
  status: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO';
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
      
      const response = await api.get(`/saldo-contratos?${params.toString()}`);
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
      const response = await api.get('/saldo-contratos/fornecedores');
      return response.data.data;
    } catch (error) {
      console.error('Erro ao listar fornecedores:', error);
      throw error;
    }
  }

  /**
   * Registra consumo de um produto do contrato
   */
  async registrarConsumo(contratoProdutoId: number, quantidade: number, observacao?: string): Promise<any> {
    try {
      // Obter ID do usuário do localStorage ou contexto
      const usuarioId = localStorage.getItem('userId') || '1'; // Temporário - deve vir do contexto de autenticação
      
      const response = await api.post(`/saldo-contratos/${contratoProdutoId}/consumir`, {
        quantidade,
        observacao,
        usuario_id: parseInt(usuarioId)
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao registrar consumo:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de consumos de um contrato/produto
   */
  async buscarHistoricoConsumos(contratoProdutoId: number): Promise<any> {
    try {
      const response = await api.get(`/saldo-contratos/${contratoProdutoId}/historico-consumo`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de consumos:', error);
      throw error;
    }
  }

  /**
   * Deleta um consumo registrado
   * @param id - ID do consumo a ser deletado
   * @param usuarioId - ID do usuário que está deletando
   * @returns Promise com o resultado da operação
   */
  async deletarConsumo(id: number, usuarioId: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await api.delete(`/saldo-contratos/consumo/${id}`, {
        data: { usuario_id: usuarioId }
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar consumo:', error);
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
        ...dadosCompletos.data.map(item => {
          const percentual = item.quantidade_total > 0 
            ? ((item.quantidade_utilizada / item.quantidade_total) * 100).toFixed(2)
            : '0.00';
          
          return [
            `"${item.contrato_numero}"`,
            `"${item.fornecedor_nome}"`,
            `"${item.produto_nome}"`,
            `"${item.unidade}"`,
            item.quantidade_total,
            item.quantidade_utilizada,
            item.quantidade_disponivel_real,
            item.preco_unitario,
            item.valor_total_disponivel,
            `"${item.status}"`,
            `${percentual}%`,
            `"${new Date(item.data_inicio).toLocaleDateString('pt-BR')}"`,
            `"${new Date(item.data_fim).toLocaleDateString('pt-BR')}"`
          ].join(',');
        })
      ].join('\n');
      
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      throw error;
    }
  }
}

export default new SaldoContratosService();