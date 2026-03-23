# Atualização Frontend - Exibição de Quantidades em Embalagens

## Data: 23/03/2026

## Objetivo
Atualizar o frontend para exibir quantidades em unidades de embalagem (pacotes, caixas, etc.) ao invés de apenas kg, quando o produto tiver peso definido.

## Alterações Realizadas

### 1. Interfaces TypeScript Atualizadas

**Arquivo**: `frontend/src/services/planejamentoCompras.ts`

Adicionados campos opcionais nas interfaces:
- `quantidade_embalagens?: number` - Quantidade em unidades de embalagem
- `peso_embalagem?: number` - Peso da embalagem em gramas

Interfaces atualizadas:
- `DemandaPorEscola.produtos[]`
- `DemandaPorProduto`
- `DemandaConsolidada.produtos[]`

### 2. Componente PlanejamentoCompras Atualizado

**Arquivo**: `frontend/src/pages/PlanejamentoCompras.tsx`

#### Tab "Por Escola"
```tsx
{prod.quantidade_embalagens ? (
  <>
    <strong>{prod.quantidade_embalagens}</strong> {prod.unidade}
    <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '8px' }}>
      ({toNum(prod.quantidade_kg).toFixed(2)}kg)
    </span>
  </>
) : (
  `${toNum(prod.quantidade_kg).toFixed(2)} kg`
)}
```

#### Tab "Por Produto"
```tsx
{prod.quantidade_embalagens ? (
  <>
    <strong>{prod.quantidade_embalagens}</strong> {prod.unidade}
    <span style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '8px' }}>
      ({toNum(prod.quantidade_total_kg).toFixed(2)}kg)
    </span>
  </>
) : (
  `${toNum(prod.quantidade_total_kg).toFixed(2)} kg`
)}
```

#### Tab "Consolidado"
```tsx
{produtoEscola.quantidade_embalagens ? (
  <>
    <strong>{produtoEscola.quantidade_embalagens}</strong> {prod.unidade}
    <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block' }}>
      ({toNum(produtoEscola.quantidade_kg).toFixed(2)}kg)
    </span>
  </>
) : (
  `${toNum(produtoEscola.quantidade_kg).toFixed(2)} kg`
)}
```

## Lógica de Exibição

1. **Se `quantidade_embalagens` existe**: Exibe quantidade em unidades + kg entre parênteses
   - Exemplo: **7** Pacote (3.12kg)

2. **Se `quantidade_embalagens` não existe**: Exibe apenas kg
   - Exemplo: 3.12 kg

## Backend

O backend já está retornando os campos corretos:
- `quantidade_embalagens` - Calculado pela função `aplicarConversaoEmbalagem()`
- `peso_embalagem` - Vem do campo `produtos.peso`
- `unidade` - Vem do campo `produtos.unidade_distribuicao`

## Exemplo de Resposta do Backend

```json
{
  "produto_id": 123,
  "produto_nome": "Alho",
  "unidade": "Pacote",
  "quantidade_kg": 3.12,
  "quantidade_embalagens": 7,
  "peso_embalagem": 500
}
```

## Próximos Passos

1. ✅ Frontend atualizado para exibir quantidades em embalagens
2. ⏳ Testar no módulo de Demanda (`frontend/src/pages/Demanda.tsx`)
3. ⏳ Testar no componente GuiaDetalhe (`frontend/src/components/GuiaDetalhe.tsx`)

## Observações

- A quantidade em kg é mantida para cálculos de preço e auditoria
- O arredondamento para cima garante quantidade suficiente
- Produtos sem peso definido continuam sendo exibidos em kg
