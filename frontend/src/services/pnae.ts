// Serviços para API PNAE
import api from './api';

export interface DashboardPNAE {
  ano: number;
  valor_recebido_fnde: number;
  percentual_minimo_obrigatorio: number;
  agricultura_familiar: {
    percentual_af: string | number;
    valor_total: string | number;
    valor_af: string | number;
    total_pedidos: string | number;
    valor_minimo_obrigatorio: string | number;
    valor_faltante: string | number;
  };
  fornecedores: {
    total: string | number;
    vencidos: string | number;
    vencendo: string | number;
  };
  evolucao_mensal: Array<{
    mes: number;
    mes_nome: string;
    valor_total: string | number;
    valor_af: string | number;
    valor_total_acumulado: string | number;
    valor_af_acumulado: string | number;
    percentual_af: string | number;
  }>;
  contratos?: {
    total: string | number;
    com_af: string | number;
  };
  alertas: {
    atende_30_porcento: boolean;
    atende_45_porcento?: boolean;
    total_alertas?: string | number;
    fornecedores_vencidos: boolean;
    fornecedores_vencendo: boolean;
  };
}

export interface RelatorioAgriculturaFamiliar {
  resumo: {
    total_pedidos: number;
    total_fornecedores: number;
    valor_total: number;
    valor_agricultura_familiar: number;
    percentual_agricultura_familiar: number;
    atende_requisito_30_porcento: boolean;
  };
  detalhamento_fornecedores: Array<{
    fornecedor_id: number;
    fornecedor_nome: string;
    tipo_fornecedor: string;
    total_pedidos: number;
    valor_total: number;
    valor_agricultura_familiar: number;
  }>;
  periodo: {
    ano: string | number;
    mes_inicio: string | number;
    mes_fim: string | number;
  };
}

export interface RelatorioPerCapita {
  modalidades: Array<{
    modalidade_id: number;
    modalidade_nome: string;
    ano: number;
    valor_per_capita: number;
    dias_letivos: number;
    total_pedidos: number;
    valor_total_gasto: number;
    total_escolas: number;
    valor_per_capita_real: number;
  }>;
  ano: number;
}

export interface ValorPerCapita {
  id: number;
  modalidade_id: number;
  modalidade_nome: string;
  ano: number;
  valor_per_capita: number;
  dias_letivos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelatorioSalvo {
  id: number;
  tipo_relatorio: string;
  ano: number;
  mes?: number;
  periodo_inicio: string;
  periodo_fim: string;
  percentual_agricultura_familiar?: number;
  valor_total?: number;
  valor_agricultura_familiar?: number;
  gerado_por?: number;
  gerado_por_nome?: string;
  gerado_em: string;
  observacoes?: string;
  dados_json?: any;
}

// Dashboard
export const getDashboardPNAE = async (): Promise<DashboardPNAE> => {
  const response = await api.get('/pnae/dashboard');
  return response.data.data;
};

// Relatórios
export const getRelatorioAgriculturaFamiliar = async (params?: {
  ano?: number;
  mes_inicio?: number;
  mes_fim?: number;
}): Promise<RelatorioAgriculturaFamiliar> => {
  const response = await api.get('/pnae/relatorios/agricultura-familiar', { params });
  return response.data.data;
};

export const getRelatorioPerCapita = async (params?: {
  ano?: number;
}): Promise<RelatorioPerCapita> => {
  const response = await api.get('/pnae/relatorios/per-capita', { params });
  return response.data.data;
};

export const listarRelatorios = async (params?: {
  tipo_relatorio?: string;
  ano?: number;
  mes?: number;
}): Promise<RelatorioSalvo[]> => {
  const response = await api.get('/pnae/relatorios', { params });
  return response.data.data;
};

export const salvarRelatorio = async (data: {
  tipo_relatorio: string;
  ano: number;
  mes?: number;
  periodo_inicio: string;
  periodo_fim: string;
  dados_json: any;
  percentual_agricultura_familiar?: number;
  valor_total?: number;
  valor_agricultura_familiar?: number;
  observacoes?: string;
}): Promise<RelatorioSalvo> => {
  const response = await api.post('/pnae/relatorios', data);
  return response.data.data;
};

// Valores Per Capita
export const getValoresPerCapita = async (params?: {
  ano?: number;
}): Promise<ValorPerCapita[]> => {
  const response = await api.get('/pnae/per-capita', { params });
  return response.data.data;
};

export const criarValorPerCapita = async (data: {
  modalidade_id: number;
  ano: number;
  valor_per_capita: number;
  dias_letivos?: number;
}): Promise<ValorPerCapita> => {
  const response = await api.post('/pnae/per-capita', data);
  return response.data.data;
};

export const atualizarValorPerCapita = async (
  id: number,
  data: {
    valor_per_capita?: number;
    dias_letivos?: number;
    ativo?: boolean;
  }
): Promise<ValorPerCapita> => {
  const response = await api.put(`/pnae/per-capita/${id}`, data);
  return response.data.data;
};
