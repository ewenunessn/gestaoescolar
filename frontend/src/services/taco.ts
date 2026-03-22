import { apiWithRetry } from './api';

export interface TacoAlimento {
  id: number;
  nome: string;
  categoria: string;
  energia_kcal: number | null;
  proteina_g: number | null;
  lipideos_g: number | null;
  carboidratos_g: number | null;
  fibra_alimentar_g: number | null;
  calcio_mg: number | null;
  ferro_mg: number | null;
  sodio_mg: number | null;
  vitamina_c_mg: number | null;
  vitamina_a_mcg: number | null;
  gorduras_saturadas_g: number | null;
  colesterol_mg: number | null;
}

export async function buscarTaco(q: string): Promise<TacoAlimento[]> {
  const { data } = await apiWithRetry.get('/taco/buscar', { params: { q } });
  return data.data || [];
}

/** Mapeia um alimento TACO para os campos de composição nutricional do sistema */
export function mapearTacoParaComposicao(alimento: TacoAlimento) {
  return {
    calorias: alimento.energia_kcal ?? '',
    proteinas: alimento.proteina_g ?? '',
    gorduras: alimento.lipideos_g ?? '',
    carboidratos: alimento.carboidratos_g ?? '',
    fibras: alimento.fibra_alimentar_g ?? '',
    calcio: alimento.calcio_mg ?? '',
    ferro: alimento.ferro_mg ?? '',
    sodio: alimento.sodio_mg ?? '',
    vitamina_c: alimento.vitamina_c_mg ?? '',
    vitamina_a: alimento.vitamina_a_mcg ?? '',
    gorduras_saturadas_g: alimento.gorduras_saturadas_g ?? '',
    colesterol: alimento.colesterol_mg ?? '',
  };
}
