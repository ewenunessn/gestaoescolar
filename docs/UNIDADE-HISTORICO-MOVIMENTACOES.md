# Preservação de Unidade no Histórico de Movimentações

## Problema Identificado

Quando a unidade de um produto era alterada no cadastro (ex: de KG para Pct), todas as movimentações históricas passavam a exibir a nova unidade, causando inconsistência nos dados:

- Movimentação original: 10 KG
- Após mudança de unidade: 10 Pct (incorreto!)

Isso gerava confusão no histórico e relatórios, pois as quantidades perdiam seu contexto original.

## Solução Implementada

### 1. Adicionar Campo `unidade` na Tabela de Movimentações

Foi adicionado o campo `unidade` na tabela `estoque_central_movimentacoes` para armazenar a unidade usada no momento da movimentação.

**Migration:** `backend/src/migrations/20260304_add_unidade_to_movimentacoes.sql`

```sql
-- Adicionar coluna unidade
ALTER TABLE estoque_central_movimentacoes 
ADD COLUMN IF NOT EXISTS unidade VARCHAR(20);

-- Atualizar movimentações existentes com a unidade atual do produto
UPDATE estoque_central_movimentacoes ecm
SET unidade = p.unidade
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
WHERE ecm.estoque_central_id = ec.id
  AND ecm.unidade IS NULL;

-- Tornar o campo obrigatório
ALTER TABLE estoque_central_movimentacoes 
ALTER COLUMN unidade SET NOT NULL;
```

### 2. Atualizar Model para Salvar Unidade

O Model `EstoqueCentral.ts` foi atualizado para buscar e salvar a unidade do produto em todas as movimentações:

**Entrada:**
```typescript
// Buscar unidade do produto
const produtoResult = await client.query(
  'SELECT unidade FROM produtos WHERE id = $1',
  [dados.produto_id]
);
const unidadeProduto = produtoResult.rows[0].unidade;

// Salvar movimentação COM unidade
INSERT INTO estoque_central_movimentacoes (..., unidade)
VALUES (..., $11)
```

**Saída e Ajuste:** Mesma lógica aplicada.

### 3. Atualizar Telas do App

**Tela de Detalhes (`EstoqueCentralDetalhesScreen.tsx`):**
```typescript
// Usar unidade da movimentação, com fallback para unidade atual
<Text variant="bodySmall" style={styles.movUnidade}>
  {mov.unidade || estoque.unidade}
</Text>
```

**Tela de Relatórios (`EstoqueCentralRelatoriosScreen.tsx`):**
```typescript
// Incluir unidade no PDF de movimentações
const unidadeMov = mov.unidade || produto?.unidade || '';
<td>${sinal}${qtd} ${unidadeMov}</td>
```

## Como Aplicar a Migration

### Passo 1: Executar o Script

```bash
cd backend
node scripts/apply-unidade-movimentacoes.js
```

### Passo 2: Verificar Resultado

O script irá:
1. Adicionar a coluna `unidade`
2. Preencher movimentações existentes com a unidade atual do produto
3. Tornar o campo obrigatório
4. Exibir amostra de movimentações atualizadas

### Passo 3: Reiniciar Backend

```bash
npm run dev
```

## Comportamento Após Implementação

### Cenário 1: Movimentações Antigas
- Movimentações existentes recebem a unidade atual do produto
- Se a unidade foi alterada, o histórico mostrará a unidade atual (limitação para dados já existentes)

### Cenário 2: Novas Movimentações
- Todas as novas movimentações salvam a unidade do momento
- Se a unidade do produto mudar depois, o histórico permanece correto

### Exemplo Prático

1. Produto cadastrado com unidade "KG"
2. Registra entrada: 50 KG (salva unidade="KG")
3. Altera produto para unidade "Pct"
4. Registra saída: 10 Pct (salva unidade="Pct")
5. Histórico exibe corretamente:
   - Entrada: +50 KG
   - Saída: -10 Pct

## Vantagens da Solução

✅ Histórico preservado corretamente
✅ Relatórios com unidades corretas
✅ Permite mudança de unidade sem perder contexto
✅ Compatível com dados existentes
✅ Sem impacto em funcionalidades existentes

## Limitações

⚠️ Movimentações anteriores à migration mostrarão a unidade atual do produto (não há como recuperar a unidade original se já foi alterada)

## Alternativas Consideradas

### Opção 2: Bloquear Mudança de Unidade
- Impedir alteração da unidade se houver movimentações
- Mais restritivo, menos flexível
- Não escolhida

### Opção 3: Conversão Automática
- Permitir conversão entre unidades (1 kg = 10 pct)
- Muito complexo e propenso a erros
- Não escolhida

## Arquivos Modificados

- `backend/src/migrations/20260304_add_unidade_to_movimentacoes.sql`
- `backend/scripts/apply-unidade-movimentacoes.js`
- `backend/src/modules/estoque/models/EstoqueCentral.ts`
- `apps/entregador-native/src/screens/EstoqueCentralDetalhesScreen.tsx`
- `apps/entregador-native/src/screens/EstoqueCentralRelatoriosScreen.tsx`

## Testes Recomendados

1. Aplicar migration e verificar movimentações existentes
2. Registrar nova entrada com unidade atual
3. Alterar unidade do produto
4. Registrar nova saída com nova unidade
5. Verificar histórico mostra ambas unidades corretamente
6. Gerar PDF de movimentações e verificar unidades

