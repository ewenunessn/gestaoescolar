# Análise de Padrões de Data - Melhores Práticas

## Padrão Atual (Misto - NÃO RECOMENDADO)

```typescript
// Array MESES indexado de 1-12
const MESES = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', ...
};

// Banco de dados: mes = 1-12
cardapio.mes = 4; // Abril

// Uso:
MESES[cardapio.mes] // ✓ Direto
new Date(ano, cardapio.mes - 1, dia) // ✗ Precisa subtrair
```

**PROBLEMAS:**
- ❌ Inconsistência: às vezes subtrai 1, às vezes não
- ❌ Propenso a erros: fácil esquecer de subtrair
- ❌ Confusão mental constante
- ❌ Dificulta manutenção

---

## PADRÃO RECOMENDADO #1: Zero-Based (Padrão JavaScript)

```typescript
// Array MESES indexado de 0-11 (como Date)
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', ...
];

// Banco de dados: mes = 0-11
cardapio.mes = 3; // Abril (0-based)

// Uso:
MESES[cardapio.mes] // ✓ Direto
new Date(ano, cardapio.mes, dia) // ✓ Direto
date.getMonth() === cardapio.mes // ✓ Direto
```

**VANTAGENS:**
- ✅ Consistência total com JavaScript Date
- ✅ Sem conversões (menos bugs)
- ✅ Padrão da linguagem
- ✅ Menos código

**DESVANTAGENS:**
- ⚠️ Requer migração do banco de dados
- ⚠️ Usuários veem "mes: 3" no banco (não intuitivo)

---

## PADRÃO RECOMENDADO #2: One-Based com Conversão Centralizada

```typescript
// Array MESES indexado de 1-12 (como calendário)
const MESES = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', ...
};

// Banco de dados: mes = 1-12
cardapio.mes = 4; // Abril (1-based)

// FUNÇÕES UTILITÁRIAS CENTRALIZADAS:
const dateUtils = {
  // Converter mes do cardápio para Date
  toDate: (ano: number, mes: number, dia: number) => 
    new Date(ano, mes - 1, dia),
  
  // Converter Date para mes do cardápio
  fromDate: (date: Date) => 
    date.getMonth() + 1,
  
  // Obter nome do mês
  getMesNome: (mes: number) => 
    MESES[mes],
  
  // Criar string ISO
  toISOString: (ano: number, mes: number, dia: number) => 
    `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
};

