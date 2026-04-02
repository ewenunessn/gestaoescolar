# Exemplo Visual - Gráfico de Pizza no Card de Custo

## Layout do Card de Custo

```
┌─────────────────────────────────────────────┐
│ 🍽️ Custo do Cardápio        [Detalhes]     │
├─────────────────────────────────────────────┤
│                                             │
│ Custo Total Estimado                        │
│                           R$ 15.450,00      │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Total de Alunos    │   Custo por Aluno    │
│       500           │     R$ 30,90         │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Por modalidade                              │
│ Creche (200 alunos)          R$ 6.180,00   │
│ Pré-escola (150 alunos)      R$ 4.635,00   │
│ Fundamental (150 alunos)     R$ 4.635,00   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Distribuição por Tipo de Fornecedor        │
│                                             │
│              ╭─────────╮                    │
│            ╱           ╲                    │
│          ╱    70%       ╲                   │
│         │  Convencional  │                  │
│         │                │                  │
│          ╲     30%      ╱                   │
│            ╲  Agric.  ╱                     │
│              ╰─────╯                        │
│                                             │
│ ● Convencional    R$ 10.815,00    [70.0%]  │
│ ● Agricultura     R$ 4.635,00     [30.0%]  │
│   Familiar                                  │
│                                             │
└─────────────────────────────────────────────┘
```

## Cores do Gráfico

### Tipos PNAE (Lei 11.947/2009)
- 🔵 **CONVENCIONAL** - Azul (#1976d2)
- 🟢 **AGRICULTURA_FAMILIAR** - Verde escuro (#2e7d32)
- 🟢 **COOPERATIVA_AF** - Verde médio (#388e3c)
- 🟢 **ASSOCIACAO_AF** - Verde claro (#43a047)

### Tipos Antigos (Compatibilidade)
- 🔵 **empresa** - Azul (#1976d2)
- 🟢 **cooperativa** - Verde (#388e3c)
- 🟠 **individual** - Laranja (#f57c00)

## Interatividade

### Hover no Gráfico
Ao passar o mouse sobre uma fatia do gráfico:
```
┌──────────────────────────────┐
│ Agricultura Familiar         │
│ R$ 4.635,00 (30.0%)         │
└──────────────────────────────┘
```

### Hover na Legenda
Ao passar o mouse sobre um item da legenda:
```
┌─────────────────────────────────────────────┐
│ ● Agricultura     R$ 4.635,00     [30.0%]  │ ← Destaque
│   Familiar                                  │
└─────────────────────────────────────────────┘
```

## Responsividade

### Desktop (Sidebar)
- Gráfico: 250x250px
- Legenda: Lista vertical completa
- Fonte: Tamanhos padrão

### Tablet
- Gráfico: 200x200px
- Legenda: Lista vertical compacta
- Fonte: Reduzida

### Mobile
- Card ocupa largura total
- Gráfico: 180x180px
- Legenda: Lista vertical com scroll se necessário

## Exemplo de Dados

### Cenário 1: Predominância Convencional
```json
{
  "detalhes_por_tipo_fornecedor": [
    {
      "tipo_fornecedor": "CONVENCIONAL",
      "valor_total": 10815.00,
      "percentual": 70.0
    },
    {
      "tipo_fornecedor": "AGRICULTURA_FAMILIAR",
      "valor_total": 4635.00,
      "percentual": 30.0
    }
  ]
}
```

**Visualização:** Gráfico com 70% azul e 30% verde

### Cenário 2: Conformidade PNAE (>30% Agricultura Familiar)
```json
{
  "detalhes_por_tipo_fornecedor": [
    {
      "tipo_fornecedor": "AGRICULTURA_FAMILIAR",
      "valor_total": 6180.00,
      "percentual": 40.0
    },
    {
      "tipo_fornecedor": "CONVENCIONAL",
      "valor_total": 9270.00,
      "percentual": 60.0
    }
  ]
}
```

**Visualização:** Gráfico com 60% azul e 40% verde (✅ Conforme PNAE)

### Cenário 3: Múltiplos Tipos
```json
{
  "detalhes_por_tipo_fornecedor": [
    {
      "tipo_fornecedor": "CONVENCIONAL",
      "valor_total": 7725.00,
      "percentual": 50.0
    },
    {
      "tipo_fornecedor": "AGRICULTURA_FAMILIAR",
      "valor_total": 4635.00,
      "percentual": 30.0
    },
    {
      "tipo_fornecedor": "COOPERATIVA_AF",
      "valor_total": 3090.00,
      "percentual": 20.0
    }
  ]
}
```

**Visualização:** Gráfico com 3 fatias (azul 50%, verde escuro 30%, verde médio 20%)

## Acessibilidade

- ✅ Cores com contraste adequado
- ✅ Tooltip com informações completas
- ✅ Legenda textual além do gráfico visual
- ✅ Valores monetários formatados em BRL
- ✅ Percentuais com uma casa decimal
- ✅ Ordenação por valor (maior para menor)

## Performance

- ⚡ Gráfico renderizado apenas quando há dados
- ⚡ Chart.js otimizado para performance
- ⚡ Sem re-renderizações desnecessárias
- ⚡ Dados calculados no backend
- ⚡ Cache de cores e labels

## Casos Especiais

### Sem Dados de Tipo de Fornecedor
Se `detalhes_por_tipo_fornecedor` estiver vazio ou undefined:
- Gráfico não é exibido
- Card mostra apenas informações básicas

### Apenas Um Tipo
Se houver apenas um tipo de fornecedor:
- Gráfico mostra círculo completo (100%)
- Legenda mostra apenas um item

### Valores Zerados
Se algum tipo tiver valor zero:
- Não é exibido no gráfico
- Não aparece na legenda
