import axios from 'axios';

const API_BASE_URL = '/api/v2/recebimentos';

/**
 * Serviço para APIs V2 de Recebimentos Parciais
 * 
 * Implementa as chamadas para o novo sistema que permite:
 * - Recebimentos parciais sucessivos
 * - Controle de saldo pendente
 * - Validações flexíveis
 */

export interface ItemRecebimentoParcial {
  produto_id: number;
  produto_nome: string;
  quantidade_pedida: number;
  quantidade_ja_recebida: number;
  quantidade_pendente: number;
  pode_receber_mais: boolean;
  campo_nova_entrada: {
    habilitado: boolean;
    maximo_permitido: number;
    placeholder: string;
  };
  historico_recebimentos: Array<{
    data: string;
    quantidade: number;
    usuario: string;
    observacoes?: string;
  }>;
}

export interface StatusRecebimento {
  id: number;
  status: string;
  progresso_percentual: number;
  total_itens: number;
  itens_conferidos: number;
  itens_pendentes: number;
  tem_divergencias: boolean;
}

export interface RecebimentoResponse {
  success: boolean;
  recebimento: StatusRecebimento;
  itens: ItemRecebimentoParcial[];
}

export interface RegistrarRecebimentoRequest {
  produto_id: number;
  quantidade_recebida: number;
  data_validade?: string;
  lote_fornecedor?: string;
  observacoes?: string;
  comprovante?: File;
  lote_numero?: string;
  lote_observacoes?: string;
}

export interface RegistrarRecebimentoResponse {
  success: boolean;
  message: string;
  item_atualizado: ItemRecebimentoParcial;
  status_recebimento: StatusRecebimento;
  resumo: {
    produto_nome: string;
    quantidade_registrada: number;
    novo_total_recebido: number;
    saldo_pendente: number;
    pode_receber_mais: boolean;
  };
}

/**
 * Listar itens com controle de saldo pendente
 */
export const listarItensComSaldoPendente = async (recebimentoId: number): Promise<RecebimentoResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${recebimentoId}/itens-pendentes`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao listar itens com saldo pendente:', error);
    throw new Error(error.response?.data?.message || 'Erro ao carregar itens');
  }
};

/**
 * Registrar novo recebimento parcial
 */
export const registrarRecebimentoParcial = async (
  recebimentoId: number, 
  dados: RegistrarRecebimentoRequest
): Promise<RegistrarRecebimentoResponse> => {
  try {
    // Se há arquivo, usar FormData
    if (dados.comprovante) {
      const formData = new FormData();
      formData.append('produto_id', dados.produto_id.toString());
      formData.append('quantidade_recebida', dados.quantidade_recebida.toString());
      if (dados.data_validade) formData.append('data_validade', dados.data_validade);
      if (dados.lote_fornecedor) formData.append('lote_fornecedor', dados.lote_fornecedor);
      if (dados.observacoes) formData.append('observacoes', dados.observacoes);
      if (dados.lote_numero) formData.append('lote_numero', dados.lote_numero);
      if (dados.lote_observacoes) formData.append('lote_observacoes', dados.lote_observacoes);
      formData.append('comprovante', dados.comprovante);

      const response = await axios.post(`${API_BASE_URL}/${recebimentoId}/registrar-parcial`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // Sem arquivo, enviar JSON normal
      const response = await axios.post(`${API_BASE_URL}/${recebimentoId}/registrar-parcial`, dados);
      return response.data;
    }
  } catch (error: any) {
    console.error('Erro ao registrar recebimento parcial:', error);
    throw new Error(error.response?.data?.message || 'Erro ao registrar recebimento');
  }
};

/**
 * Obter status detalhado do recebimento
 */
export const obterStatusRecebimento = async (recebimentoId: number): Promise<{ success: boolean; status: StatusRecebimento }> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${recebimentoId}/status`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao obter status do recebimento:', error);
    throw new Error(error.response?.data?.message || 'Erro ao obter status');
  }
};

/**
 * Finalizar recebimento (mesmo com itens pendentes)
 */
export const finalizarRecebimento = async (
  recebimentoId: number, 
  forcar: boolean = false
): Promise<{ success: boolean; message: string; status_final: StatusRecebimento }> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${recebimentoId}/finalizar`, { forcar });
    return response.data;
  } catch (error: any) {
    console.error('Erro ao finalizar recebimento:', error);
    throw new Error(error.response?.data?.message || 'Erro ao finalizar recebimento');
  }
};

/**
 * Debug - obter situação detalhada do recebimento
 */
export const debugRecebimento = async (recebimentoId: number): Promise<any> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${recebimentoId}/debug`);
    return response.data;
  } catch (error: any) {
    console.error('Erro no debug do recebimento:', error);
    throw new Error(error.response?.data?.message || 'Erro no debug');
  }
};

/**
 * Criar novo recebimento
 */
export const criarRecebimento = async (pedidoId: number): Promise<any> => {
  try {
    const response = await axios.post('/api/v2/recebimentos', {
      pedido_id: pedidoId,
      tipo_recebimento: 'NORMAL'
    });
    return response.data;
  } catch (error: any) {
    console.error('Erro ao criar recebimento:', error);
    throw new Error(error.response?.data?.message || 'Erro ao criar recebimento');
  }
};