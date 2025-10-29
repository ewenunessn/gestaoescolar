/**
 * Testes para utilitários de data
 */

const {
  criarDataLocal,
  dateParaString,
  obterDataAtual,
  formatarDataBrasileira,
  calcularDiasParaVencimento,
  converterParaFormatoBanco
} = require('../dateUtils');

describe('Utilitários de Data', () => {
  describe('criarDataLocal', () => {
    test('deve criar data local a partir de string YYYY-MM-DD', () => {
      const data = criarDataLocal('2024-03-15');
      expect(data).toBeInstanceOf(Date);
      expect(data.getFullYear()).toBe(2024);
      expect(data.getMonth()).toBe(2); // Março = 2 (0-indexed)
      expect(data.getDate()).toBe(15);
    });

    test('deve criar data local a partir de string ISO com timezone', () => {
      const data = criarDataLocal('2024-03-15T10:30:00.000Z');
      expect(data).toBeInstanceOf(Date);
      expect(data.getFullYear()).toBe(2024);
      expect(data.getMonth()).toBe(2);
      expect(data.getDate()).toBe(15);
    });

    test('deve retornar null para string inválida', () => {
      expect(criarDataLocal('data-inválida')).toBeNull();
      expect(criarDataLocal('')).toBeNull();
      expect(criarDataLocal(null)).toBeNull();
      expect(criarDataLocal(undefined)).toBeNull();
    });
  });

  describe('dateParaString', () => {
    test('deve converter Date para string YYYY-MM-DD', () => {
      const data = new Date(2024, 2, 15); // 15 de março de 2024
      const resultado = dateParaString(data);
      expect(resultado).toBe('2024-03-15');
    });

    test('deve retornar string vazia para data inválida', () => {
      expect(dateParaString(new Date('invalid'))).toBe('');
      expect(dateParaString(null)).toBe('');
    });
  });

  describe('obterDataAtual', () => {
    test('deve retornar data atual no formato YYYY-MM-DD', () => {
      const resultado = obterDataAtual();
      expect(resultado).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Verificar se é realmente hoje
      const hoje = new Date();
      const esperado = hoje.toISOString().split('T')[0];
      expect(resultado).toBe(esperado);
    });
  });

  describe('formatarDataBrasileira', () => {
    test('deve formatar data para padrão brasileiro', () => {
      const resultado = formatarDataBrasileira('2024-03-15');
      expect(resultado).toBe('15/03/2024');
    });

    test('deve retornar string vazia para data inválida', () => {
      expect(formatarDataBrasileira('data-inválida')).toBe('Data inválida');
      expect(formatarDataBrasileira('')).toBe('');
      expect(formatarDataBrasileira(null)).toBe('');
    });
  });

  describe('calcularDiasParaVencimento', () => {
    test('deve calcular dias até vencimento corretamente', () => {
      const hoje = new Date();
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);
      
      const dataAmanha = amanha.toISOString().split('T')[0];
      const resultado = calcularDiasParaVencimento(dataAmanha);
      
      expect(resultado).toBe(1);
    });

    test('deve retornar número negativo para data vencida', () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      
      const dataOntem = ontem.toISOString().split('T')[0];
      const resultado = calcularDiasParaVencimento(dataOntem);
      
      expect(resultado).toBe(-1);
    });

    test('deve retornar null para data inválida', () => {
      expect(calcularDiasParaVencimento(null)).toBeNull();
      expect(calcularDiasParaVencimento('')).toBeNull();
      expect(calcularDiasParaVencimento('data-inválida')).toBeNull();
    });
  });

  describe('converterParaFormatoBanco', () => {
    test('deve converter Date para string', () => {
      const data = new Date(2024, 2, 15);
      const resultado = converterParaFormatoBanco(data);
      expect(resultado).toBe('2024-03-15');
    });

    test('deve manter string como está', () => {
      const resultado = converterParaFormatoBanco('2024-03-15');
      expect(resultado).toBe('2024-03-15');
    });

    test('deve retornar undefined para valores nulos', () => {
      expect(converterParaFormatoBanco(null)).toBeUndefined();
      expect(converterParaFormatoBanco(undefined)).toBeUndefined();
    });
  });
});