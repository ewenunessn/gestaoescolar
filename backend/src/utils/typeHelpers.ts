/**
 * Helpers para normalização de tipos vindos do PostgreSQL.
 * O driver pg retorna NUMERIC/DECIMAL como string para evitar perda de precisão.
 * Essas funções garantem que os valores sejam sempre do tipo correto.
 */

/** Converte qualquer valor para number. Retorna defaultValue se inválido. Aceita vírgula como separador decimal. */
export function toNum(v: any, defaultValue = 0): number {
  if (v === null || v === undefined || v === '') return defaultValue;
  const str = typeof v === 'string' ? v.trim().replace(',', '.') : String(v);
  const n = Number(str);
  return isNaN(n) || !isFinite(n) ? defaultValue : n;
}

/** Converte qualquer valor para number ou null. Aceita vírgula como separador decimal. */
export function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const str = typeof v === 'string' ? v.trim().replace(',', '.') : String(v);
  const n = Number(str);
  return isNaN(n) || !isFinite(n) ? null : n;
}

/** Normaliza um objeto de produto com campos numéricos garantidos. */
export function normalizeProduto(row: any) {
  return {
    ...row,
    fator_correcao:    toNum(row.fator_correcao, 1.0),
    per_capita:        toNumOrNull(row.per_capita),
    per_capita_ajustado: toNumOrNull(row.per_capita_ajustado),
    preco_referencia:  toNumOrNull(row.preco_referencia),
    peso:              toNumOrNull(row.peso),
    estoque_minimo:    toNumOrNull(row.estoque_minimo),
  };
}

/** Normaliza um objeto de refeição/ingrediente com campos numéricos garantidos. */
export function normalizeIngrediente(row: any) {
  return {
    ...row,
    per_capita:          toNum(row.per_capita, 0),
    per_capita_ajustado: toNumOrNull(row.per_capita_ajustado),
    fator_correcao:      toNum(row.fator_correcao, 1.0),
    per_capita_bruto:    toNumOrNull(row.per_capita_bruto),
    quantidade_total:    toNumOrNull(row.quantidade_total),
  };
}

/** Normaliza um item de cálculo de demanda. */
export function normalizeCalculo(row: any) {
  return {
    ...row,
    per_capita:        toNum(row.per_capita, 0),
    fator_correcao:    toNum(row.fator_correcao, 1.0),
    per_capita_bruto:  toNumOrNull(row.per_capita_bruto),
    quantidade_kg:     toNumOrNull(row.quantidade_kg),
    numero_alunos:     toNum(row.numero_alunos, 0),
  };
}
