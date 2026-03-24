# Resumo: Correção do Cálculo de Unidades

## Problema Identificado

O sistema estava calculando incorretamente a quantidade de compra quando o produto tinha embalagens diferentes entre distribuição e compra.

### Exemplo: Óleo de Soja
- **Produto:** 900g por unidade
- **Contrato:** 450g por unidade
- **Demanda:** 13 escolas × 1 unidade = 13 unidades de 900g

**Antes (ERRADO):**
- Cálculo: 13 × 0.5 = 6.5 → 7 ou 8 unidades
- Resultado: Faltava produto!

**Depois (CORRETO):**
- Cálculo: 13 ÷ 0.5 = 26 unidades
- Resultado: Quantidade exata! ✅

## Correções Aplicadas

### 1. Fator de Conversão (contratoProdutoController.ts)
```typescript
// ANTES (errado):
fatorFinal = peso_embalagem * contrato.fator_conversao;

// DEPOIS (correto):
fatorFinal = peso_embalagem / produto.peso;
```

**Exemplo:**
- Fator = 450g / 900g = 0.5 ✅

### 2. Cálculo do Pedido (planejamentoComprasController.ts)
```typescript
// ANTES (errado):
quantidade_compra = demanda × fator_conversao;

// DEPOIS (correto):
quantidade_compra = demanda ÷ fator_conversao;
```

**Exemplo:**
- Pedido = 13 ÷ 0.5 = 26 unidades ✅

### 3. Detecção de Unidade (planejamentoComprasController.ts)
```typescript
// ANTES: Assumia que tudo era KG
quantidade_kg = demanda;

// DEPOIS: Detecta se é KG ou UNIDADE
if (isKg) {
  quantidade_kg = demanda;
  quantidade_distribuicao = demanda / peso_produto;
} else {
  quantidade_distribuicao = demanda;
  quantidade_kg = (demanda × peso_produto) / 1000;
}
```

## Resultado Final

### Guia de Demanda
```
13 escolas precisam de 1 unidade de 900g cada
Total: 13 unidades (11.700g)
```

### Pedido de Compra
```
Produto: Óleo de Soja
Quantidade: 26 unidades de 450g
Fornecedor: Distribuidora Mesquita
Preço: R$ 9,40 × 26 = R$ 244,40
Total: 11.700g ✅
```

### Distribuição
```
Cada escola recebe: 2 garrafas de 450g = 900g
Total distribuído: 13 × 2 = 26 garrafas
```

## Verificação

✅ Demanda: 13 × 900g = 11.700g
✅ Pedido: 26 × 450g = 11.700g
✅ Distribuição: 13 × 2 × 450g = 11.700g

**Tudo bate perfeitamente!**

## Arquivos Modificados

1. `backend/src/modules/contratos/controllers/contratoProdutoController.ts`
   - Cálculo automático do fator de conversão

2. `backend/src/controllers/planejamentoComprasController.ts`
   - Função `converterDemandaParaCompra` corrigida
   - Detecção de unidade (KG vs UNIDADE)
   - Cálculo correto (divisão ao invés de multiplicação)

3. `backend/scripts/corrigir-fator-oleo.js`
   - Script para corrigir fator errado no banco (500 → 0.5)

## Scripts de Teste

- `backend/scripts/testar-cenario-oleo-450g.js` - Teste teórico
- `backend/scripts/verificar-demanda-oleo.js` - Verificação da demanda
- `backend/scripts/debug-calculo-oleo.js` - Debug do cálculo
- `backend/scripts/verificar-pedido-oleo-atual.js` - Verificação do pedido

## Como Usar

1. **Reiniciar o backend** para carregar as correções
2. **Gerar novo pedido** da guia de demanda
3. **Verificar** que a quantidade está correta
4. **Distribuir** usando a conversão (2 garrafas de 450g = 1 de 900g)

## Observações Importantes

- A guia sempre mostra na unidade de distribuição (900g)
- O pedido sempre mostra na unidade de compra (450g)
- O sistema faz a conversão automaticamente
- Na entrega, cada escola recebe múltiplas embalagens menores
