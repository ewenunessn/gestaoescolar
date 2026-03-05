# Status de Pedidos: Faturamento vs Recebimento

## Comportamento Correto

### 1. Criar Faturamento
- ✅ **NÃO altera** o status do pedido
- O faturamento é apenas uma divisão contábil por modalidades
- O pedido permanece com o status atual (geralmente "pendente")

### 2. Registrar Recebimento
- ✅ **ALTERA** o status do pedido automaticamente
- Quando todos os itens são recebidos completamente → status = "concluído"
- Quando alguns itens são recebidos parcialmente → status = "recebido_parcial"

## Fluxo Correto

```
1. Criar Pedido
   └─> Status: "pendente"

2. Criar Faturamento (opcional)
   └─> Status: permanece "pendente"
   └─> Divide valores por modalidades

3. Registrar Recebimento
   └─> Status: "recebido_parcial" (se parcial)
   └─> Status: "concluído" (se completo)
```

## Status Disponíveis

| Status | Descrição | Quando usar |
|--------|-----------|-------------|
| `pendente` | Pedido criado, aguardando recebimento | Status inicial |
| `recebido_parcial` | Alguns itens foram recebidos | Automático ao receber parcialmente |
| `concluido` | Todos os itens foram recebidos | Automático ao receber tudo |
| `suspenso` | Pedido temporariamente suspenso | Manual |
| `cancelado` | Pedido cancelado | Manual |

## Mudança Manual de Status

É possível mudar o status manualmente através da API:

```typescript
PATCH /pedidos/:id/status
{
  "status": "pendente" | "recebido_parcial" | "concluido" | "suspenso" | "cancelado",
  "motivo": "Motivo da mudança (opcional)"
}
```

### Validações
- ✅ Todos os status são válidos
- ✅ Pode mudar de qualquer status para qualquer outro
- ✅ O motivo é registrado nas observações do pedido

## Verificação de Problemas

### Script de Diagnóstico
```bash
node backend/scripts/verificar-pedidos-com-faturamento.js
```

Este script verifica:
- Pedidos com status "concluído" mas recebimento incompleto
- Histórico de mudanças de status
- Relação entre faturamento e recebimento

### Script de Teste
```bash
node backend/scripts/test-criar-faturamento-status.js
```

Este script testa:
- Criar pedido → status permanece "pendente"
- Criar faturamento → status permanece "pendente"
- Mudar status manualmente → funciona corretamente

## Código Relevante

### Controller de Faturamento
`backend/src/modules/faturamentos/controllers/faturamentoController.ts`
- Função `criarFaturamento()` - NÃO altera status do pedido

### Controller de Recebimento
`backend/src/modules/recebimentos/controllers/recebimentoController.ts`
- Função `registrarRecebimento()` - ALTERA status do pedido automaticamente

### Controller de Pedidos
`backend/src/modules/pedidos/controllers/pedidoController.ts`
- Função `atualizarStatusPedido()` - Permite mudança manual de status

## Troubleshooting

### Problema: Status mudou para "concluído" após criar faturamento

**Diagnóstico:**
1. Execute o script de verificação:
   ```bash
   node backend/scripts/debug-status-pedido-faturamento.js
   ```

2. Verifique se há triggers no banco:
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'pedidos';
   ```

3. Verifique o histórico do pedido:
   ```sql
   SELECT * FROM pedidos WHERE id = [ID_DO_PEDIDO];
   ```

**Possíveis causas:**
- ❌ Confusão com módulo de recebimentos (que SIM altera status)
- ❌ Trigger customizado no banco (não deveria existir)
- ❌ Lógica customizada no frontend

### Problema: Não consigo mudar status de "concluído" para "pendente"

**Solução:**
Use a API correta:
```bash
curl -X PATCH http://localhost:3000/api/pedidos/[ID]/status \
  -H "Content-Type: application/json" \
  -d '{"status": "pendente", "motivo": "Correção de status"}'
```

Ou pelo frontend:
```typescript
await pedidosService.atualizarStatus(pedidoId, 'pendente', 'Motivo da mudança');
```

## Testes Automatizados

### Teste 1: Criar faturamento não altera status
```bash
node backend/scripts/test-criar-faturamento-status.js
```

Resultado esperado:
```
✅ Status permaneceu "pendente"
   Comportamento correto!
```

### Teste 2: Mudança de status funciona
```bash
node backend/scripts/debug-status-pedido-faturamento.js
```

Resultado esperado:
```
✅ Status alterado para "pendente" com sucesso!
```

## Conclusão

O sistema está funcionando corretamente:
- ✅ Faturamento NÃO altera status
- ✅ Recebimento SIM altera status (comportamento esperado)
- ✅ Mudança manual de status funciona sem restrições

Se você encontrar um caso onde o faturamento altera o status, por favor:
1. Execute os scripts de diagnóstico
2. Documente o caso específico
3. Verifique se não foi confundido com recebimento
