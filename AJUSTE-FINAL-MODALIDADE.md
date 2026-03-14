# Ajuste Final - Seleção de Modalidade ✅

## Mudança Solicitada
O usuário solicitou que a seleção de modalidade NÃO altere a visualização da tabela de ingredientes. A tabela deve SEMPRE mostrar o range (menor - maior) per capita, independente da modalidade selecionada.

## Comportamento Implementado

### ❌ ANTES (Comportamento Removido)
- Ao selecionar modalidade na aba "Ficha Técnica"
- Tabela de ingredientes na aba "Ingredientes" mudava
- Mostrava apenas o per capita da modalidade selecionada
- Tooltip mostrava apenas a modalidade selecionada

### ✅ AGORA (Comportamento Correto)

#### Aba "Ingredientes"
- **SEMPRE** mostra range (menor - maior) per capita
- **NÃO** é afetada pela seleção de modalidade
- Tooltip continua mostrando valores individuais por modalidade
- Exemplos:
  ```
  Todas modalidades = 100g → Exibe: "100g"
  Modalidades = 80g, 100g, 120g → Exibe: "80 - 120g"
  ```

#### Aba "Ficha Técnica"
- Select de modalidade afeta APENAS os cálculos
- Cálculos nutricionais usam per capita da modalidade selecionada
- Custo usa per capita da modalidade selecionada
- Exportação PDF usa per capita da modalidade selecionada

## Código Modificado

### 1. Componente SortableRow Simplificado
**Arquivo**: `frontend/src/pages/RefeicaoDetalhe.tsx`

```typescript
// ❌ REMOVIDO: parâmetro modalidadeSelecionada
interface SortableRowProps {
  assoc: RefeicaoProduto;
  onRemove: () => void;
  onEdit: () => void;
  // modalidadeSelecionada: number | null; ← REMOVIDO
}

function SortableRow({ assoc, onRemove, onEdit }: SortableRowProps) {
  // ❌ REMOVIDO: lógica condicional baseada em modalidadeSelecionada
  
  // ✅ SEMPRE calcula range
  const perCapitas = assoc.per_capita_por_modalidade?.map(m => m.per_capita) || [assoc.per_capita];
  const minPerCapita = Math.min(...perCapitas);
  const maxPerCapita = Math.max(...perCapitas);
  
  const perCapitaTexto = minPerCapita === maxPerCapita 
    ? `${minPerCapita}${unidade}`
    : `${minPerCapita} - ${maxPerCapita}${unidade}`;
  
  // ✅ Tooltip SEMPRE mostra todas modalidades
  const tooltipContent = assoc.per_capita_por_modalidade?.map(...)
}
```

### 2. Lógica de Filtro Removida
```typescript
// ❌ REMOVIDO: filtro de associações por modalidade
// const associacoesFiltradas = associacoes.map(assoc => {
//   if (!modalidadeSelecionada) return assoc;
//   return { ...assoc, per_capita_efetivo: ... };
// });

// ✅ AGORA: usa associações direto
const associacoesFiltradas = associacoes;
```

### 3. Chamada do Componente Simplificada
```typescript
<SortableRow
  key={assoc.id}
  assoc={assoc}
  onRemove={() => removerProduto(assoc.id)}
  onEdit={() => handleEditarProduto(assoc)}
  // modalidadeSelecionada={modalidadeSelecionada} ← REMOVIDO
/>
```

## Separação de Responsabilidades

### Aba "Ingredientes"
- **Propósito**: Gerenciar lista de ingredientes
- **Visualização**: Range completo de per capita
- **Ações**: Adicionar, editar, remover, reordenar
- **Não afetada por**: Seleção de modalidade

### Aba "Ficha Técnica"
- **Propósito**: Visualizar informações nutricionais e custo
- **Visualização**: Valores calculados para modalidade específica
- **Seletor**: Modalidade (afeta apenas cálculos)
- **Afetado por**: Seleção de modalidade

## Fluxo de Dados Atualizado

```
┌─────────────────────────────────────────────────────────┐
│                  Aba "Ingredientes"                     │
│                                                         │
│  Tabela de Ingredientes                                │
│  ┌─────────────────────────────────────────┐           │
│  │ Produto A: 80 - 120g  [tooltip: todas] │           │
│  │ Produto B: 100g       [tooltip: todas] │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  ⚠️ NÃO afetada por modalidade selecionada             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 Aba "Ficha Técnica"                     │
│                                                         │
│  [Select: Ensino Fundamental ▼]                        │
│                                                         │
│  Composição Nutricional (Ensino Fundamental)           │
│  ┌─────────────────────────────────────────┐           │
│  │ Proteínas: 15.2g                        │           │
│  │ Lipídios: 8.5g                          │           │
│  │ Carboidratos: 45.3g                     │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  ✅ Usa per capita de Ensino Fundamental               │
└─────────────────────────────────────────────────────────┘
```

## Testes de Validação

### ✅ Teste 1: Visualização de Ingredientes
1. Adicionar produto com per capita diferente por modalidade
2. Verificar que tabela mostra range (ex: "80 - 120g")
3. Passar mouse e ver tooltip com todas modalidades

### ✅ Teste 2: Seleção de Modalidade
1. Ir para aba "Ficha Técnica"
2. Selecionar modalidade "Ensino Fundamental"
3. Verificar que cálculos mudam
4. Voltar para aba "Ingredientes"
5. Verificar que tabela NÃO mudou (ainda mostra range)

### ✅ Teste 3: Exportação PDF
1. Selecionar modalidade na aba "Ficha Técnica"
2. Clicar em "Exportar PDF"
3. Verificar que PDF mostra "Modalidade: [Nome]"
4. Verificar que valores são da modalidade selecionada

### ✅ Teste 4: Alternância de Modalidades
1. Selecionar "Ensino Fundamental" → ver valores
2. Selecionar "Ensino Médio" → ver valores mudarem
3. Voltar para "Ingredientes" → tabela permanece igual

## Arquivos Modificados Neste Ajuste

- `frontend/src/pages/RefeicaoDetalhe.tsx`
  - Removido parâmetro `modalidadeSelecionada` de `SortableRowProps`
  - Removida lógica condicional em `SortableRow`
  - Removido filtro de `associacoesFiltradas`
  - Simplificada chamada do componente

- `FILTRO-MODALIDADE-CALCULOS-IMPLEMENTADO.md`
  - Atualizada seção "Comportamento na Interface"
  - Adicionada explicação da aba "Ingredientes"

## Resumo da Mudança

**Antes**: Modalidade afetava visualização em ambas as abas
**Agora**: Modalidade afeta APENAS cálculos na aba "Ficha Técnica"

**Resultado**: Interface mais clara e previsível para o usuário

---

**Status**: ✅ Ajuste Implementado
**Data**: 2026-03-13
**Versão**: 1.1
