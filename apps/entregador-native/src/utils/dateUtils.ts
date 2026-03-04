/**
 * Utilitários para manipulação de datas
 * Usa date-fns para garantir manipulação correta de datas sem problemas de timezone
 */

import { format, parse, isWithinInterval, addDays, isValid } from 'date-fns';

/**
 * Obtém a data atual no formato YYYY-MM-DD
 * Usa date-fns para garantir formatação correta
 */
export function obterDataAtual(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Converte uma data para o formato YYYY-MM-DD
 * @param date - Data a ser convertida
 */
export function formatarDataParaInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Converte uma string de data (YYYY-MM-DD ou ISO) para objeto Date
 * Usa parse do date-fns para garantir parsing correto sem problemas de timezone
 * @param dateString - String no formato YYYY-MM-DD ou ISO
 */
export function stringParaData(dateString: string): Date {
  // Se for uma string ISO completa (com T), usa o construtor Date
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  // Caso contrário, usa parse para formato YYYY-MM-DD
  return parse(dateString, 'yyyy-MM-dd', new Date());
}

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 * @param dateString - String no formato YYYY-MM-DD ou objeto Date
 */
export function formatarDataBR(dateString: string | Date): string {
  if (typeof dateString === 'string') {
    const date = stringParaData(dateString);
    if (!isValid(date)) {
      return dateString; // Retorna a string original se não for válida
    }
    return format(date, 'dd/MM/yyyy');
  }
  return format(dateString, 'dd/MM/yyyy');
}

/**
 * Verifica se uma data está dentro de um intervalo
 * @param data - Data a verificar (YYYY-MM-DD)
 * @param inicio - Data de início (YYYY-MM-DD)
 * @param fim - Data de fim (YYYY-MM-DD)
 */
export function dataEstaNoIntervalo(data: string, inicio: string, fim: string): boolean {
  const dataObj = stringParaData(data);
  const inicioObj = stringParaData(inicio);
  const fimObj = stringParaData(fim);
  
  return isWithinInterval(dataObj, { start: inicioObj, end: fimObj });
}

/**
 * Adiciona dias a uma data
 * @param dateString - Data base (YYYY-MM-DD)
 * @param dias - Número de dias a adicionar (pode ser negativo)
 */
export function adicionarDias(dateString: string, dias: number): string {
  const date = stringParaData(dateString);
  const novaData = addDays(date, dias);
  return formatarDataParaInput(novaData);
}

/**
 * Formata um número removendo casas decimais desnecessárias
 * Exemplos: 50.00 -> 50, 50.50 -> 50.5, 50.25 -> 50.25
 * @param valor - Número a ser formatado
 * @param maxDecimais - Número máximo de casas decimais (padrão: 2)
 */
export function formatarNumeroInteligente(valor: number, maxDecimais: number = 2): string {
  if (valor === null || valor === undefined || isNaN(valor)) return '0';
  
  // Remove zeros desnecessários
  const numeroFormatado = valor.toFixed(maxDecimais);
  return parseFloat(numeroFormatado).toString();
}

/**
 * Formata competência de YYYY-MM para formato legível (ex: "Março/2026")
 * @param competencia - String no formato YYYY-MM
 */
export function formatarCompetencia(competencia: string): string {
  if (!competencia) return '';
  
  const [ano, mes] = competencia.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const mesIndex = parseInt(mes) - 1;
  return `${meses[mesIndex]}/${ano}`;
}
