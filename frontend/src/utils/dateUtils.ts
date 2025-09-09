/**
 * Utilitários para manipulação de datas
 */

/**
 * Converte uma data ISO string para o formato yyyy-MM-dd usado em inputs HTML
 * @param isoString - String de data no formato ISO (ex: "2025-08-23T03:00:00.000Z")
 * @returns String no formato yyyy-MM-dd ou string vazia se inválida
 */
export function formatDateForInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    // Usar toISOString e pegar apenas a parte da data
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Erro ao formatar data para input:', error);
    return '';
  }
}

/**
 * Converte uma data do formato yyyy-MM-dd para ISO string
 * @param dateString - String no formato yyyy-MM-dd
 * @returns String ISO ou null se inválida
 */
export function formatInputDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString + 'T00:00:00.000Z');
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString();
  } catch (error) {
    console.warn('Erro ao converter data para ISO:', error);
    return null;
  }
}

/**
 * Formata uma data para exibição no formato brasileiro
 * @param isoString - String de data no formato ISO
 * @returns String formatada (dd/MM/yyyy) ou string vazia se inválida
 */
export function formatDateForDisplay(isoString: string | null | undefined): string {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.warn('Erro ao formatar data para exibição:', error);
    return '';
  }
}