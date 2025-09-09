import { apiWithRetry } from './api';

export interface AditivoContrato {
  id: number;
  contrato_id: number;
  contrato_produto_id?: number;
  tipo: 'QUANTIDADE' | 'PRAZO';
  quantidade_adicional?: number;
  percentual_aumento?: number;
  dias_adicionais?: number;
  nova_data_fim?: string;
  justificativa: string;
  numero_aditivo?: string;
  data_assinatura: string;
  valor_adicional?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Campos adicionais
  contrato_numero?: string;
  produto_nome?: string;
  quantidade_original?: number;
  fornecedor_nome?: string;
}

export interface CriarAditivoData {
  contrato_id: number;
  tipo: 'QUANTIDADE' | 'PRAZO';
  contrato_produto_id?: number;
  quantidade_adicional?: number;
  dias_adicionais?: number;
  nova_data_fim?: string;
  justificativa: string;
  numero_aditivo?: string;
  data_assinatura: string;
  valor_adicional?: number;
}

export interface ValidacaoQuantidade {
  pode_adicionar: boolean;
  produto_nome: string;
  quantidade_original: number;
  total_aditivos_existentes: number;
  percentual_atual: number;
  percentual_novo: number;
  quantidade_maxima_disponivel: number;
  percentual_disponivel: number;
}

export interface ProdutoContrato {
  id: number;
  produto_id: number;
  produto_nome: string;
  quantidade_original: number;
  quantidade_atual: number;
  total_aditivos: number;
  percentual_aditivos: number;
}

// Listar aditivos de um contrato
export const listarAditivosContrato = async (contratoId: number): Promise<AditivoContrato[]> => {
  try {
    const response = await apiWithRetry.get(`/aditivos-contratos/contrato/${contratoId}`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('Erro ao listar aditivos do contrato:', error);
    throw new Error(error.response?.data?.error || 'Erro ao carregar aditivos do contrato');
  }
};

// Criar novo aditivo
export const criarAditivo = async (dadosAditivo: CriarAditivoData): Promise<AditivoContrato> => {
  try {
    const response = await apiWithRetry.post('/aditivos-contratos', dadosAditivo);
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao criar aditivo:', error);
    throw new Error(error.response?.data?.error || 'Erro ao criar aditivo');
  }
};

// Buscar aditivo por ID
export const buscarAditivo = async (aditivoId: number): Promise<AditivoContrato> => {
  try {
    const response = await apiWithRetry.get(`/aditivos-contratos/${aditivoId}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao buscar aditivo:', error);
    throw new Error(error.response?.data?.error || 'Erro ao buscar aditivo');
  }
};

// Remover aditivo
export const removerAditivo = async (aditivoId: number): Promise<void> => {
  try {
    await apiWithRetry.delete(`/aditivos-contratos/${aditivoId}`);
  } catch (error: any) {
    console.error('Erro ao remover aditivo:', error);
    throw new Error(error.response?.data?.error || 'Erro ao remover aditivo');
  }
};

// Calcular resumo de aditivos por contrato
export const calcularResumoAditivos = async (contratoId: number): Promise<ResumoAditivos> => {
  try {
    const response = await apiWithRetry.get(`/aditivos-contratos/contrato/${contratoId}/resumo`);
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao calcular resumo de aditivos:', error);
    throw new Error(error.response?.data?.error || 'Erro ao calcular resumo de aditivos');
  }
};

// Listar produtos de um contrato para aditivos
export const listarProdutosContrato = async (contratoId: number): Promise<ProdutoContrato[]> => {
  try {
    const response = await apiWithRetry.get(`/aditivos-contratos/contrato/${contratoId}/produtos`);
    return response.data.data || [];
  } catch (error: any) {
    console.error('Erro ao listar produtos do contrato:', error);
    throw new Error(error.response?.data?.error || 'Erro ao carregar produtos do contrato');
  }
};

// Validar aditivo de quantidade
export const validarAditivoQuantidade = async (
  contratoProdutoId: number,
  quantidadeAdicional: number
): Promise<ValidacaoQuantidade> => {
  try {
    const response = await apiWithRetry.post('/aditivos-contratos/validar-quantidade', {
      contrato_produto_id: contratoProdutoId,
      quantidade_adicional: quantidadeAdicional
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Erro ao validar aditivo de quantidade:', error);
    throw new Error(error.response?.data?.error || 'Erro ao validar aditivo de quantidade');
  }
};

export default {
  listarAditivosContrato,
  criarAditivo,
  buscarAditivo,
  removerAditivo,
  calcularResumoAditivos,
  listarProdutosContrato,
  validarAditivoQuantidade,
};