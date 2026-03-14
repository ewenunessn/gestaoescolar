# Correção: Uso da Tabela produto_composicao_nutricional

## Problema Identificado

O sistema tinha duas estruturas para armazenar informações nutricionais:

1. **Tabela `produto_composicao_nutricional`** - onde o frontend salva os dados
2. **Campos na tabela `produtos`** (`calorias_100g`, etc.) - onde os cálculos buscavam

Resultado: Dados salvos não apareciam nos cálculos.

## Solução Implementada

Modificado o controller `refeicaoCalculosController.ts` para buscar dados da tabela `produto_composicao_nutricional` usando LEFT JOIN.

### Query Atualizada

```sql
SELECT 
  rp.produto_id,
  p.nome as produto_nome,
  rp.per_capita,
  rp.tipo_medida,
  COALESCE(pcn.energia_kcal, pcn.calorias) as calorias_100g,
  COALESCE(pcn.proteina_g, pcn.proteinas) as proteinas_100g,
  COALESCE(pcn.carboidratos_g, pcn.carboidratos) as carboidratos_100g,
  COALESCE(pcn.lipideos_g, pcn.gorduras) as lipidios_100g,
  COALESCE(pcn.fibra_alimentar_g, pcn.fibras) as fibras_100g,
  COALESCE(pcn.sodio_mg, pcn.sodio) as sodio_100g
FROM refeicao_produtos rp
INNER JOIN produtos p ON p.id = rp.produto_id
LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
```

## Arquivos Modificados

- `backend/src/controllers/refeicaoCalculosController.ts`
- `backend/src/modules/produtos/controllers/produtoController.ts`

## Status

✅ Implementado e backend reiniciado
