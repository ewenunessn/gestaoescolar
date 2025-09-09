import api from './api';
import {
  ItemFaturamentoAgrupado,
  FornecedorAgrupado,
  ContratoDisponivel,
  ModalidadeFaturamento,
  NovoFaturamentoRequest,
  NovoFaturamentoResponse,
  FiltrosFaturamento,
  FiltrosContratos,
  FiltrosModalidades,
  ResponsePaginado
} from '../types/faturamentoInterface';

class FaturamentoInterfaceService {
  private baseUrl = '/faturamento-interface';

  /**
   * Lista itens de faturamento agrupados por fornecedor e contrato
   */
  async listarItensAgrupados(filtros: FiltrosFaturamento = {}): Promise<ResponsePaginado<FornecedorAgrupado>> {
    try {
      const params = new URLSearchParams();
      
      if (filtros.status_recebimento) params.append('status_recebimento', filtros.status_recebimento);
      if (filtros.fornecedor_id) params.append('fornecedor_id', filtros.fornecedor_id.toString());
      if (filtros.contrato_id) params.append('contrato_id', filtros.contrato_id.toString());
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.page) params.append('page', filtros.page.toString());
      if (filtros.limit) params.append('limit', filtros.limit.toString());

      const response = await api.get(`${this.baseUrl}/itens-agrupados?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar itens agrupados:', error);
      throw error;
    }
  }

  /**
   * Lista contratos disponíveis para seleção
   */
  async listarContratosDisponiveis(filtros: FiltrosContratos = {}): Promise<ResponsePaginado<ContratoDisponivel>> {
    try {
      const params = new URLSearchParams();
      
      if (filtros.fornecedor_id) params.append('fornecedor_id', filtros.fornecedor_id.toString());
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.busca) params.append('busca', filtros.busca);
      if (filtros.page) params.append('page', filtros.page.toString());
      if (filtros.limit) params.append('limit', filtros.limit.toString());

      const response = await api.get(`${this.baseUrl}/contratos-disponiveis?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar contratos disponíveis:', error);
      throw error;
    }
  }

  /**
   * Lista modalidades de faturamento cadastradas
   */
  async listarModalidades(filtros: FiltrosModalidades = {}): Promise<ModalidadeFaturamento[]> {
    try {
      const params = new URLSearchParams();
      
      if (filtros.ativa !== undefined) params.append('ativa', filtros.ativa.toString());

      const response = await api.get(`${this.baseUrl}/modalidades?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar modalidades:', error);
      throw error;
    }
  }

  /**
   * Cria um novo faturamento
   */
  async criarNovoFaturamento(dados: NovoFaturamentoRequest): Promise<NovoFaturamentoResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/criar-faturamento`, dados);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar novo faturamento:', error);
      throw error;
    }
  }

  /**
   * Busca itens de um contrato específico para seleção
   */
  async buscarItensContrato(contratoId: number): Promise<ItemFaturamentoAgrupado[]> {
    try {
      const response = await this.listarItensAgrupados({ contrato_id: contratoId });
      
      // Extrai todos os itens de todos os fornecedores e contratos
      const itens: ItemFaturamentoAgrupado[] = [];
      response.data.forEach(fornecedor => {
        fornecedor.contratos.forEach(contrato => {
          if (contrato.contrato_id === contratoId) {
            itens.push(...contrato.itens);
          }
        });
      });
      
      return itens;
    } catch (error) {
      console.error('Erro ao buscar itens do contrato:', error);
      throw error;
    }
  }

  /**
   * Valida se as modalidades selecionadas somam 100%
   */
  validarModalidades(modalidades: { modalidade_id: number; percentual: number }[]): boolean {
    const somaPercentuais = modalidades.reduce((soma, modalidade) => soma + modalidade.percentual, 0);
    return Math.abs(somaPercentuais - 100) < 0.01; // Tolerância para arredondamento
  }

  /**
   * Calcula o valor de cada modalidade baseado no valor total
   */
  calcularValoresModalidades(
    valorTotal: number, 
    modalidades: { modalidade_id: number; percentual: number }[]
  ): { modalidade_id: number; valor: number; percentual: number }[] {
    return modalidades.map(modalidade => ({
      modalidade_id: modalidade.modalidade_id,
      valor: (valorTotal * modalidade.percentual) / 100,
      percentual: modalidade.percentual
    }));
  }
}

export default new FaturamentoInterfaceService();