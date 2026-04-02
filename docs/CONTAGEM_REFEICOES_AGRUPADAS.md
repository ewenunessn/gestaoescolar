# Contagem de Refeições Agrupadas por Dia e Tipo

## Visão Geral

A contagem de refeições no sistema foi ajustada para considerar múltiplas preparações no mesmo dia e mesmo tipo de refeição como uma única refeição.

## Lógica de Contagem

### Antes
Cada preparação adicionada era contada individualmente:
- Dia 1, Almoço: Arroz Branco → 1 refeição
- Dia 1, Almoço: Feijão Preto → 1 refeição
- **Total: 2 refeições**

### Depois
Preparações no mesmo dia e mesmo tipo são agrupadas:
- Dia 1, Almoço: Arroz Branco + Feijão Preto → **1 refeição**
- Dia 1, Lanche: Biscoito + Suco → **1 refeição**
- **Total: 2 refeições**

## Implementação

### Backend - Listagem de Cardápios

**Arquivo:** `backend/src/modules/cardapios/controllers/cardapioController.ts`

**Query SQL modificada (usando subquery):**
```sql
(
  SELECT COUNT(DISTINCT (crd2.dia, crd2.tipo_refeicao))
  FROM cardapio_refeicoes_dia crd2
  WHERE crd2.cardapio_modalidade_id = cm.id
) as total_refeicoes
```

A subquery garante que a contagem não seja afetada pelos JOINs com outras tabelas (como modalidades).

### Frontend - Card de Resumo

**Arquivo:** `frontend/src/pages/CardapioCalendario.tsx`

**Lógica de contagem:**
```typescript
// Total de preparações
{(() => {
  // Contar refeições únicas: mesmo dia + mesmo tipo = 1 refeição
  const refeicoesUnicas = new Set(
    refeicoes.map(r => `${r.dia}-${r.tipo_refeicao}`)
  );
  return refeicoesUnicas.size;
})()}

// Por tipo de preparação
{(() => {
  // Agrupar por tipo, contando apenas combinações únicas de dia + tipo
  const porTipo: Record<string, Set<number>> = {};
  
  refeicoes.forEach(r => {
    if (!porTipo[r.tipo_refeicao]) {
      porTipo[r.tipo_refeicao] = new Set();
    }
    porTipo[r.tipo_refeicao].add(r.dia);
  });
  
  return Object.entries(porTipo).map(([tipo, dias]) => (
    <Box key={tipo}>
      <Typography>{TIPOS_REFEICAO[tipo]}</Typography>
      <Chip label={dias.size} />
    </Box>
  ));
})()}
```

### Backend - Cálculo de Custo

**Arquivo:** `backend/src/modules/cardapios/controllers/cardapioController.ts`

**Lógica de contagem:**
```typescript
// Contar refeições únicas (mesmo dia + mesmo tipo = 1 refeição)
const refeicoesUnicas = new Set<string>();

refeicoesMap.forEach((refeicao) => {
  // ... processamento ...
  
  // Contar refeições únicas: dia + tipo_refeicao
  refeicoesUnicas.add(`${refeicao.dia}-${refeicao.tipo_refeicao}`);
  
  detalhesRefeicoes.push(refeicao);
});

// Retornar o tamanho do Set (valores únicos)
total_refeicoes: refeicoesUnicas.size
```

## Exemplos

### Exemplo 1: Cardápio Simples

**Preparações cadastradas:**
- Dia 1, Almoço: Arroz Branco
- Dia 1, Almoço: Feijão Preto
- Dia 1, Almoço: Frango Grelhado
- Dia 1, Lanche: Biscoito
- Dia 2, Almoço: Macarrão
- Dia 2, Almoço: Carne Moída

**Contagem:**
- Dia 1, Almoço (3 preparações) = 1 refeição
- Dia 1, Lanche (1 preparação) = 1 refeição
- Dia 2, Almoço (2 preparações) = 1 refeição
- **Total: 3 refeições**

### Exemplo 2: Cardápio Completo

**Preparações cadastradas:**
- Dia 1, Café da Manhã: Leite + Pão + Manteiga
- Dia 1, Almoço: Arroz + Feijão + Carne + Salada
- Dia 1, Lanche: Suco + Biscoito
- Dia 2, Café da Manhã: Café + Bolo
- Dia 2, Almoço: Macarrão + Frango

**Contagem:**
- Dia 1: 3 refeições (Café, Almoço, Lanche)
- Dia 2: 2 refeições (Café, Almoço)
- **Total: 5 refeições**

## Impacto no Sistema

### DataGrid de Cardápios
A coluna "Preparações" agora mostra o número de refeições únicas (dia + tipo).

### Card de Custo
O campo "Total de Refeições" mostra o número de refeições únicas.

### Modal de Detalhes
O detalhamento continua mostrando todas as preparações, mas o total é calculado de forma agrupada.

### Calendário
A visualização no calendário não é afetada, pois já agrupa visualmente por dia e tipo.

## Benefícios

1. **Contagem mais realista:** Reflete melhor o número de refeições servidas
2. **Alinhamento com a prática:** Uma refeição pode ter múltiplas preparações
3. **Relatórios mais precisos:** Facilita o entendimento de quantas refeições são servidas
4. **Conformidade:** Alinha com a forma como refeições são contadas na prática escolar

## Observações

- A mudança não afeta o cálculo de custos (continua somando todas as preparações)
- A mudança não afeta o detalhamento por preparação
- A mudança é apenas na contagem/totalização
- Preparações em dias diferentes ou tipos diferentes continuam sendo contadas separadamente

## Casos Especiais

### Mesmo Dia, Tipos Diferentes
- Dia 1, Almoço: Arroz + Feijão → 1 refeição
- Dia 1, Lanche: Biscoito → 1 refeição
- **Total: 2 refeições** ✅

### Dias Diferentes, Mesmo Tipo
- Dia 1, Almoço: Arroz + Feijão → 1 refeição
- Dia 2, Almoço: Macarrão → 1 refeição
- **Total: 2 refeições** ✅

### Mesma Preparação, Dias Diferentes
- Dia 1, Almoço: Arroz Branco → 1 refeição
- Dia 2, Almoço: Arroz Branco → 1 refeição
- **Total: 2 refeições** ✅

### Mesma Preparação, Mesmo Dia, Tipos Diferentes
- Dia 1, Almoço: Arroz Branco → 1 refeição
- Dia 1, Lanche: Arroz Branco → 1 refeição
- **Total: 2 refeições** ✅
