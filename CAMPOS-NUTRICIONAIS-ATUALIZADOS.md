# Campos Nutricionais Atualizados

## Campos Implementados

O sistema agora trabalha com 8 campos nutricionais específicos:

1. **Proteínas** (g)
2. **Lipídios** (g) 
3. **Carboidratos** (g)
4. **Cálcio** (mg)
5. **Ferro** (mg)
6. **Retinol/Vitamina A** (mcg)
7. **Vitamina C** (mg)
8. **Sódio** (mg)

## Mudanças Realizadas

### Backend

1. **Migration aplicada**: `20260313_add_vitaminas_composicao.sql`
   - Adicionadas colunas `vitamina_a_mcg` e `vitamina_c_mg`

2. **Controller de cálculos** (`refeicaoCalculosController.ts`)
   - Query atualizada para buscar os 8 campos da tabela `produto_composicao_nutricional`
   - Lógica de cálculo atualizada para incluir cálcio, ferro, vitamina A e vitamina C
   - Response retorna todos os 8 campos

### Frontend

1. **Tipo ComposicaoNutricional** (`frontend/src/types/produto.ts`)
   - Simplificado para incluir apenas os 8 campos necessários
   - Removidos campos não utilizados

2. **Página ProdutoDetalhe** (`frontend/src/pages/ProdutoDetalhe.tsx`)
   - Formulário de composição nutricional atualizado
   - Campos exibidos: Proteínas, Lipídios, Carboidratos, Cálcio, Ferro, Retinol, Vitamina C, Sódio

3. **Página RefeicaoDetalhe** (`frontend/src/pages/RefeicaoDetalhe.tsx`)
   - Exibição dos valores calculados atualizada
   - Grid com 3 colunas (xs=6, md=3)
   - Mostra os 8 campos calculados dinamicamente

4. **Serviço de cálculos** (`frontend/src/services/refeicaoCalculos.ts`)
   - Interface ValoresNutricionais atualizada com os 8 campos

## Mapeamento Banco de Dados

| Campo Frontend | Coluna Banco | Unidade |
|---------------|--------------|---------|
| proteinas | proteina_g | g |
| gorduras | lipideos_g | g |
| carboidratos | carboidratos_g | g |
| calcio | calcio_mg | mg |
| ferro | ferro_mg | mg |
| vitamina_a | vitamina_a_mcg | mcg |
| vitamina_c | vitamina_c_mg | mg |
| sodio | sodio_mg | mg |

## Status

✅ Backend atualizado e rodando
✅ Frontend atualizado
✅ Migration aplicada
✅ Cálculos dinâmicos funcionando
✅ Formulário de composição nutricional atualizado
