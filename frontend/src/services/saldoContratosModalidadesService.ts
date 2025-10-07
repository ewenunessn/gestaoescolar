import api from './api';

export interface SaldoContratoModalidadeItem {
  id: number;
  contrato_produto_id: number;
  modalidade_id: number;
  quantidade_inicial: number;
  quantidade_consumida: number;
  quantidade_disponivel: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  
  // Dados do contrato produto
  contrato_id: number;
  produto_id: number;
  quantidade_contrato: number;
  preco_unitario: number;
  saldo_contrato: number;
  
  // Dados do contrato
  contrato_numero: string;
  data_inicio: string;
  data_fim: string;
  contrato_status: string;
  
  // Dados do produto
  produto_nome: string;
  unidade: string;
  
  // Dados da modalidade
  modalidade_nome: string;
  modalidade_codigo_financeiro?: string;
  modalidade_valor_repasse: number;
  
  // Dados do fornecedor
  fornecedor_id: number;
  fornecedor_nome: string;
  
  // Cálculos
  valor_disponivel: number;
  status: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO';
}

export interface ModalidadeOption {
  id: number;
  nome: string;
  codigo_financeiro?: string;
  valor_repasse: number;
}

export interface ProdutoContratoOption {
  id: number;
  contrato_id: number;
  produto_id: number;
  preco_unitario: number;
  contrato_numero: string;
  data_inicio: string;
  data_fim: string;
  produto_nome: string;
  unidade: string;
  fornecedor_nome: string;
}

export interface SaldoContratosModalidadesResponse {
  success: boolean;
  data: SaldoContratoModalidadeItem[];
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
    quantidade_inicial_total: number;
    quantidade_consumida_total: number;
    quantidade_disponivel_total: number;
    valor_total_disponivel: number;
  };
}

export interface SaldoContratosModalidadesFilters {
  page?: number;
  limit?: number;
  status?: 'DISPONIVEL' | 'BAIXO_ESTOQUE' | 'ESGOTADO';
  contrato_numero?: string;
  produto_nome?: string;
  fornecedor_id?: number;
  modalidade_id?: number;
}

export interface CadastrarSaldoModalidadeRequest {
  contrato_produto_id: number;
  modalidade_id: number;
  quantidade_inicial: number;
}

class SaldoContratosModalidadesService {
  /**
   * Lista todos os saldos por modalidade com filtros
   */
  async listarSaldosModalidades(filtros: SaldoContratosModalidadesFilters = {}): Promise<SaldoContratosModalidadesResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await api.get(`/saldo-contratos-modalidades?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar saldos por modalidade:', error);
      throw error;
    }
  }

  /**
   * Lista modalidades disponíveis
   */
  async listarModalidades(): Promise<ModalidadeOption[]> {
    try {
      const response = await api.get('/saldo-contratos-modalidades/modalidades');
      return response.data.data;
    } catch (error) {
      console.error('Erro ao listar modalidades:', error);
      throw error;
    }
  }

  /**
   * Lista produtos de contratos disponíveis
   */
  async listarProdutosContratos(): Promise<ProdutoContratoOption[]> {
    try {
      const response = await api.get('/saldo-contratos-modalidades/produtos-contratos');
      return response.data.data;
    } catch (error) {
      console.error('Erro ao listar produtos de contratos:', error);
      throw error;
    }
  }

  /**
   * Cadastra ou atualiza saldo por modalidade
   */
  async cadastrarSaldoModalidade(dados: CadastrarSaldoModalidadeRequest): Promise<any> {
    try {
      const response = await api.post('/saldo-contratos-modalidades', dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao cadastrar saldo por modalidade:', error);
      throw error;
    }
  }

  /**
   * Registra consumo por modalidade
   */
  async registrarConsumoModalidade(id: number, quantidade: number, observacao?: string, dataConsumo?: string): Promise<any> {
    try {
      // Obter ID do usuário do localStorage ou contexto
      const usuarioId = localStorage.getItem('userId') || '1'; // Temporário - deve vir do contexto de autenticação
      
      const response = await api.post(`/saldo-contratos-modalidades/${id}/consumir`, {
        quantidade,
        observacao,
        data_consumo: dataConsumo,
        usuario_id: parseInt(usuarioId)
      });
      
      return response.data;
    } catch (error) {
      console.error('Erro ao registrar consumo por modalidade:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de consumos por modalidade
   */
  async buscarHistoricoConsumoModalidade(id: number): Promise<any> {
    try {
      const response = await api.get(`/saldo-contratos-modalidades/${id}/historico`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar histórico de consumo por modalidade:', error);
      throw error;
    }
  }

  /**
   * Exclui um registro de consumo
   */
  async excluirConsumoModalidade(saldoId: number, consumoId: number): Promise<any> {
    try {
      const response = await api.delete(`/saldo-contratos-modalidades/${saldoId}/consumo/${consumoId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao excluir consumo:', error);
      throw error;
    }
  }

  /**
   * Exporta dados para CSV
   */
  async exportarCSV(filtros: SaldoContratosModalidadesFilters = {}): Promise<Blob> {
    try {
      // Buscar todos os dados sem paginação
      const dadosCompletos = await this.listarSaldosModalidades({ ...filtros, limit: 10000 });
      
      // Criar CSV
      const headers = [
        'Contrato',
        'Fornecedor',
        'Produto',
        'Modalidade',
        'Código Financeiro',
        'Unidade',
        'Qtd Inicial',
        'Qtd Consumida',
        'Qtd Disponível',
        'Valor Unitário',
        'Valor Disponível',
        'Status',
        'Data Início',
        'Data Fim'
      ];
      
      const csvContent = [
        headers.join(','),
        ...dadosCompletos.data.map(item => [
          `"${item.contrato_numero}"`,
          `"${item.fornecedor_nome}"`,
          `"${item.produto_nome}"`,
          `"${item.modalidade_nome}"`,
          `"${item.modalidade_codigo_financeiro || ''}"`,
          `"${item.unidade}"`,
          item.quantidade_inicial,
          item.quantidade_consumida,
          item.quantidade_disponivel,
          item.preco_unitario,
          item.valor_disponivel,
          `"${item.status}"`,
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

export default new SaldoContratosModalidadesService();