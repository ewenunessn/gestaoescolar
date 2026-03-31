# Correção de Alinhamento do PDF do Calendário

## Problema
O PDF do calendário estava desalinhado, com conteúdo das células mal posicionado e difícil de ler.

## Solução Implementada

### 1. Ajustes nas Células do Calendário
- Reduzido tamanho da fonte do número do dia: 11 → 10
- Reduzido tamanho da fonte do texto "+X mais": 7 → 6
- Adicionado `alignment: 'left'` em todos os elementos de texto
- Ajustado margens internas: `margin: 3` → `margin: [2, 2, 2, 2]`
- Reduzido espaçamento entre linhas de refeições: `margin: [0, 1, 0, 1]` → `margin: [0, 0.5, 0, 0.5]`

### 2. Ajustes na Tabela
- Reduzido altura do cabeçalho: 20 → 18
- Reduzido altura das células de conteúdo: 80 → 75
- Reduzido espessura das linhas: 1 → 0.5
- Adicionado padding explícito nas células: 3px em todos os lados

### 3. Ajustes no Layout da Página
- Reduzido margens laterais: 20 → 15
- Reduzido margem inferior: 40 → 30
- Ajustado margens do cabeçalho: [20, 15, 20, 0] → [15, 10, 15, 0]
- Reduzido tamanhos de fonte do cabeçalho para melhor proporção

### 4. Melhorias de Legibilidade
- Todos os textos agora têm alinhamento explícito à esquerda
- Espaçamento consistente entre elementos
- Melhor aproveitamento do espaço disponível
- Linhas mais finas para não sobrecarregar visualmente

## Resultado
- PDF mais limpo e profissional
- Conteúdo bem alinhado e legível
- Melhor aproveitamento do espaço da página A4 paisagem
- Células organizadas com hierarquia visual clara (dia → refeições)

## Arquivo Modificado
- `frontend/src/pages/CardapioCalendario.tsx` (função `exportarCalendarioPDF`)
