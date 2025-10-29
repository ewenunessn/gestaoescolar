/**
 * Utilitários centralizados para manipulação de datas no backend
 * Resolve problemas de timezone e código duplicado
 */

/**
 * UTILITÁRIO CENTRAL: Cria um objeto Date a partir de uma string de data, evitando problemas de timezone
 * Esta função resolve o problema de datas que são interpretadas como UTC quando contêm 'T'
 * @param {string|null|undefined} dataStr - String de data (pode ser 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:mm:ss.sssZ')
 * @returns {Date|null} Objeto Date criado localmente, sem problemas de timezone
 */
function criarDataLocal(dataStr) {
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
 * UTILITÁRIO CENTRAL: Converte Date para string no formato YYYY-MM-DD
 * @param {Date} date - Objeto Date
 * @returns {string} String no formato YYYY-MM-DD
 */
function dateParaString(date) {
  if (!date || isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

/**
 * UTILITÁRIO CENTRAL: Obtém a data atual no formato YYYY-MM-DD
 * @returns {string} String da data atual no formato YYYY-MM-DD
 */
function obterDataAtual() {
  return new Date().toISOString().split('T')[0];
}

/**
 * UTILITÁRIO CENTRAL: Formata uma data para exibição brasileira, evitando problemas de timezone
 * @param {string|null|undefined} dataStr - String de data
 * @returns {string} String formatada (dd/MM/yyyy) ou 'Data inválida' se inválida
 */
function formatarDataBrasileira(dataStr) {
  if (!dataStr) return '';
  
  const data = criarDataLocal(dataStr);
  if (!data) return 'Data inválida';
  
  return data.toLocaleDateString('pt-BR');
}

/**
 * UTILITÁRIO CENTRAL: Calcula dias até o vencimento
 * @param {string|null|undefined} dataVencimento - String de data de vencimento
 * @returns {number|null} Número de dias até o vencimento (negativo se vencido)
 */
function calcularDiasParaVencimento(dataVencimento) {
  if (!dataVencimento) return null;
  
  const hoje = new Date();
  const vencimento = criarDataLocal(dataVencimento);
  
  if (!vencimento) return null;
  
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * UTILITÁRIO CENTRAL: Converte objeto Date ou string para formato seguro para banco
 * @param {Date|string|null|undefined} data - Date ou string de data
 * @returns {string|undefined} String no formato YYYY-MM-DD ou undefined se inválida
 */
function converterParaFormatoBanco(data) {
  if (!data) return undefined;
  
  if (data instanceof Date) {
    return data.toISOString().split('T')[0];
  }
  
  return String(data);
}

module.exports = {
  criarDataLocal,
  dateParaString,
  obterDataAtual,
  formatarDataBrasileira,
  calcularDiasParaVencimento,
  converterParaFormatoBanco
};