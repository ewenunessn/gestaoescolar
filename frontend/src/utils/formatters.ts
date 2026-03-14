/**
 * Utilitários de formatação
 */

/**
 * Formata quantidade numérica para exibição
 * - Números inteiros: sem decimais (ex: 10)
 * - Números decimais: com vírgula e apenas decimais necessários (ex: 10,5 ou 10,25)
 * - Sem separador de milhar para números < 10000
 */
export function formatarQuantidade(quantidade: any): string {
  try {
    // Verificações de segurança
    if (quantidade === null || quantidade === undefined) return '0';
    if (typeof quantidade === 'string' && quantidade.trim() === '') return '0';
    
    // Converter para número
    const num = Number(quantidade);
    
    if (isNaN(num) || !isFinite(num)) return '0';
    
    // Se for inteiro
    if (Number.isInteger(num)) {
      // Números menores que 10000: sem separador
      if (num < 10000) {
        return num.toString();
      }
      // Números >= 10000: com separador de milhar
      return num.toLocaleString('pt-BR');
    }
    
    // Se tiver decimais
    const partes = num.toFixed(2).split('.');
    const inteiro = parseInt(partes[0]);
    const decimal = partes[1].replace(/0+$/, ''); // Remove zeros à direita
    
    // Se não tem decimal significativo, tratar como inteiro
    if (!decimal || decimal === '00') {
      if (inteiro < 10000) {
        return inteiro.toString();
      }
      return inteiro.toLocaleString('pt-BR');
    }
    
    // Tem decimais significativos
    if (inteiro < 10000) {
      return `${inteiro},${decimal}`;
    }
    
    return `${inteiro.toLocaleString('pt-BR')},${decimal}`;
  } catch (error) {
    console.error('Erro ao formatar quantidade:', quantidade, error);
    return '0';
  }
}

/**
 * Formata valor monetário para exibição
 */
export function formatarMoeda(valor: any): string {
  try {
    const num = Number(valor);
    if (isNaN(num) || !isFinite(num)) return 'R$ 0,00';
    
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  } catch (error) {
    return 'R$ 0,00';
  }
}

/**
 * Formata data para exibição
 */
export function formatarData(data: string | Date | null | undefined): string {
  try {
    if (!data) return '-';
    
    const date = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return '-';
  }
}

/**
 * Formata data e hora para exibição
 */
export function formatarDataHora(data: string | Date | null | undefined): string {
  try {
    if (!data) return '-';
    
    const date = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleString('pt-BR');
  } catch (error) {
    return '-';
  }
}

/**
 * Converte qualquer valor para number de forma segura.
 * O PostgreSQL retorna NUMERIC/DECIMAL como string — use esta função antes de .toFixed(), operações aritméticas, etc.
 * Aceita vírgula como separador decimal.
 */
export function toNum(v: any, defaultValue = 0): number {
  if (v === null || v === undefined || v === '') return defaultValue;
  const str = typeof v === 'string' ? v.trim().replace(',', '.') : String(v);
  const n = Number(str);
  return isNaN(n) || !isFinite(n) ? defaultValue : n;
}

/**
 * Converte qualquer valor para number ou null.
 */
export function toNumOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const str = typeof v === 'string' ? v.trim().replace(',', '.') : String(v);
  const n = Number(str);
  return isNaN(n) || !isFinite(n) ? null : n;
}

/**
 * Formata número com casas decimais de forma segura (nunca lança exceção).
 * Substitui o padrão `value.toFixed(n)` que quebra quando value é string.
 */
export function toFixed(v: any, decimals = 2, defaultValue = '0'): string {
  const n = toNum(v, NaN);
  if (isNaN(n)) return defaultValue;
  return n.toFixed(decimals);
}
