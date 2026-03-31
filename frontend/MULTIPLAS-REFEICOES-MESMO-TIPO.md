# Permitir Múltiplas Refeições do Mesmo Tipo

## Problema Anterior
O sistema não permitia adicionar duas ou mais refeições do mesmo tipo no mesmo dia. Por exemplo:
- Não era possível adicionar "Arroz com Feijão" 2x como "Refeição" no dia 15
- Não era possível adicionar "Suco de Laranja" e "Suco de Uva" ambos como "Lanche" no mesmo dia

Ao tentar, o sistema retornava o erro:
> "Esta preparação já foi adicionada neste dia com este tipo"

## Causa
Existia uma constraint UNIQUE no banco de dados na tabela `cardapio_refeicoes_dia`:
```sql
UNIQUE(cardapio_modalidade_id, refeicao_id, dia, tipo_refeicao)
```

Essa constraint impedia que a mesma preparação fosse adicionada múltiplas vezes no mesmo dia com o mesmo tipo.

## Solução Implementada

### 1. Migration Criada
Arquivo: `backend/migrations/20260401_allow_duplicate_refeicoes.sql`

```sql
ALTER TABLE cardapio_refeicoes_dia
DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_unique_refeicao_dia;
```

### 2. Execução
A migration foi executada com sucesso usando o script `backend/execute-migration.js`

### 3. Resultado
Agora é possível:
- ✅ Adicionar a mesma preparação múltiplas vezes no mesmo dia/tipo
- ✅ Adicionar preparações diferentes do mesmo tipo no mesmo dia
- ✅ Qualquer combinação necessária para o cardápio

## Exemplos de Uso

### Exemplo 1: Mesma Preparação, Múltiplas Vezes
- Dia 15, Tipo: Refeição
  - Arroz com Feijão (1ª vez)
  - Arroz com Feijão (2ª vez)

### Exemplo 2: Preparações Diferentes, Mesmo Tipo
- Dia 20, Tipo: Lanche
  - Suco de Laranja
  - Suco de Uva
  - Biscoito Integral

### Exemplo 3: Combinação Livre
- Dia 10, Tipo: Refeição
  - Macarronada
  - Salada
  - Macarronada (repetida)

## Arquivos Modificados
- `backend/migrations/20260401_allow_duplicate_refeicoes.sql` (criado)
- `backend/execute-migration.js` (criado)

## Observações
- A validação no backend (código 23505) ainda existe, mas agora não será mais acionada
- O frontend não precisa de alterações
- A funcionalidade já está disponível imediatamente após a execução da migration
