# 🎯 Implementação do Índice de Cocção - PENDENTE

## ✅ O que já foi feito:

1. ✅ Migration executada: campo `indice_coccao` adicionado ao banco
2. ✅ Documentação completa criada: `FATOR_CORRECAO_E_INDICE_COCCAO.md`
3. ✅ Valores padrão definidos: `indice_coccao = 1.0`

---

## ⚠️ O que precisa ser feito:

### 1. Frontend - Cadastro de Produtos (`frontend/src/pages/ProdutoDetalhe.tsx`)

Adicionar campo "Índice de Cocção" no formulário:

```typescript
<TextField
  label="Índice de Cocção"
  type="number"
  value={formData.indice_coccao || 1.0}
  onChange={(e) => setFormData({ ...formData, indice_coccao: parseFloat(e.target.value) })}
  inputProps={{ min: 0.1, max: 10, step: 0.01 }}
  helperText="Mudança de peso no cozimento. Ex: Arroz=2.5 (ganha), Carne=0.7 (perde)"
/>
```

### 2. Backend - Controller de Produtos

Atualizar queries para incluir `indice_coccao`:

```typescript
// Em produtoController.ts
const query = `
  INSERT INTO produtos (nome, fator_correcao, indice_coccao, ...)
  VALUES ($1, $2, $3, ...)
`;
```

### 3. Backend - Cálculos nas Preparações

Atualizar lógica de cálculo em `refeicaoCalculosController.ts`:

```typescript
// CORRETO:
const pesoCruNecessario = perCapitaFinal / produto.indice_coccao;
const pesoBrutoComprar = pesoCruNecessario * produto.fator_correcao;

// Exemplo: Arroz
// perCapitaFinal = 150g (cozido)
// indice_coccao = 2.5
// fator_correcao = 1.0
// pesoCruNecessario = 150 / 2.5 = 60g
// pesoBrutoComprar = 60 * 1.0 = 60g
```

### 4. Frontend - Exibição nas Preparações

Atualizar `PreparacaoDetalhe.tsx` para mostrar:
- Per Capita Líquido (o que come - cozido)
- Per Capita Bruto (o que compra - considerando IC e FC)

### 5. Remover campo "tipo" do fator de correção

O campo "tipo" não faz sentido porque:
- Fator de Correção é sempre para perda no pré-preparo
- Índice de Cocção é sempre para mudança no cozimento
- Não há "tipos" diferentes, são conceitos distintos

---

## 📋 Arquivos que precisam ser modificados:

### Frontend:
- [ ] `frontend/src/pages/ProdutoDetalhe.tsx` - Adicionar campo indice_coccao
- [ ] `frontend/src/pages/Produtos.tsx` - Exibir indice_coccao na listagem
- [ ] `frontend/src/pages/PreparacaoDetalhe.tsx` - Ajustar cálculos

### Backend:
- [ ] `backend/src/modules/produtos/controllers/produtoController.ts` - CRUD com indice_coccao
- [ ] `backend/src/controllers/refeicaoCalculosController.ts` - Ajustar cálculos
- [ ] `backend/src/controllers/planejamentoComprasController.ts` - Ajustar cálculos de demanda

---

## 🧮 Lógica Correta dos Cálculos:

### Fluxo:
```
1. Nutricionista define: Per Capita Final (cozido) = 150g arroz
2. Sistema calcula: Peso Cru = 150g / 2.5 (IC) = 60g
3. Sistema calcula: Peso Comprar = 60g × 1.0 (FC) = 60g
```

### Validações:
- Fator de Correção: sempre ≥ 1.0 (nunca ganha peso na limpeza)
- Índice de Cocção: pode ser > 1.0 (ganha) ou < 1.0 (perde)
- Alimentos crus (salada): IC = 1.0
- Alimentos sem perda (arroz, óleo): FC = 1.0

---

## 📚 Referências:

- Documentação completa: `backend/FATOR_CORRECAO_E_INDICE_COCCAO.md`
- Migration: `backend/migrations/20260324_adicionar_indice_coccao.sql`
- Script de execução: `backend/scripts/executar-migration-indice-coccao.js`

---

**Status**: ⚠️ Migration executada, código pendente
**Prioridade**: Alta
**Complexidade**: Média
