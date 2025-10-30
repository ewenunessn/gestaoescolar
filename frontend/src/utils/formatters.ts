/**
 * Utilitários de formatação
 */

/**
 * Formata quantidade numérica para exibição
 * - Números inteiros: sem decimais (ex: 10)
 * - Números decimais: com vírgula e apenas decimais necessários (ex: 10,5 ou 10,25)
 */
export function formatarQuantidade(quantidade: any): string {
  try {
    // Verificações de segurança
    if (quantidade === null || quantidade === undefined) return '0';
    if (typeof quantidade === 'string' && quantidade.trim() === '') return '0';
    
    const num = Number(quantidade);
    if (isNaN(num) || !isFinite(num)) return '0';
    
    // Se for inteiro, não mostrar decimais
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    // Se tiver decimais, formatar com vírgula e remover zeros desnecessários
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
