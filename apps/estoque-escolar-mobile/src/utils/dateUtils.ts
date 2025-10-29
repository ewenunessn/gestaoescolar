/**
 * Utilitários centralizados para manipulação de datas
 * Resolve problemas de timezone e código duplicado
 */

/**
 * UTILITÁRIO CENTRAL: Cria um objeto Date a partir de uma string de data, evitando problemas de timezone
 * Esta função resolve o problema de datas que são interpretadas como UTC quando contêm 'T'
 * @param dataStr - String de data (pode ser 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss.sssZ')
 * @returns Objeto Date criado localmente, sem problemas de timezone
 */
export function criarDataLocal(dataStr: string | null | undefined): Date | null {
  if (!dataStr) return null;
  
  try {
    // CORREÇÃO DEFINITIVA: Sempre extrair apenas YYYY-MM-DD
    // Isso resolve o problema de datas com T00:00:00.000Z que são interpretadas como UTC
    const dataApenas = String(dataStr).split('T')[0];
    const [ano, mes, dia] = dataApenas.split('-').map(Number);
    
    // Validar se os valores são números válidos
    if (isNaN(ano) || isNaN(mes) || isNaN(dia)) {
      console.warn('Data inválida:', dataStr);
      return null;
    }
    
    return new Date(ano, mes - 1, dia);
  } catch (error) {
    console.warn('Erro ao criar data local:', error);
    return null;
  }
}

/**
 * UTILITÁRIO CENTRAL: Formata uma data para exibição brasileira, evitando problemas de timezone
 * @param dataStr - String de data (pode ser 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss.sssZ')
 * @returns String formatada (dd/MM/yyyy) ou 'Data inválida' se inválida
 */
export function formatarDataBrasileira(dataStr: string | null | undefined): string {
  if (!dataStr) return '';
  
  const data = criarDataLocal(dataStr);
  if (!data) return 'Data inválida';
  
  return data.toLocaleDateString('pt-BR');
}

/**
 * UTILITÁRIO CENTRAL: Converte Date para string no formato YYYY-MM-DD
 * @param date - Objeto Date
 * @returns String no formato YYYY-MM-DD
 */
export function dateParaString(date: Date): string {
  if (!date || isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/**
 * UTILITÁRIO CENTRAL: Obtém a data atual no formato YYYY-MM-DD
 * @returns String da data atual no formato YYYY-MM-DD
 */
export function obterDataAtual(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * UTILITÁRIO CENTRAL: Calcula dias até o vencimento
 * @param dataVencimento - String de data de vencimento
 * @returns Número de dias até o vencimento (negativo se vencido)
 */
export function calcularDiasParaVencimento(dataVencimento: string | null | undefined): number | null {
  if (!dataVencimento) return null;
  
  const hoje = new Date();
  const vencimento = criarDataLocal(dataVencimento);
  
  if (!vencimento) return null;
  
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * UTILITÁRIO CENTRAL: Converte objeto Date ou string para formato seguro para API
 * @param data - Date ou string de data
 * @returns String no formato YYYY-MM-DD ou undefined se inválida
 */
export function converterParaFormatoAPI(data: Date | string | null | undefined): string | undefined {
  if (!data) return undefined;
  
  if (data instanceof Date) {
    return data.toISOString().split('T')[0];
  }
  
  return String(data);
}