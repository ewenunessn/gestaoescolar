# Otimização do Romaneio de Entrega

**Data**: 2026-04-02  
**Autor**: Sistema  
**Status**: ✅ Implementado

## Problema Identificado

O Romaneio estava apresentando lentidão ao carregar dados:
- Query retornando 785 linhas
- Tempo de execução: ~560ms
- Uso de `STRING_AGG` com `LEFT JOIN` e `GROUP BY` em todas as colunas
- Ausência de índices nas colunas mais consultadas

## Otimizações Implementadas

### 1. Refatoração da Query SQL

**Antes:**
```sql
SELECT 
  gpe.id, gpe.data_entrega, gpe.quantidade, gpe.unidade, 
  gpe.observacao, gpe.status, p.nome as produto_nome,
  e.nome as escola_nome, STRING_AGG(re.nome, ', ') as escola_rota
FROM guia_produto_escola gpe
JOIN guias g ON g.id = gpe.guia_id
JOIN produtos p ON gpe.produto_id = p.id
JOIN escolas e ON gpe.escola_id = e.id
LEFT JOIN rota_escolas res ON e.id = res.escola_id
LEFT JOIN rotas_entrega re ON res.rota_id = re.id
WHERE ...
GROUP BY gpe.id, gpe.data_entrega, gpe.quantidade, gpe.unidade, 
         gpe.observacao, gpe.status, p.nome, e.nome
ORDER BY gpe.data_entrega, e.nome, p.nome
```

**Depois:**
```sql
SELECT 
  gpe.id, gpe.data_entrega, gpe.quantidade, gpe.unidade,
  gpe.observacao, gpe.status, p.nome as produto_nome,
  e.nome as escola_nome,
  (
    SELECT STRING_AGG(re.nome, ', ')
    FROM rota_escolas res
    JOIN rotas_entrega re ON res.rota_id = re.id
    WHERE res.escola_id = e.id
  ) as escola_rota
FROM guia_produto_escola gpe
JOIN produtos p ON gpe.produto_id = p.id
JOIN escolas e ON gpe.escola_id = e.id
WHERE ...
  AND gpe.data_entrega IS NOT NULL
ORDER BY gpe.data_entrega, e.nome, p.nome
```

**Melhorias:**
- ✅ Removido `GROUP BY` desnecessário
- ✅ Substituído `LEFT JOIN` + `STRING_AGG` por subquery correlacionada
- ✅ Removido JOIN com tabela `guias` (não estava sendo usado)
- ✅ Filtro de rota otimizado com `EXISTS` ao invés de JOIN
- ✅ Adicionado filtro `data_entrega IS NOT NULL` para mostrar apenas itens programados

### 2. Índices Criados

Foram criados 4 índices estratégicos para otimizar as queries:

```sql
-- Índice composto para filtros mais comuns (data + status)
CREATE INDEX idx_guia_produto_escola_data_status 
ON guia_produto_escola(data_entrega, status);

-- Índice para filtros e JOINs por escola
CREATE INDEX idx_guia_produto_escola_escola_id 
ON guia_produto_escola(escola_id);

-- Índice para JOINs com produtos
CREATE INDEX idx_guia_produto_escola_produto_id 
ON guia_produto_escola(produto_id);

-- Índice para subquery de rotas
CREATE INDEX idx_rota_escolas_escola_id 
ON rota_escolas(escola_id);
```

### 3. Validação de Datas no Frontend

Criada função helper `formatarDataSegura()` para evitar erro "Invalid time value":

```typescript
const formatarDataSegura = (data: string | null | undefined, fallback: string = '—'): string => {
  if (!data || data.trim() === '') return fallback;
  try {
    const dataObj = new Date(data + 'T12:00:00');
    if (isNaN(dataObj.getTime())) return fallback;
    return format(dataObj, 'dd/MM/yyyy');
  } catch (e) {
    console.warn('Erro ao formatar data:', data, e);
    return fallback;
  }
};
```

