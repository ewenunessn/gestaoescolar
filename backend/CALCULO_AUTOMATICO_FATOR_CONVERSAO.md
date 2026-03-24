# Cálculo Automático do Fator de Conversão

## Implementação Concluída ✅

O sistema agora calcula automaticamente o fator de conversão ao criar ou editar produtos em contratos.

## Lógica de Cálculo

### Regra 1: Unidades Iguais
Se `unidade_compra` = `unidade_distribuicao` → `fator_conversao = 1`

**Exemplo:**
- Produto: Óleo, unidade_distribuicao = "UNIDADE", peso = 900g
- Contrato: unidade_compra = "UNIDADE", peso_embalagem = 900g
- **Fator calculado: 1**

### Regra 2: Unidades Diferentes com Pesos
Se unidades são diferentes E ambos os pesos existem:
```
fator_conversao = peso_embalagem / peso_produto
```

**Exemplo:**
- Produto: Arroz, unidade_distribuicao = "Quilograma", peso = 1000g
- Contrato: unidade_compra = "Saco", peso_embalagem = 5000g
- **Fator calculado: 5000 / 1000 = 5**

### Regra 3: Padrão
Se não há informações suficientes → `fator_conversao = 1`

## Quando o Cálculo Acontece

### 1. Ao Criar Produto no Contrato
- Se `fator_conversao` não for fornecido, é calculado automaticamente
- Se for fornecido manualmente, o valor manual é respeitado

### 2. Ao Editar Produto no Contrato
- Se `peso_embalagem` ou `unidade_compra` mudarem
- E `fator_conversao` não for fornecido explicitamente
- O fator é recalculado automaticamente

## Arquivos Modificados

- `backend/src/modules/contratos/controllers/contratoProdutoController.ts`
  - `criarContratoProduto()` - cálculo na criação
  - `editarContratoProduto()` - recálculo na edição

## Logs

O sistema registra no console quando calcula o fator:
```
✅ Unidades iguais (UNIDADE), fator = 1
✅ Fator calculado: 900g / 900g = 1
✅ Fator recalculado: 5000g / 1000g = 5
⚠️  Fator padrão = 1 (sem informações suficientes para calcular)
```

## Benefícios

1. **Menos erros manuais**: Não precisa calcular manualmente
2. **Consistência**: Sempre usa a mesma lógica
3. **Flexibilidade**: Ainda permite override manual se necessário
4. **Transparência**: Logs mostram como foi calculado

## Exemplo de Uso

### Frontend - Criar Produto no Contrato
```typescript
// Não precisa mais enviar fator_conversao
const data = {
  contrato_id: 1,
  produto_id: 10,
  preco_unitario: 5.50,
  quantidade_contratada: 100,
  unidade_compra: "UNIDADE",
  peso_embalagem: 900,
  // fator_conversao será calculado automaticamente
};
```

### Backend - Resposta
```json
{
  "success": true,
  "message": "Contrato-produto criado com sucesso",
  "data": {
    "id": 123,
    "fator_conversao": 1,  // ← Calculado automaticamente
    ...
  }
}
```

## Correção de Dados Existentes

Para corrigir produtos que já estão com fator errado:

```bash
node backend/scripts/investigar-oleo-unidades.js
```

Este script:
1. Lista todos os produtos óleo
2. Mostra seus contratos
3. Analisa se o fator está correto
4. Sugere correções necessárias
