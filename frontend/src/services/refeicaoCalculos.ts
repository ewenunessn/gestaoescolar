import api from './api';

export interface ValoresNutricionais {
  total: {
    calorias: number;
    proteinas: number;
    carboidratos: number;
    lipidios: number;
    fibras: number;
    sodio: number;
    calcio: number;
    ferro: number;
    vitamina_a: number;
    vitamina_c: number;
  };
  por_porcao: {
    calorias: number;
    proteinas: number;
    carboidratos: number;
    lipidios: number;
    fibras: number;
    sodio: number;
    calcio: number;
    ferro: number;
    vitamina_a: number;
    vitamina_c: number;
  };
  rendimento_porcoes: number;
  alertas: Array<{ tipo: string; mensagem: string }>;
  ingredientes_sem_info: string[];
  aviso: string | null;
}

export interface CustoRefeicao {
  custo_total: number;
  custo_por_porcao: number;
  rendimento_porcoes: number;
  detalhamento: Array<{
    produto: string;
    quantidade: number;
    unidade: string;
    preco_unitario: number | null;
    custo: number | null;
    aviso?: string;
  }>;
  ingredientes_sem_preco: string[];
  alertas: Array<{ tipo: string; mensagem: string }>;
  aviso: string | null;
}

export interface CalculosAutomaticos {
  message: string;
  valores_nutricionais: ValoresNutricionais;
  custo: CustoRefeicao;
  alertas: Array<{ tipo: string; mensagem: string }>;
}

// Calcular valores nutricionais de uma refeição
export const calcularValoresNutricionais = async (
  refeicaoId: number,
  rendimentoPorcoes: number,
  modalidadeId: number | null = null
): Promise<ValoresNutricionais> => {
  const response = await api.post(`/refeicoes/${refeicaoId}/calcular-nutricional`, {
    rendimento_porcoes: rendimentoPorcoes,
    modalidade_id: modalidadeId
  });
  return response.data;
};

// Calcular custo de uma refeição
export const calcularCusto = async (
  refeicaoId: number,
  rendimentoPorcoes: number,
  modalidadeId: number | null = null
): Promise<CustoRefeicao> => {
  const response = await api.post(`/refeicoes/${refeicaoId}/calcular-custo`, {
    rendimento_porcoes: rendimentoPorcoes,
    modalidade_id: modalidadeId
  });
  return response.data;
};

// Aplicar cálculos automáticos e salvar na refeição
export const aplicarCalculosAutomaticos = async (
  refeicaoId: number,
  rendimentoPorcoes: number
): Promise<CalculosAutomaticos> => {
  const response = await api.post(`/refeicoes/${refeicaoId}/aplicar-calculos`, {
    rendimento_porcoes: rendimentoPorcoes
  });
  return response.data;
};
