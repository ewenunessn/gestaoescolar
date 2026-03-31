import { dateUtils, MESES, MESES_ABREV } from './dateUtils';

describe('dateUtils', () => {
  describe('createDate', () => {
    it('deve criar data corretamente para abril', () => {
      const date = dateUtils.createDate(2026, 4, 1);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(3); // JavaScript usa 0-11
      expect(date.getDate()).toBe(1);
    });

    it('deve criar data corretamente para janeiro', () => {
      const date = dateUtils.createDate(2026, 1, 15);
      expect(date.getMonth()).toBe(0);
    });

    it('deve criar data corretamente para dezembro', () => {
      const date = dateUtils.createDate(2026, 12, 31);
      expect(date.getMonth()).toBe(11);
    });
  });

  describe('getMonthFromDate', () => {
    it('deve retornar 4 para abril', () => {
      const date = new Date(2026, 3, 1); // Abril no Date
      expect(dateUtils.getMonthFromDate(date)).toBe(4);
    });

    it('deve retornar 1 para janeiro', () => {
      const date = new Date(2026, 0, 1);
      expect(dateUtils.getMonthFromDate(date)).toBe(1);
    });

    it('deve retornar 12 para dezembro', () => {
      const date = new Date(2026, 11, 31);
      expect(dateUtils.getMonthFromDate(date)).toBe(12);
    });
  });

  describe('getMonthName', () => {
    it('deve retornar nome correto do mês', () => {
      expect(dateUtils.getMonthName(1)).toBe('Janeiro');
      expect(dateUtils.getMonthName(4)).toBe('Abril');
      expect(dateUtils.getMonthName(12)).toBe('Dezembro');
    });
  });

  describe('toISOString', () => {
    it('deve criar string ISO correta', () => {
      expect(dateUtils.toISOString(2026, 4, 1)).toBe('2026-04-01');
      expect(dateUtils.toISOString(2026, 1, 5)).toBe('2026-01-05');
      expect(dateUtils.toISOString(2026, 12, 31)).toBe('2026-12-31');
    });
  });

  describe('fromISOString', () => {
    it('deve parsear string ISO corretamente', () => {
      const result = dateUtils.fromISOString('2026-04-01');
      expect(result).toEqual({ ano: 2026, mes: 4, dia: 1 });
    });

    it('deve parsear string ISO com timestamp', () => {
      const result = dateUtils.fromISOString('2026-04-01T12:00:00Z');
      expect(result).toEqual({ ano: 2026, mes: 4, dia: 1 });
    });
  });

  describe('getDaysInMonth', () => {
    it('deve retornar dias corretos para cada mês', () => {
      expect(dateUtils.getDaysInMonth(2026, 1)).toBe(31); // Janeiro
      expect(dateUtils.getDaysInMonth(2026, 2)).toBe(28); // Fevereiro (não bissexto)
      expect(dateUtils.getDaysInMonth(2024, 2)).toBe(29); // Fevereiro (bissexto)
      expect(dateUtils.getDaysInMonth(2026, 4)).toBe(30); // Abril
      expect(dateUtils.getDaysInMonth(2026, 12)).toBe(31); // Dezembro
    });
  });

  describe('formatLong', () => {
    it('deve formatar data por extenso', () => {
      expect(dateUtils.formatLong(2026, 4, 1)).toBe('1 de Abril de 2026');
      expect(dateUtils.formatLong(2026, 1, 15)).toBe('15 de Janeiro de 2026');
    });
  });

  describe('formatShort', () => {
    it('deve formatar data curta', () => {
      expect(dateUtils.formatShort(2026, 4, 1)).toBe('01/04/2026');
      expect(dateUtils.formatShort(2026, 12, 31)).toBe('31/12/2026');
    });
  });

  describe('getDayOfWeek', () => {
    it('deve retornar dia da semana correto', () => {
      // 1 de abril de 2026 é quarta-feira (3)
      expect(dateUtils.getDayOfWeek(2026, 4, 1)).toBe(3);
    });
  });

  describe('getDayOfWeekName', () => {
    it('deve retornar nome do dia da semana', () => {
      expect(dateUtils.getDayOfWeekName(2026, 4, 1)).toBe('Quarta-feira');
    });
  });

  describe('isLeapYear', () => {
    it('deve identificar anos bissextos', () => {
      expect(dateUtils.isLeapYear(2024)).toBe(true);
      expect(dateUtils.isLeapYear(2026)).toBe(false);
      expect(dateUtils.isLeapYear(2000)).toBe(true);
      expect(dateUtils.isLeapYear(1900)).toBe(false);
    });
  });

  describe('compare', () => {
    it('deve comparar datas corretamente', () => {
      const date1 = { ano: 2026, mes: 4, dia: 1 };
      const date2 = { ano: 2026, mes: 4, dia: 2 };
      const date3 = { ano: 2026, mes: 4, dia: 1 };

      expect(dateUtils.compare(date1, date2)).toBe(-1);
      expect(dateUtils.compare(date2, date1)).toBe(1);
      expect(dateUtils.compare(date1, date3)).toBe(0);
    });
  });

  describe('isEqual', () => {
    it('deve verificar igualdade de datas', () => {
      const date1 = { ano: 2026, mes: 4, dia: 1 };
      const date2 = { ano: 2026, mes: 4, dia: 1 };
      const date3 = { ano: 2026, mes: 4, dia: 2 };

      expect(dateUtils.isEqual(date1, date2)).toBe(true);
      expect(dateUtils.isEqual(date1, date3)).toBe(false);
    });
  });

  describe('Consistência entre funções', () => {
    it('createDate e getMonthFromDate devem ser inversos', () => {
      const mes = 4;
      const date = dateUtils.createDate(2026, mes, 1);
      expect(dateUtils.getMonthFromDate(date)).toBe(mes);
    });

    it('toISOString e fromISOString devem ser inversos', () => {
      const original = { ano: 2026, mes: 4, dia: 1 };
      const iso = dateUtils.toISOString(original.ano, original.mes, original.dia);
      const parsed = dateUtils.fromISOString(iso);
      expect(parsed).toEqual(original);
    });

    it('todos os meses devem ter nomes', () => {
      for (let mes = 1; mes <= 12; mes++) {
        expect(dateUtils.getMonthName(mes)).toBeTruthy();
        expect(dateUtils.getMonthNameShort(mes)).toBeTruthy();
      }
    });
  });
});
