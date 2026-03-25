# Padronização do Tipo de Processamento

## Resumo

O campo `tipo_processamento` na tabela `produtos` foi padronizado para aceitar apenas 4 valores baseados na classificação NOVA (Classificação de Alimentos segundo o Processamento):

- `in natura`
- `minimamente processado`
- `processado`
- `ultraprocessado`

## Mudanças Realizadas

### 1. Banco de Dados

**Arquivo:** `backend/migrations/20260324_fix_tipo_processamento_valores.sql`

- Normalização de valores existentes para lowercase
- Conversão de valores antigos para o padrão correto
- Adição de constraint CHECK para garantir apenas valores válidos
- Criação de índice para otimizar consultas

**Aplicar migration:**
```bash
cd backend/migrations
node aplicar-fix-tipo-processamento.js
```

### 2. Backend (API)

**Arquivo:** `backend/src/modules/produtos/controllers/produtoController.ts`

Adicionada validação nos endpoints:
- `POST /api/produtos` (criar produto)
- `PUT /api/produtos/:id` (editar produto)

A validação retorna erro 400 se um valor inválido for enviado:
```json
{
  "error": "Tipo de processamento inválido. Valores aceitos: in natura, minimamente processado, processado, ultraprocessado"
}
```

### 3. Script de Atualização TACO

**Arquivo:** `backend/scripts/atualizar-produtos-taco.js`

- Atualizado para retornar valores em lowercase
- Validação adicional para garantir apenas valores aceitos
- Ajuste no cálculo de fator de correção para considerar processados e ultraprocessados

### 4. Frontend

Os seguintes componentes já estavam corretos e não precisaram de alteração:

- `frontend/src/pages/Produtos.tsx` - Formulário de criação
- `frontend/src/pages/ProdutoDetalhe.tsx` - Edição inline
- `frontend/src/utils/produtoImportUtils.ts` - Importação Excel/CSV
- `frontend/src/components/ImportacaoProdutos.tsx` - Validação de importação

## Classificação NOVA

### In Natura
Alimentos obtidos diretamente de plantas ou animais sem alterações após deixarem a natureza.

**Exemplos:** frutas frescas, verduras, legumes, carnes frescas, ovos, leite pasteurizado

### Minimamente Processado
Alimentos in natura submetidos a processos de limpeza, remoção de partes não comestíveis, secagem, embalagem, pasteurização, congelamento, fermentação.

**Exemplos:** arroz, feijão, macarrão, polpas de frutas, carnes congeladas

### Processado
Produtos fabricados com adição de sal, açúcar ou outra substância de uso culinário a alimentos in natura ou minimamente processados.

**Exemplos:** conservas, queijos, pães, frutas em calda, carnes salgadas

### Ultraprocessado
Formulações industriais feitas com substâncias extraídas de alimentos ou sintetizadas, com pouco ou nenhum alimento inteiro.

**Exemplos:** refrigerantes, biscoitos recheados, salgadinhos, nuggets, embutidos, produtos instantâneos

## Impacto no Sistema

### Fator de Correção
O script de atualização considera:
- **Processados e ultraprocessados:** fator = 1.0 (já vem prontos)
- **In natura e minimamente processados:** fator baseado em categoria e produto específico

### Relatórios PNAE
O tipo de processamento é usado para:
- Controle de alimentos ultraprocessados (máximo 20% do valor)
- Incentivo a alimentos in natura e minimamente processados
- Relatórios de conformidade com diretrizes nutricionais

### Importação/Exportação
- Modelos Excel incluem validação de dados (dropdown)
- Importação valida valores antes de salvar
- Exportação mantém valores padronizados

## Validação

Para verificar se a padronização foi aplicada corretamente:

```sql
-- Verificar valores únicos
SELECT DISTINCT tipo_processamento 
FROM produtos 
ORDER BY tipo_processamento;

-- Deve retornar apenas:
-- NULL (produtos sem tipo definido)
-- in natura
-- minimamente processado
-- processado
-- ultraprocessado

-- Verificar distribuição
SELECT 
  tipo_processamento,
  COUNT(*) as total
FROM produtos
WHERE ativo = true
GROUP BY tipo_processamento
ORDER BY total DESC;
```

## Retrocompatibilidade

A migration converte automaticamente valores antigos:
- `In Natura`, `IN NATURA`, `in_natura` → `in natura`
- `Minimamente Processado`, `minimamente_processado` → `minimamente processado`
- `Processado`, `PROCESSADO` → `processado`
- `Ultraprocessado`, `ultra_processado` → `ultraprocessado`

Valores não reconhecidos permanecem como NULL e podem ser atualizados manualmente.