// Uso:
dateUtils.getMesNome(cardapio.mes) // ✓ Centralizado
dateUtils.toDate(cardapio.ano, cardapio.mes, dia) // ✓ Centralizado
dateUtils.fromDate(new Date()) // ✓ Centralizado
```

**VANTAGENS:**
- ✅ Intuitivo para humanos (Janeiro = 1)
- ✅ Conversões centralizadas (um único lugar)
- ✅ Fácil de testar
- ✅ Não requer migração do banco
- ✅ Documentação clara

**DESVANTAGENS:**
- ⚠️ Precisa sempre usar as funções utilitárias
- ⚠️ Mais verboso

---

## PADRÃO RECOMENDADO #3: Usar Biblioteca (date-fns ou Day.js)

```typescript
import { format, parse, getMonth, setMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Banco de dados: mes = 1-12
cardapio.mes = 4; // Abril

// Uso com date-fns:
const data = new Date(cardapio.ano, cardapio.mes - 1, dia);
format(data, 'MMMM', { locale: ptBR }) // 'Abril'
format(data, 'EEEE', { locale: ptBR }) // 'quarta-feira'

// OU usar Day.js (mais leve):
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

const data = dayjs()
  .year(cardapio.ano)
  .month(cardapio.mes - 1) // Day.js também usa 0-11
  .date(dia);

data.format('MMMM') // 'Abril'
data.format('dddd') // 'quarta-feira'
```

**VANTAGENS:**
- ✅ Biblioteca testada e mantida
- ✅ Muitas funcionalidades prontas
- ✅ Formatação robusta
- ✅ Timezone handling

**DESVANTAGENS:**
- ⚠️ Dependência externa
- ⚠️ Ainda precisa converter (mes - 1)

---

## RECOMENDAÇÃO FINAL

### Para seu projeto: **PADRÃO #2 (One-Based com Conversão Centralizada)**

**Por quê?**

1. **Não requer migração**: Seu banco já usa 1-12
2. **Intuitivo**: Janeiro = 1 faz sentido para humanos
3. **Seguro**: Conversões centralizadas = menos bugs
4. **Testável**: Funções utilitárias são fáceis de testar
5. **Documentado**: Fica claro onde e como converter

### Implementação Recomendada:

```typescript
// src/utils/dateUtils.ts
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

/**
 * Utilitários para trabalhar com datas no formato do cardápio.
 * 
 * IMPORTANTE: O sistema usa meses 1-12 (Janeiro = 1), mas JavaScript Date usa 0-11.
 * Sempre use estas funções para evitar erros de conversão.
 */
export const dateUtils = {
  /**
   * Cria um objeto Date a partir de ano, mês (1-12) e dia do cardápio
   */
  createDate(ano: number, mes: number, dia: number): Date {
    return new Date(ano, mes - 1, dia);
  },

  /**
   * Extrai o mês (1-12) de um objeto Date
   */
  getMonthFromDate(date: Date): number {
    return date.getMonth() + 1;
  },

  /**
   * Extrai o ano de um objeto Date
   */
  getYearFromDate(date: Date): number {
    return date.getFullYear();
  },

  /**
   * Obtém o nome completo do mês
   */
  getMonthName(mes: number): string {
    return MESES[mes] || '';
  },

  /**
   * Obtém o nome abreviado do mês
   */
  getMonthNameShort(mes: number): string {
    return MESES_ABREV[mes] || '';
  },

  /**
   * Cria uma string ISO (YYYY-MM-DD) a partir de ano, mês (1-12) e dia
   */
  toISOString(ano: number, mes: number, dia: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  },

  /**
   * Converte string ISO (YYYY-MM-DD) para { ano, mes, dia }
   */
  fromISOString(isoString: string): { ano: number; mes: number; dia: number } {
    const [ano, mes, dia] = isoString.split('T')[0].split('-').map(Number);
    return { ano, mes, dia };
  },

  /**
   * Obtém o número de dias em um mês
   */
  getDaysInMonth(ano: number, mes: number): number {
    return new Date(ano, mes, 0).getDate();
  },

  /**
   * Formata data para exibição (ex: "1 de Abril de 2026")
   */
  formatLong(ano: number, mes: number, dia: number): string {
    return `${dia} de ${MESES[mes]} de ${ano}`;
  },

  /**
   * Formata data para exibição curta (ex: "01/04/2026")
   */
  formatShort(ano: number, mes: number, dia: number): string {
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
  },

  /**
   * Obtém o dia da semana (0-6, onde 0 = Domingo)
   */
  getDayOfWeek(ano: number, mes: number, dia: number): number {
    return new Date(ano, mes - 1, dia).getDay();
  },

  /**
   * Obtém o nome do dia da semana
   */
  getDayOfWeekName(ano: number, mes: number, dia: number): string {
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
                  'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return dias[this.getDayOfWeek(ano, mes, dia)];
  }
};
```

### Uso no código:

```typescript
// ❌ ANTES (propenso a erros)
const data = new Date(cardapio.ano, cardapio.mes - 1, dia);
const mesNome = MESES[cardapio.mes];

// ✅ DEPOIS (seguro e claro)
const data = dateUtils.createDate(cardapio.ano, cardapio.mes, dia);
const mesNome = dateUtils.getMonthName(cardapio.mes);
const dataFormatada = dateUtils.formatLong(cardapio.ano, cardapio.mes, dia);
```

---

## Comparação com Outras Linguagens

- **Python**: datetime usa 1-12 (como nosso padrão recomendado)
- **Java**: Calendar usa 0-11, mas LocalDate usa 1-12
- **C#**: DateTime usa 1-12
- **PHP**: DateTime usa 1-12
- **Ruby**: Date usa 1-12

**Conclusão**: A maioria das linguagens modernas usa 1-12. JavaScript é a exceção (legado).

---

## Referências

- [MDN - Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [date-fns](https://date-fns.org/)
- [Day.js](https://day.js.org/)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
