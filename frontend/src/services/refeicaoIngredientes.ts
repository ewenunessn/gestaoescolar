import api from './api';

export interface IngredienteDetalhado {
  produto_id: number;
  produto_nome: string;
  per_capita: number;
  per_capita_bruto?: number | null;
  per_capita_liquido?: number | null;
  fator_correcao?: number | null;
  tipo_medida: string;
  // Valores por 100g do produto
  proteinas_100g: number | null;
  lipidios_100g: number | null;
  carboidratos_100g: number | null;
  calcio_100g: number | null;
  ferro_100g: number | null;
  vitamina_a_100g: number | null;
  vitamina_c_100g: number | null;
  sodio_100g: number | null;
  // Valores calculados para o per capita
  proteinas_porcao: number;
  lipidios_porcao: number;
  carboidratos_porcao: number;
  calcio_porcao: number;
  ferro_porcao: number;
  vitamina_a_porcao: number;
  vitamina_c_porcao: number;
  sodio_porcao: number;
}

export interface IngredientesDetalhadosResponse {
  ingredientes: IngredienteDetalhado[];
}

export async function buscarIngredientesDetalhados(
  refeicaoId: number, 
  modalidadeId: number | null = null
): Promise<IngredientesDetalhadosResponse> {
  const params = modalidadeId ? { modalidade_id: modalidadeId } : {};
  const response = await api.get(`/refeicoes/${refeicaoId}/ingredientes-detalhados`, { params });
  return response.data;
}
