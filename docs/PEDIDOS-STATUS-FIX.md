# Correção: Alteração de Status de Pedidos

## Problema 1: Interpolação SQL
Ao tentar alterar o status de um pedido via Select no frontend, ocorria erro 500:
```
PATCH http://localhost:3000/api/pedidos/29/status 500 (Internal Server Error)
```

### Causa
Interpolação incorreta de template string dentro da query SQL na função `atualizarStatusPedido()`:

```typescript
// ❌ ERRADO - Interpolação dentro de template string SQL
query += `, observacoes = COALESCE(observacoes, '') || '\n[' || $${paramCount} || ']: ' || $${paramCount + 1}`;
```

O TypeScript tentava interpolar `$${paramCount}` como uma variável, causando erro de sintaxe SQL.

### Solução
Usar concatenação de strings normal ao invés de template strings:

```typescript
// ✅ CORRETO - Concatenação normal
query += `, observacoes = COALESCE(observacoes, '') || '\\n[' || $` + paramCount + ` || ']: ' || $` + (paramCount + 1);
```

## Problema 2: Constraint de Status Desatualizada
Após corrigir a interpolação, ocorria erro de constraint:
```
error: a nova linha da relação "pedidos" viola a restrição de verificação "pedidos_status_check"
```

### Causa
A constraint `pedidos_status_check` no banco de dados ainda tinha os status antigos:
- `rascunho`, `aprovado`, `em_separacao`, `enviado`, `entregue`, `cancelado`

Mas o código estava tentando usar os novos status:
- `pendente`, `recebido_parcial`, `concluido`, `suspenso`, `cancelado`

### Solução
Atualizar a constraint no banco de dados:

```sql
-- Remover constraint antiga
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;

-- Adicionar nova constraint com status simplificados
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check 
  CHECK (status IN ('pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado'));
```

## Arquivos Criados/Alterados
- `backend/src/modules/pedidos/controllers/pedidoController.ts` - Correção de interpolação SQL
- `backend/src/migrations/20260304_update_pedidos_status_constraint.sql` - Migration para atualizar constraint
- `backend/scripts/apply-status-constraint.js` - Script para aplicar migration em LOCAL e NEON

## Aplicação
```bash
node backend/scripts/apply-status-constraint.js
```

Resultado:
- ✅ Constraint atualizada no LOCAL
- ✅ Constraint atualizada no NEON
- ✅ Todos os pedidos têm status válido

## Comportamento Atual
- Select de status SEMPRE disponível (mesmo após concluído)
- Botão "Editar" SEMPRE disponível (mesmo após concluído)
- Motivo é OPCIONAL ao alterar status
- Dialog mostra campo de motivo mas não é obrigatório
- Observações são atualizadas automaticamente com formato: `[Status]: motivo`
- Status válidos: `pendente`, `recebido_parcial`, `concluido`, `suspenso`, `cancelado`

## Testes Recomendados
1. ✅ Alterar status via Select sem informar motivo
2. ✅ Alterar status via Select informando motivo
3. ✅ Verificar se observações são atualizadas corretamente
4. ✅ Confirmar que não há mais erro 500
5. ✅ Confirmar que constraint aceita novos status

## Data
04/03/2026
