/**
 * Utilitários para trabalhar com datas no formato do cardápio.
 * 
 * IMPORTANTE: O sistema usa meses 1-12 (Janeiro = 1), mas JavaScript Date usa 0-11.
 * Sempre use estas funções para evitar erros de conversão.
 * 
 * @module dateUtils
 */

export const MESES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

export const MESES_ABREV: Record<number, string> = {
  1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr',
  5: 'Mai', 6: 'Jun', 7: 'Jul', 8: 'Ago',
  9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez'
};

export const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
                            'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Utilitários para trabalhar com datas no formato do cardápio.
 * 
 * CONVENÇÃO: Meses são sempre 1-12 (Janeiro = 1) nas funções públicas.
 * Conversão para Date (0-11) é feita internamente.
 */
export const dateUtils = {
  /**
   * Cria um objeto Date a partir de ano, mês (1-12) e dia do cardápio
   * 
   * @param ano - Ano (ex: 2026)
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês (1-31)
   * @returns Objeto Date
   * 
   * @example
   * dateUtils.createDate(2026, 4, 1) // 1 de Abril de 2026
   */
  createDate(ano: number, mes: number, dia: number): Date {
    return new Date(ano, mes - 1, dia);
  },

  /**
   * Extrai o mês (1-12) de um objeto Date
   * 
   * @param date - Objeto Date
   * @returns Mês de 1 a 12 (Janeiro = 1)
   * 
   * @example
   * const date = new Date(2026, 3, 1); // Abril (mes 3 no Date)
   * dateUtils.getMonthFromDate(date) // 4
   */
  getMonthFromDate(date: Date): number {
    return date.getMonth() + 1;
  },

  /**
   * Extrai o ano de um objeto Date
   * 
   * @param date - Objeto Date
   * @returns Ano
   */
  getYearFromDate(date: Date): number {
    return date.getFullYear();
  },

  /**
   * Extrai o dia de um objeto Date
   * 
   * @param date - Objeto Date
   * @returns Dia do mês
   */
  getDayFromDate(date: Date): number {
    return date.getDate();
  },

  /**
   * Obtém o nome completo do mês
   * 
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @returns Nome do mês
   * 
   * @example
   * dateUtils.getMonthName(4) // 'Abril'
   */
  getMonthName(mes: number): string {
    return MESES[mes] || '';
  },

  /**
   * Obtém o nome abreviado do mês
   * 
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @returns Nome abreviado do mês
   * 
   * @example
   * dateUtils.getMonthNameShort(4) // 'Abr'
   */
  getMonthNameShort(mes: number): string {
    return MESES_ABREV[mes] || '';
  },

  /**
   * Cria uma string ISO (YYYY-MM-DD) a partir de ano, mês (1-12) e dia
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês
   * @returns String no formato ISO (YYYY-MM-DD)
   * 
   * @example
   * dateUtils.toISOString(2026, 4, 1) // '2026-04-01'
   */
  toISOString(ano: number, mes: number, dia: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  },

  /**
   * Converte string ISO (YYYY-MM-DD) para { ano, mes, dia }
   * 
   * @param isoString - String no formato ISO (YYYY-MM-DD)
   * @returns Objeto com ano, mes (1-12) e dia
   * 
   * @example
   * dateUtils.fromISOString('2026-04-01') // { ano: 2026, mes: 4, dia: 1 }
   */
  fromISOString(isoString: string): { ano: number; mes: number; dia: number } {
    const [ano, mes, dia] = isoString.split('T')[0].split('-').map(Number);
    return { ano, mes, dia };
  },

  /**
   * Obtém o número de dias em um mês
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @returns Número de dias no mês
   * 
   * @example
   * dateUtils.getDaysInMonth(2026, 2) // 28 (fevereiro de 2026)
   * dateUtils.getDaysInMonth(2024, 2) // 29 (fevereiro de 2024 - ano bissexto)
   */
  getDaysInMonth(ano: number, mes: number): number {
    return new Date(ano, mes, 0).getDate();
  },

  /**
   * Formata data para exibição longa (ex: "1 de Abril de 2026")
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês
   * @returns String formatada
   * 
   * @example
   * dateUtils.formatLong(2026, 4, 1) // '1 de Abril de 2026'
   */
  formatLong(ano: number, mes: number, dia: number): string {
    return `${dia} de ${MESES[mes]} de ${ano}`;
  },

  /**
   * Formata data para exibição curta (ex: "01/04/2026")
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês
   * @returns String formatada
   * 
   * @example
   * dateUtils.formatShort(2026, 4, 1) // '01/04/2026'
   */
  formatShort(ano: number, mes: number, dia: number): string {
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
  },

  /**
   * Obtém o dia da semana (0-6, onde 0 = Domingo)
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês
   * @returns Número do dia da semana (0-6)
   * 
   * @example
   * dateUtils.getDayOfWeek(2026, 4, 1) // 3 (quarta-feira)
   */
  getDayOfWeek(ano: number, mes: number, dia: number): number {
    return new Date(ano, mes - 1, dia).getDay();
  },

  /**
   * Obtém o nome do dia da semana
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês
   * @returns Nome do dia da semana
   * 
   * @example
   * dateUtils.getDayOfWeekName(2026, 4, 1) // 'Quarta-feira'
   */
  getDayOfWeekName(ano: number, mes: number, dia: number): string {
    return DIAS_SEMANA[this.getDayOfWeek(ano, mes, dia)];
  },

  /**
   * Obtém o nome abreviado do dia da semana
   * 
   * @param ano - Ano
   * @param mes - Mês de 1 a 12 (Janeiro = 1)
   * @param dia - Dia do mês
   * @returns Nome abreviado do dia da semana
   * 
   * @example
   * dateUtils.getDayOfWeekNameShort(2026, 4, 1) // 'Qua'
   */
  getDayOfWeekNameShort(ano: number, mes: number, dia: number): string {
    return DIAS_SEMANA_ABREV[this.getDayOfWeek(ano, mes, dia)];
  },

  /**
   * Verifica se um ano é bissexto
   * 
   * @param ano - Ano
   * @returns true se o ano é bissexto
   * 
   * @example
   * dateUtils.isLeapYear(2024) // true
   * dateUtils.isLeapYear(2026) // false
   */
  isLeapYear(ano: number): boolean {
    return (ano % 4 === 0 && ano % 100 !== 0) || (ano % 400 === 0);
  },

  /**
   * Compara duas datas
   * 
   * @param date1 - Primeira data { ano, mes, dia }
   * @param date2 - Segunda data { ano, mes, dia }
   * @returns -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
   */
  compare(
    date1: { ano: number; mes: number; dia: number },
    date2: { ano: number; mes: number; dia: number }
  ): number {
    const d1 = this.createDate(date1.ano, date1.mes, date1.dia).getTime();
    const d2 = this.createDate(date2.ano, date2.mes, date2.dia).getTime();
    return d1 < d2 ? -1 : d1 > d2 ? 1 : 0;
  },

  /**
   * Verifica se duas datas são iguais
   * 
   * @param date1 - Primeira data { ano, mes, dia }
   * @param date2 - Segunda data { ano, mes, dia }
   * @returns true se as datas são iguais
   */
  isEqual(
    date1: { ano: number; mes: number; dia: number },
    date2: { ano: number; mes: number; dia: number }
  ): boolean {
    return this.compare(date1, date2) === 0;
  },

  /**
   * Obtém a data de hoje no formato { ano, mes, dia }
   * 
   * @returns Data de hoje
   */
  today(): { ano: number; mes: number; dia: number } {
    const now = new Date();
    return {
      ano: now.getFullYear(),
      mes: now.getMonth() + 1,
      dia: now.getDate()
    };
  }
};

/**
 * Formata uma data ISO ou Date para o formato brasileiro (DD/MM/YYYY)
 * 
 * @param data - String ISO (YYYY-MM-DD) ou objeto Date
 * @returns String formatada (DD/MM/YYYY)
 * 
 * @example
 * formatarData('2026-04-01') // '01/04/2026'
 * formatarData(new Date(2026, 3, 1)) // '01/04/2026'
 */
export function formatarData(data: string | Date): string {
  if (!data) return '';
  
  const date = typeof data === 'string' ? new Date(data) : data;
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata um número para o formato de moeda brasileira (R$ X.XXX,XX)
 * 
 * @param valor - Valor numérico
 * @returns String formatada como moeda
 * 
 * @example
 * formatarMoeda(1234.56) // 'R$ 1.234,56'
 * formatarMoeda(0) // 'R$ 0,00'
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
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
