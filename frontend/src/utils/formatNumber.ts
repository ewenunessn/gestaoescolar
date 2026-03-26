/**
 * Formata número no padrão brasileiro
 * - Usa vírgula para separar decimais
 * - Usa ponto para separar milhares
 * - Mostra decimais apenas se necessário
 * 
 * Exemplos:
 * 50 -> "50"
 * 50.5 -> "50,5"
 * 50.25 -> "50,25"
 * 1000 -> "1.000"
 * 1000.5 -> "1.000,5"
 * 50000.75 -> "50.000,75"
 */
export function formatNumber(value: number | string | null | undefined, options?: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  forceDecimals?: boolean;
}): string {
  // Tratar valores nulos ou indefinidos
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  // Converter para número
  const num = typeof value === 'string' ? parseFloat(value) : value;

  // Verificar se é um número válido
  if (isNaN(num)) {
    return '0';
  }

  // Configurações padrão
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    forceDecimals = false
  } = options || {};

  // Se forceDecimals for true, sempre mostra as casas decimais
  const minDecimals = forceDecimals ? maximumFractionDigits : minimumFractionDigits;

  // Formatar usando Intl.NumberFormat para padrão brasileiro
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maximumFractionDigits,
  }).format(num);
}

/**
 * Formata número como moeda brasileira (R$)
 * 
 * Exemplos:
 * 50 -> "R$ 50,00"
 * 50.5 -> "R$ 50,50"
 * 1000 -> "R$ 1.000,00"
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'R$ 0,00';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formata número como porcentagem
 * 
 * Exemplos:
 * 0.5 -> "50%"
 * 0.755 -> "75,5%"
 * 1 -> "100%"
 */
export function formatPercentage(value: number | string | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || value === '') {
    return '0%';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0%';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formata número com unidade de medida
 * 
 * Exemplos:
 * (50, 'kg') -> "50 kg"
 * (50.5, 'kg') -> "50,5 kg"
 * (1000, 'un') -> "1.000 un"
 */
export function formatNumberWithUnit(
  value: number | string | null | undefined, 
  unit: string,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const formattedNumber = formatNumber(value, options);
  return `${formattedNumber} ${unit}`;
}

/**
 * Parse string formatada em número
 * Aceita tanto formato brasileiro (1.000,50) quanto americano (1,000.50)
 * 
 * Exemplos:
 * "1.000,50" -> 1000.5
 * "1,000.50" -> 1000.5
 * "50,5" -> 50.5
 */
export function parseFormattedNumber(value: string | null | undefined): number {
  if (!value) return 0;

  // Remove espaços
  let cleaned = value.trim();

  // Detectar formato (brasileiro usa vírgula para decimal)
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Formato brasileiro: 1.000,50
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato americano: 1,000.50
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Apenas vírgula: assumir formato brasileiro
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
