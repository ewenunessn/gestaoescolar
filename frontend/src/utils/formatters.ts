/**
 * Utilitários de formatação
 */

/**
 * Formata quantidade numérica para exibição no padrão brasileiro
 * - Números inteiros: sem decimais (ex: 50)
 * - Números decimais: com vírgula e apenas decimais necessários (ex: 50,5 ou 50,25)
 * - Com separador de milhar (ponto) para números >= 1000
 * 
 * Exemplos:
 * 50 -> "50"
 * 50.5 -> "50,5"
 * 50.25 -> "50,25"
 * 1000 -> "1.000"
 * 1000.5 -> "1.000,5"
 * 50000.75 -> "50.000,75"
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
      return num.toLocaleString('pt-BR');
    }
    
    // Se tiver decimais, usar formatação brasileira
    // minimumFractionDigits: 0 = não força decimais
    // maximumFractionDigits: 2 = máximo 2 casas decimais
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
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

/**
 * Formata calorias (Kcal) para exibição
 * - Números inteiros: sem decimais (ex: 230 Kcal)
 * - Números decimais: com vírgula e apenas decimais necessários (ex: 230,5 Kcal)
 * - Remove .00 desnecessários
 *
 * Exemplos:
 * 230.00 -> "230"
 * 230.50 -> "230,5"
 * 230.25 -> "230,25"
 * 0 -> "0"
 */
export function formatarCalorias(calorias: any): string {
  try {
    // Verificações de segurança
    if (calorias === null || calorias === undefined) return '0';
    if (typeof calorias === 'string' && calorias.trim() === '') return '0';

    // Converter para número
    const num = Number(calorias);

    if (isNaN(num) || !isFinite(num)) return '0';

    // Se for inteiro ou terminar em .00
    if (Number.isInteger(num) || num === Math.floor(num)) {
      return Math.floor(num).toLocaleString('pt-BR');
    }

    // Se tiver decimais significativos, usar formatação brasileira
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  } catch (error) {
    console.error('Erro ao formatar calorias:', calorias, error);
    return '0';
  }
}

/**
 * Formata uma data para o formato de input HTML (YYYY-MM-DD)
 *
 * @param data - String ISO, objeto Date, ou string no formato DD/MM/YYYY
 * @returns String no formato YYYY-MM-DD para inputs HTML
 *
 * @example
 * formatDateForInput('2026-04-01') // '2026-04-01'
 * formatDateForInput(new Date(2026, 3, 1)) // '2026-04-01'
 * formatDateForInput('01/04/2026') // '2026-04-01'
 */
export function formatDateForInput(data: string | Date): string {
  if (!data) return '';

  let date: Date;

  if (typeof data === 'string') {
    // Se já está no formato ISO (YYYY-MM-DD)
    if (data.match(/^\d{4}-\d{2}-\d{2}/)) {
      return data.split('T')[0];
    }
    // Se está no formato brasileiro (DD/MM/YYYY)
    if (data.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    date = new Date(data);
  } else {
    date = data;
  }

  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}
