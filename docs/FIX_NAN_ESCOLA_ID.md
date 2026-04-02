# Fix: NaN Error ao Adicionar Produto na Guia

## Problema
Erro PostgreSQL ao tentar adicionar produto à guia:
```
invalid input syntax for type integer: "NaN"
Params: [ NaN ]
```

## Causa Raiz
O backend estava recebendo `NaN` como valor para `escola_id` porque:
1. Frontend enviava valores vazios ou undefined para `escolaId` ou `produtoId`
2. Backend chamava `parseInt()` sem validar se o resultado era um número válido
3. `parseInt(undefined)` ou `parseInt('')` retorna `NaN`
4. PostgreSQL rejeita `NaN` como parâmetro para campos integer

## Solução Implementada

### Backend (guiaController.ts)
Adicionada validação antes de processar os dados:

```typescript
// Validar parâmetros obrigatórios
const produtoId = parseInt(req.body.produtoId);
const escolaId = parseInt(req.body.escolaId);

if (isNaN(produtoId)) {
  return res.status(400).json({ 
    success: false, 
    error: 'ID do produto inválido' 
  });
}

if (isNaN(escolaId)) {
  return res.status(400).json({ 
    success: false, 
    error: 'ID da escola inválido' 
  });
}
```

### Frontend (AdicionarProdutoIndividual.tsx)
Adicionada validação extra antes de enviar dados:

```typescript
// Validar que os IDs são números válidos
const produtoId = parseInt(selectedProduto);
const escolaId = parseInt(selectedEscola);

if (isNaN(produtoId) || isNaN(escolaId)) {
  toast.error('Produto ou escola inválidos');
  return;
}
```

## Benefícios
1. Mensagens de erro claras para o usuário
2. Previne queries inválidas no banco de dados
3. Facilita debug ao identificar dados inválidos antes de processar
4. Melhora a experiência do usuário com feedback específico

## Arquivos Modificados
- `backend/src/modules/guias/controllers/guiaController.ts`
- `frontend/src/components/AdicionarProdutoIndividual.tsx`
