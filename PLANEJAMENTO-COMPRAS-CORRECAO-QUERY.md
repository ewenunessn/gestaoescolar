# Correção: Query de Busca de Cardápios por Competência

## Problema Identificado

A query de busca de cardápios por competência estava retornando 0 resultados mesmo quando havia cardápios cadastrados para o período.

### Causa Raiz

Os parâmetros da query estavam **invertidos** na comparação de datas:

```typescript
// ❌ ERRADO - parâmetros invertidos
const cardapiosQuery = await db.pool.query(`
  SELECT DISTINCT c.id, c.nome, c.data_inicio, c.data_fim
  FROM cardapios c
  INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
  WHERE c.ativo = true
    AND (
      (c.data_inicio <= $1 AND c.data_fim >= $2)  -- $1 = último dia, $2 = primeiro dia
      OR (c.data_inicio BETWEEN $2 AND $1)
      OR (c.data_fim BETWEEN $2 AND $1)
    )
  ORDER BY c.nome
`, [ultimoDia, primeiroDia]);  // ❌ Ordem invertida!
```

## Solução Implementada

### 1. Correção da Query

```typescript
// ✅ CORRETO - parâmetros na ordem correta
const primeiroDiaStr = primeiroDiaCompetencia.toISOString().split('T')[0];
const ultimoDiaStr = ultimoDiaCompetencia.toISOString().split('T')[0];

const cardapiosQuery = await db.pool.query(`
  SELECT DISTINCT c.id, c.nome, c.data_inicio, c.data_fim, c.modalidade_id
  FROM cardapios c
  INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
  WHERE c.ativo = true
    AND (
      -- Cardápio cobre todo o período
      (c.data_inicio <= $1 AND c.data_fim >= $2)
      -- Cardápio começa dentro do período
      OR (c.data_inicio BETWEEN $1 AND $2)
      -- Cardápio termina dentro do período
      OR (c.data_fim BETWEEN $1 AND $2)
    )
  ORDER BY c.nome
`, [primeiroDiaStr, ultimoDiaStr]);  // ✅ Ordem correta: primeiro, último
```

### 2. Melhorias nos Logs

```typescript
console.log('📅 Buscando cardápios para competência:', {
  competencia,
  primeiroDia: primeiroDiaStr,
  ultimoDia: ultimoDiaStr
});

console.log('📋 Cardápios encontrados:', {
  total: cardapios.length,
  cardapios: cardapios.map(c => ({
    id: c.id,
    nome: c.nome,
    data_inicio: c.data_inicio,
    data_fim: c.data_fim
  }))
});
```

### 3. Mensagem de Erro Melhorada

Quando nenhum cardápio é encontrado, agora mostra sugestões de cardápios próximos:

```typescript
if (cardapios.length === 0) {
  // Buscar cardápios próximos para ajudar o usuário
  const cardapiosProximos = await db.pool.query(`
    SELECT id, nome, data_inicio, data_fim
    FROM cardapios
    WHERE ativo = true
    ORDER BY ABS(EXTRACT(EPOCH FROM (data_inicio - $1::date)))
    LIMIT 3
  `, [primeiroDiaStr]);
  
  return res.status(400).json({ 
    error: 'Nenhum cardápio encontrado para esta competência',
    detalhes: `Não há cardápios ativos para ${competencia}. Cadastre cardápios em Cardápios > Cardápios.`,
    sugestoes: cardapiosProximos.rows.length > 0 ? {
      mensagem: 'Cardápios mais próximos encontrados:',
      cardapios: cardapiosProximos.rows
    } : null
  });
}
```

## Teste Realizado

### Script de Teste

Criado `backend/criar-cardapio-marco-teste.js` que:
1. Cria um cardápio de teste para março/2026
2. Adiciona uma refeição ao cardápio
3. Testa a query de busca por competência

### Resultado

```
✅ Cardápio criado: Cardápio Teste Março 2026
✅ Refeição adicionada ao cardápio
🔍 Teste de busca por competência 2026-03:
   Encontrados: 1
```

## Lógica de Busca

A query busca cardápios que se **sobrepõem** ao período da competência:

1. **Cardápio cobre todo o período**: `data_inicio <= primeiro_dia AND data_fim >= ultimo_dia`
2. **Cardápio começa dentro do período**: `data_inicio BETWEEN primeiro_dia AND ultimo_dia`
3. **Cardápio termina dentro do período**: `data_fim BETWEEN primeiro_dia AND ultimo_dia`

### Exemplos

Para competência **março/2026** (2026-03-01 a 2026-03-31):

| Cardápio | Data Início | Data Fim | Encontrado? | Motivo |
|----------|-------------|----------|-------------|--------|
| A | 2026-02-01 | 2026-03-15 | ✅ Sim | Termina dentro do período |
| B | 2026-03-01 | 2026-03-31 | ✅ Sim | Cobre todo o período |
| C | 2026-03-10 | 2026-04-10 | ✅ Sim | Começa dentro do período |
| D | 2026-02-01 | 2026-04-30 | ✅ Sim | Cobre todo o período |
| E | 2026-01-01 | 2026-02-28 | ❌ Não | Termina antes do período |
| F | 2026-04-01 | 2026-04-30 | ❌ Não | Começa depois do período |

## Arquivos Modificados

- `backend/src/controllers/planejamentoComprasController.ts`
  - Função `calcularDemandaPorCompetencia`
  - Correção da ordem dos parâmetros na query
  - Melhoria nos logs de debug
  - Mensagem de erro com sugestões

## Status

✅ **Corrigido e testado**

A query agora encontra corretamente os cardápios para a competência selecionada.
