# 🎯 Frontend - Simplificação Pendente

## Arquivos que precisam ser atualizados:

### 1. `frontend/src/pages/ContratoDetalhe.tsx` ⚠️ PRINCIPAL

Este é o formulário de cadastro/edição de contratos. Precisa remover:

#### Campos do estado inicial:
```typescript
// REMOVER estes campos:
const produtoVazio = { 
  produto_id: "", 
  quantidade: "", 
  preco_unitario: "", 
  marca: "", 
  peso: "",           // ❌ REMOVER
  unidade: "",        // ❌ REMOVER
  peso_embalagem: "", // ❌ REMOVER
  unidade_compra: "", // ❌ REMOVER
  fator_conversao: "" // ❌ REMOVER
};

// MANTER apenas:
const produtoVazio = { 
  produto_id: "", 
  quantidade: "", 
  preco_unitario: "", 
  marca: ""
};
```

#### Campos do formProduto (linha 189):
```typescript
// REMOVER:
const [formProduto, setFormProduto] = useState<any>({ 
  produto_id: "", 
  quantidade: "", 
  preco_unitario: "", 
  unidade: "Kg",      // ❌ REMOVER
  peso_embalagem: "", // ❌ REMOVER
  unidade_compra: "", // ❌ REMOVER
  fator_conversao: "" // ❌ REMOVER
});

// MANTER apenas:
const [formProduto, setFormProduto] = useState<any>({ 
  produto_id: "", 
  quantidade: "", 
  preco_unitario: "",
  marca: ""
});
```

#### Função de edição (linha 340):
```typescript
// REMOVER estas linhas:
peso: produto.peso ? formatarNumero(produto.peso) : "",
unidade: produto.unidade || "",
peso_embalagem: produto.peso_embalagem ? formatarNumero(produto.peso_embalagem) : "",
unidade_compra: produto.unidade_compra || "",
fator_conversao: produto.fator_conversao ? formatarNumero(produto.fator_conversao) : ""
```

#### Payload de envio (linha 400):
```typescript
// REMOVER do payload:
peso: formProduto.peso ? Number(formProduto.peso.toString().replace(',', '.')) : null,
unidade: formProduto.unidade || null,
peso_embalagem: formProduto.peso_embalagem ? Number(formProduto.peso_embalagem.toString().replace(',', '.')) : null,
unidade_compra: formProduto.unidade_compra || null,
fator_conversao: formProduto.fator_conversao ? Number(formProduto.fator_conversao.toString().replace(',', '.')) : null,

// MANTER apenas:
const payload = {
  contrato_id: Number(id),
  produto_id: Number(formProduto.produto_id),
  quantidade_contratada: Number(formProduto.quantidade.toString().replace(',', '.')),
  preco_unitario: Number(formProduto.preco_unitario.toString().replace(',', '.')),
  marca: formProduto.marca || null,
  ativo: true
};
```

#### Campos do formulário (linhas 1009-1059):
```typescript
// REMOVER estes TextField:
<TextField 
  label="Peso da Embalagem de Compra (gramas)" 
  type="number" 
  value={formProduto.peso_embalagem || ""} 
  onChange={e => setFormProduto({ ...formProduto, peso_embalagem: e.target.value })} 
/>

<TextField 
  label="Unidade de Compra" 
  select
  value={formProduto.unidade_compra || ""} 
  onChange={e => { ... }}
/>

<TextField 
  label="Fator de Conversão" 
  type="number" 
  value={formProduto.fator_conversao || ""} 
  onChange={e => setFormProduto({ ...formProduto, fator_conversao: e.target.value })} 
/>
```

---

### 2. `frontend/src/services/planejamentoCompras.ts` ℹ️ INFORMATIVO

Este arquivo tem tipos que incluem `peso_embalagem`, mas são apenas para exibição de dados já calculados. Pode manter por enquanto, pois não afeta o cadastro.

---

### 3. `frontend/src/services/unidadesMedida.ts` ℹ️ MANTER

Este arquivo tem `fator_conversao_base` que é diferente - é para conversão entre unidades de medida (KG → G, L → ML), não para conversão de embalagens. MANTER.

---

## Resumo das mudanças:

### ❌ REMOVER do contrato:
- `peso_embalagem` (peso da embalagem de compra)
- `unidade_compra` (unidade de compra)
- `fator_conversao` (fator de conversão)
- `peso` (peso do produto - já está no cadastro de produtos)
- `unidade` (unidade do produto - já está no cadastro de produtos)

### ✅ MANTER no contrato:
- `produto_id` (qual produto)
- `quantidade_contratada` (quantidade contratada)
- `preco_unitario` (preço unitário)
- `marca` (marca do produto)
- `ativo` (se está ativo)

---

## Regra de Ouro:

> **"O contrato só precisa saber: qual produto, quanto custa, qual marca"**

O peso e unidade já estão no cadastro do produto. Não precisa duplicar no contrato!

---

## Próximos passos:

1. ✅ Backend simplificado (CONCLUÍDO)
2. ⚠️ Frontend precisa ser atualizado (PENDENTE)
3. 🧪 Testar após atualização do frontend

