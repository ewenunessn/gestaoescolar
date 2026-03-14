# Frontend Per Capita por Modalidade - IMPLEMENTADO ✅

## Resumo

A funcionalidade de per capita por modalidade está completamente implementada no frontend e integrada na página de Refeições.

## O que foi feito

### 1. Componente de Diálogo Criado
**Arquivo:** `frontend/src/components/AdicionarIngredienteDialog.tsx`

Características:
- ✅ Autocomplete para selecionar produto
- ✅ Select para tipo de medida (gramas/unidades)
- ✅ Modo Simples: campo único "Per Capita Geral"
- ✅ Modo Avançado: campos individuais por modalidade
- ✅ Botão toggle (ícone ⚙️) para alternar entre modos
- ✅ Validação de valores
- ✅ Carregamento dinâmico de modalidades ativas
- ✅ Alert se não houver modalidades cadastradas

### 2. Serviço Atualizado
**Arquivo:** `frontend/src/services/refeicoes.ts`

Função `adicionarProdutoNaRefeicao` modificada para aceitar:
```typescript
adicionarProdutoNaRefeicao(
  refeicaoId: number,
  produtoId: number,
  perCapita: number,
  tipoMedida: 'gramas' | 'unidades',
  perCapitaPorModalidade?: Array<{modalidade_id: number, per_capita: number}>
)
```

### 3. Página RefeicaoDetalhe Integrada
**Arquivo:** `frontend/src/pages/RefeicaoDetalhe.tsx`

Mudanças:
- ✅ Import do `AdicionarIngredienteDialog`
- ✅ Estado `dialogAdicionarOpen` adicionado
- ✅ Função `adicionarProduto` modificada para receber parâmetros do diálogo
- ✅ UI simplificada: botão "Adicionar Ingrediente" abre o diálogo
- ✅ Autocomplete removido da UI principal
- ✅ Diálogo renderizado no final do componente

### 4. Backend Atualizado
**Arquivos:**
- `backend/src/modules/cardapios/controllers/refeicaoProdutoController.ts`
- `backend/src/modules/cardapios/models/RefeicaoProduto.ts`

Mudanças:
- ✅ Controller aceita `per_capita_por_modalidade` no body
- ✅ Model usa transação para salvar produto + ajustes
- ✅ Query retorna ajustes por modalidade via JSON aggregation

## Como Usar

### Modo Simples (Padrão)
1. Clique em "Adicionar Ingrediente"
2. Selecione o produto
3. Escolha a unidade de medida
4. Digite o per capita geral (ex: 100g)
5. Clique em "Adicionar"
6. ✅ O valor será aplicado para TODAS as modalidades

### Modo Avançado (Por Modalidade)
1. Clique em "Adicionar Ingrediente"
2. Clique no ícone ⚙️ (Ajustes) no canto superior direito
3. Campos individuais aparecem para cada modalidade:
   - Creche: 80g
   - Pré-escola: 100g
   - Fundamental: 120g
4. Clique em "Adicionar"
5. ✅ Cada modalidade recebe seu valor específico

## Fluxo de Dados

```
Frontend (RefeicaoDetalhe)
    ↓ Clica "Adicionar Ingrediente"
    ↓ Abre AdicionarIngredienteDialog
    ↓ Usuário preenche dados
    ↓ Clica "Adicionar"
    ↓
    ↓ adicionarProduto(produtoId, perCapitaGeral, tipoMedida, perCapitaPorModalidade)
    ↓
    ↓ adicionarProdutoNaRefeicao(refeicaoId, produtoId, perCapita, tipoMedida, perCapitaPorModalidade)
    ↓
Backend (refeicaoProdutoController)
    ↓ Valida dados
    ↓ Chama addRefeicaoProduto(data)
    ↓
Backend (RefeicaoProduto Model)
    ↓ BEGIN TRANSACTION
    ↓ INSERT INTO refeicao_produtos
    ↓ Para cada modalidade:
    ↓   INSERT INTO refeicao_produto_modalidade
    ↓ COMMIT
    ↓
    ↓ Retorna produto criado
    ↓
Frontend
    ↓ Recarrega lista de produtos
    ↓ Invalida queries de cálculos
    ↓ Mostra toast de sucesso
```

## Próximos Passos (Opcional)

### Melhorias na Tabela
- [ ] Adicionar colunas para mostrar per capita por modalidade
- [ ] Indicador visual quando há ajustes específicos (badge, ícone)
- [ ] Tooltip mostrando valores por modalidade ao passar o mouse

### Edição de Ingredientes
- [ ] Permitir editar per capita por modalidade de ingredientes já adicionados
- [ ] Diálogo de edição similar ao de adição

### Visualização
- [ ] Aba "Per Capita por Modalidade" mostrando matriz completa
- [ ] Exportar tabela de per capita por modalidade para Excel

## Exemplo de Payload

### Request (Modo Simples)
```json
{
  "produto_id": 1,
  "per_capita": 100,
  "tipo_medida": "gramas",
  "per_capita_por_modalidade": [
    { "modalidade_id": 1, "per_capita": 100 },
    { "modalidade_id": 2, "per_capita": 100 },
    { "modalidade_id": 3, "per_capita": 100 }
  ]
}
```

### Request (Modo Avançado)
```json
{
  "produto_id": 1,
  "per_capita": 0,
  "tipo_medida": "gramas",
  "per_capita_por_modalidade": [
    { "modalidade_id": 1, "per_capita": 80 },
    { "modalidade_id": 2, "per_capita": 100 },
    { "modalidade_id": 3, "per_capita": 120 }
  ]
}
```

## Testes Recomendados

1. ✅ Adicionar ingrediente em modo simples
2. ✅ Adicionar ingrediente em modo avançado
3. ✅ Alternar entre modos e verificar se valores são sincronizados
4. ✅ Validar limites (gramas: 0-1000, unidades: 0-100)
5. ✅ Verificar se valores são salvos corretamente no banco
6. ✅ Verificar se cálculos nutricionais consideram per capita correto

## Status Final

✅ **IMPLEMENTAÇÃO COMPLETA E FUNCIONAL**

Todos os componentes estão criados e integrados. A funcionalidade está pronta para uso!
