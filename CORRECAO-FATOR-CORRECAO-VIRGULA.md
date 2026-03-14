# Correção: Fator de Correção com Vírgula

## Problema

Quando o usuário digitava o fator de correção com vírgula (ex: `2,5`) ao invés de ponto (ex: `2.5`), o sistema apresentava erro:

```
TypeError: produto.fator_correcao.toFixed is not a function
```

Isso acontecia porque:
1. O valor vinha como string do backend
2. O `.toFixed()` só funciona em números
3. Não havia conversão antes de usar `.toFixed()`

## Solução Implementada

### Frontend

#### 1. Campo de Input (ProdutoDetalhe.tsx)
```typescript
onChange={e => {
    const value = e.target.value.replace(',', '.'); // Aceita vírgula e converte para ponto
    const parsed = parseFloat(value);
    setForm({ ...form, fator_correcao: isNaN(parsed) ? 1.0 : parsed });
}}
```

#### 2. Exibição com .toFixed()
Todos os lugares que usam `.toFixed()` agora fazem conversão:

```typescript
// Antes
{produto.fator_correcao.toFixed(3)}

// Depois
{Number(produto.fator_correcao).toFixed(3)}
```

**Arquivos corrigidos:**
- `frontend/src/pages/ProdutoDetalhe.tsx`
- `frontend/src/pages/RefeicaoDetalhe.tsx`
- `frontend/src/components/AdicionarIngredienteDialog.tsx`
- `frontend/src/components/EditarIngredienteDialog.tsx`

### Backend

Uso da função `num()` que já existe no código para conversão robusta:

```typescript
function num(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return null;
    const n = Number(t.replace(',', '.')); // Aceita vírgula!
    return isFinite(n) ? n : null;
  }
  if (typeof v === 'number' && isFinite(v)) return v;
  return null;
}
```

**Uso em criarProduto:**
```typescript
const fatorCorrecaoNormalizado = num(fator_correcao) || 1.0;
```

**Uso em editarProduto:**
```typescript
const fatorCorrecaoNormalizado = fator_correcao !== undefined ? num(fator_correcao) || 1.0 : undefined;
```

## Benefícios

1. ✅ Aceita vírgula e ponto decimal
2. ✅ Conversão automática e transparente
3. ✅ Sem erros de tipo
4. ✅ Validação robusta (NaN → 1.0)
5. ✅ Consistente em todo o sistema

## Exemplos de Uso

Agora o usuário pode digitar:
- `1,15` → Convertido para `1.15`
- `2,5` → Convertido para `2.5`
- `1.5` → Mantido como `1.5`
- `,5` → Convertido para `0.5`
- `2,` → Convertido para `2.0`

## Testes

- [x] Digitar fator com vírgula no cadastro de produto
- [x] Digitar fator com ponto no cadastro de produto
- [x] Visualizar produto com fator de correção
- [x] Editar produto alterando fator de correção
- [x] Adicionar ingrediente com fator de correção
- [x] Editar ingrediente com fator de correção
- [x] Visualizar tabela de ingredientes
- [x] Exportar PDF com fator de correção

## Status

✅ Corrigido e testado