**Benefícios:**
- ✅ Valida se a data existe e não é string vazia
- ✅ Adiciona `'T12:00:00'` para evitar problemas de timezone
- ✅ Verifica se a data é válida com `isNaN()`
- ✅ Usa try-catch para capturar qualquer erro
- ✅ Retorna fallback customizável
- ✅ Código reutilizável em todo o componente

### 4. Filtro de Itens Sem Data

Adicionado filtro no backend para mostrar apenas itens com data programada:

```sql
AND gpe.data_entrega IS NOT NULL
```

Mensagem informativa no frontend quando não há itens:
- Informa que nenhum item foi encontrado
- Sugere verificar se os produtos têm data de entrega programada
- Ajuda o usuário a entender por que o romaneio está vazio

## Resultados Esperados

### Performance
- ⚡ Redução de ~40-60% no tempo de execução da query
- ⚡ Melhor uso de índices pelo PostgreSQL
- ⚡ Menos operações de agregação

### Escalabilidade
- 📈 Query otimizada para grandes volumes de dados
- 📈 Índices permitem crescimento sem degradação linear
- 📈 Subquery correlacionada é mais eficiente que GROUP BY para este caso

### Manutenibilidade
- 🔧 Query mais simples e legível
- 🔧 Menos JOINs = menos pontos de falha
- 🔧 Índices documentados e versionados

## Arquivos Modificados

1. **backend/src/modules/guias/models/Guia.ts**
   - Método `listarRomaneio()` refatorado
   - Adicionado filtro `data_entrega IS NOT NULL`

2. **backend/migrations/add-romaneio-indexes.js**
   - Migration para criar índices

3. **frontend/src/pages/Romaneio.tsx**
   - Criada função `formatarDataSegura()` para validação robusta de datas
   - Aplicada em todas as formatações de data
   - Adicionadas mensagens informativas quando não há itens

## Como Testar

1. Acesse o Romaneio de Entrega
2. Aplique filtros de data (ex: último mês)
3. Verifique o tempo de carregamento no console do navegador
4. Teste com diferentes combinações de filtros:
   - Por data
   - Por rota
   - Por status
   - Combinações múltiplas

## Monitoramento

Para verificar se os índices estão sendo usados:

```sql
EXPLAIN ANALYZE
SELECT gpe.id, gpe.data_entrega, gpe.quantidade, gpe.unidade,
       gpe.observacao, gpe.status, p.nome as produto_nome,
       e.nome as escola_nome,
       (SELECT STRING_AGG(re.nome, ', ')
        FROM rota_escolas res
        JOIN rotas_entrega re ON res.rota_id = re.id
        WHERE res.escola_id = e.id) as escola_rota
FROM guia_produto_escola gpe
JOIN produtos p ON gpe.produto_id = p.id
JOIN escolas e ON gpe.escola_id = e.id
WHERE gpe.data_entrega >= '2026-03-01'
  AND gpe.data_entrega <= '2026-04-30'
  AND (gpe.status != 'cancelado' OR gpe.status IS NULL)
ORDER BY gpe.data_entrega, e.nome, p.nome;
```

Procure por:
- `Index Scan using idx_guia_produto_escola_data_status`
- Tempo de execução reduzido
- Menos "Seq Scan" (varreduras sequenciais)

## Próximos Passos (Opcional)

Se ainda houver problemas de performance com volumes muito grandes:

1. **Paginação**: Implementar carregamento paginado (ex: 100 itens por vez)
2. **Cache**: Adicionar cache de 5 minutos para queries repetidas
3. **Lazy Loading**: Carregar detalhes de rotas apenas quando necessário
4. **Virtualização**: Usar react-window para renderizar apenas itens visíveis

## Notas Técnicas

- Os índices são criados com `IF NOT EXISTS` para evitar erros em re-execuções
- A subquery correlacionada é executada apenas uma vez por linha (otimizada pelo PostgreSQL)
- O índice composto `(data_entrega, status)` permite queries eficientes mesmo filtrando apenas por data
- Validação de datas no frontend previne crashes ao renderizar datas nulas/inválidas
