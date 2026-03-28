/**
 * Utilitário para cálculo automático do fator de conversão
 * entre unidade_compra (contrato) e unidade_distribuicao (produto base)
 */

// Unidades que são baseadas em peso (gramas)
const UNIDADES_PESO_G = ['G', 'GRAMA', 'GRAMAS'];
const UNIDADES_PESO_KG = ['KG', 'QUILOGRAMA', 'QUILOGRAMAS', 'KILO', 'KILOS'];
// Unidades que são baseadas em volume (ml)
const UNIDADES_VOLUME_ML = ['ML', 'MILILITRO', 'MILILITROS'];
const UNIDADES_VOLUME_L = ['L', 'LITRO', 'LITROS'];
// Unidades de contagem
const UNIDADES_CONTAGEM = ['UN', 'UNIDADE', 'UNIDADES'];

function normalizar(u: string | null | undefined): string {
  return (u || '').toUpperCase().trim();
}

export interface ResultadoFator {
  fator: number | null;
  automatico: boolean;
  descricao: string;
}

/**
 * Tenta calcular o fator de conversão automaticamente.
 * Retorna null se não for possível calcular (precisa de entrada manual).
 *
 * @param unidadeCompra   - unidade do contrato (ex: "PCT", "SC", "KG", "CUB")
 * @param pesoEmbalagem   - peso em gramas da embalagem (ex: 345, 500, 50000)
 * @param unidadeDistrib  - unidade de distribuição do produto (ex: "G", "KG", "UN", "L")
 */
export function calcularFatorConversao(
  unidadeCompra: string | null | undefined,
  pesoEmbalagem: number | null | undefined,
  unidadeDistrib: string | null | undefined
): ResultadoFator {
  const uc = normalizar(unidadeCompra);
  const ud = normalizar(unidadeDistrib);

  // Sem dados suficientes
  if (!uc || !ud) {
    return { fator: null, automatico: false, descricao: 'Informe a unidade de compra e a unidade de distribuição' };
  }

  // Caso 1: mesma unidade → fator = 1
  if (uc === ud) {
    return { fator: 1, automatico: true, descricao: `1 ${uc} = 1 ${ud}` };
  }

  // Caso 2: KG → G
  if (UNIDADES_PESO_KG.includes(uc) && UNIDADES_PESO_G.includes(ud)) {
    return { fator: 1000, automatico: true, descricao: `1 KG = 1000 G` };
  }

  // Caso 3: G → KG
  if (UNIDADES_PESO_G.includes(uc) && UNIDADES_PESO_KG.includes(ud)) {
    return { fator: 0.001, automatico: true, descricao: `1 G = 0,001 KG` };
  }

  // Caso 4: L → ML
  if (UNIDADES_VOLUME_L.includes(uc) && UNIDADES_VOLUME_ML.includes(ud)) {
    return { fator: 1000, automatico: true, descricao: `1 L = 1000 ML` };
  }

  // Caso 5: ML → L
  if (UNIDADES_VOLUME_ML.includes(uc) && UNIDADES_VOLUME_L.includes(ud)) {
    return { fator: 0.001, automatico: true, descricao: `1 ML = 0,001 L` };
  }

  // Caso 6: embalagem (PCT, SC, CX, FD, etc.) com peso → unidade em gramas
  const temPeso = pesoEmbalagem && pesoEmbalagem > 0;
  const ucEhEmbalagem = !UNIDADES_PESO_G.includes(uc) && !UNIDADES_PESO_KG.includes(uc) &&
                        !UNIDADES_VOLUME_ML.includes(uc) && !UNIDADES_VOLUME_L.includes(uc) &&
                        !UNIDADES_CONTAGEM.includes(uc);

  if (ucEhEmbalagem && temPeso) {
    if (UNIDADES_PESO_G.includes(ud)) {
      return {
        fator: pesoEmbalagem!,
        automatico: true,
        descricao: `1 ${uc} (${pesoEmbalagem}g) = ${pesoEmbalagem} G`
      };
    }
    if (UNIDADES_PESO_KG.includes(ud)) {
      const fator = pesoEmbalagem! / 1000;
      return {
        fator,
        automatico: true,
        descricao: `1 ${uc} (${pesoEmbalagem}g) = ${fator.toFixed(3)} KG`
      };
    }
    if (UNIDADES_VOLUME_ML.includes(ud)) {
      // Assumindo densidade ~1 (água): gramas ≈ ml
      return {
        fator: pesoEmbalagem!,
        automatico: true,
        descricao: `1 ${uc} (${pesoEmbalagem}g ≈ ${pesoEmbalagem}ml) = ${pesoEmbalagem} ML`
      };
    }
    if (UNIDADES_VOLUME_L.includes(ud)) {
      const fator = pesoEmbalagem! / 1000;
      return {
        fator,
        automatico: true,
        descricao: `1 ${uc} (${pesoEmbalagem}g ≈ ${pesoEmbalagem}ml) = ${fator.toFixed(3)} L`
      };
    }
  }

  // Caso 7: embalagem sem peso, ou unidade de contagem diferente → manual
  return {
    fator: null,
    automatico: false,
    descricao: `Informe quantas ${ud || 'unidades base'} equivalem a 1 ${uc}`
  };
}

/**
 * Formata o fator para exibição amigável
 */
export function formatarFator(fator: number | null | undefined): string {
  if (fator === null || fator === undefined) return '-';
  if (fator === Math.floor(fator)) return fator.toString();
  return fator.toFixed(4).replace(/\.?0+$/, '');
}
