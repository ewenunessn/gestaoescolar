/**
 * Formata números removendo zeros desnecessários após o ponto decimal
 * Exemplos:
 * - 1.000 -> "1"
 * - 1.500 -> "1.5"
 * - 1.250 -> "1.25"
 * - 10 -> "10"
 */
export function formatarNumero(valor: number): string {
  // Remove zeros à direita após o ponto decimal
  return valor.toString().replace(/\.?0+$/, '')
}
