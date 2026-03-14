# Limpeza de Colunas de Vitaminas

## Problema

As colunas `vitamina_e_mg` e `vitamina_b1_mg` estavam sendo usadas incorretamente para armazenar dados de Vitamina C e Retinol (Vitamina A).

## Solução Implementada

### 1. Banco Local

✅ Colunas corretas adicionadas:
- `vitamina_a_mcg` - Retinol/Vitamina A (microgramas)
- `vitamina_c_mg` - Vitamina C/Ácido Ascórbico (miligramas)

✅ Colunas antigas removidas:
- `vitamina_e_mg` (removida)
- `vitamina_b1_mg` (removida)

### 2. Banco Neon (Produção)

✅ Migration aplicada com sucesso:
1. Adicionadas colunas corretas (`vitamina_a_mcg`, `vitamina_c_mg`)
2. Dados copiados das colunas antigas (se houver)
3. Colunas antigas removidas (`vitamina_e_mg`, `vitamina_b1_mg`)

### 3. Backend Corrigido

✅ Todas as queries atualizadas:
- `buscarComposicaoNutricional` - SELECT corrigido
- `salvarComposicaoNutricional` - INSERT e UPDATE corrigidos
- `calcularValoresNutricionais` - Query de cálculo corrigida

## Arquivos de Migration

1. `20260313_add_vitaminas_composicao.sql` - Adiciona colunas corretas
2. `20260313_remove_colunas_antigas_vitaminas.sql` - Remove colunas antigas (local)
3. `20260313_fix_vitaminas_neon.sql` - Fix completo para Neon

## Scripts de Aplicação

- `apply-vitaminas-composicao.js` - Adiciona colunas (local)
- `apply-remove-colunas-antigas.js` - Remove antigas (local)
- `apply-remove-colunas-antigas-neon.js` - Fix completo (Neon)

## Status

✅ Banco local limpo
✅ Banco Neon limpo
✅ Backend atualizado e rodando
✅ Sem mais confusão entre colunas

## Colunas Finais

| Campo | Coluna Banco | Tipo | Descrição |
|-------|--------------|------|-----------|
| vitamina_a | vitamina_a_mcg | NUMERIC(10,2) | Retinol (Vitamina A) em mcg |
| vitamina_c | vitamina_c_mg | NUMERIC(10,2) | Ácido Ascórbico (Vitamina C) em mg |
