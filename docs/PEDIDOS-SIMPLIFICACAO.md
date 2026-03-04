# Simplificação do Sistema de Pedidos

## Mudanças Implementadas

### 1. Novos Status Simplificados

**Status Antigos** (removidos):
- rascunho
- aprovado
- em_separacao
- enviado
- entregue

**Status Novos** (implementados):
- `pendente` - Pedido criado, aguardando recebimento
- `recebido_parcial` - Parte do pedido foi recebida
- `concluido` - Pedido totalmente recebido
- `suspenso` - Pedido temporariamente suspenso
- `cancelado` - Pedido cancelado

### 2. Edição Livre de Pedidos

**Antes**: Apenas pedidos em "rascunho" podiam ser editados

**Agora**: Pedidos podem ser editados em **qualquer status**

**Endpoint**: `PUT /api/pedidos/:id`

**Payload**:
```json
{
  "observacoes": "Observações atualizadas",
  "competencia_mes_ano": "2026-04",
  "itens": [
    {
      "contrato_produto_id": 1,
      "quantidade": 10,
      "data_entrega_prevista": "2026-04-15",
      "observacoes": "Obs do item"
    }
  ]
}
```

### 3. Alteração Manual de Status

**Endpoint**: `PATCH /api/pedidos/:id/status`

**Payload**:
```json
{
  "status": "recebido_parcial",
  "motivo": "Recebido 50% do pedido"
}
```

**Status Válidos**:
- `pendente`
- `recebido_parcial`
- `concluido`
- `suspenso`
- `cancelado`

**Comportamento**:
- Motivo é opcional
- Se fornecido, é adicionado às observações do pedido
- Formato: `[Status]: motivo`

### 4. Funções Removidas

**Removidas do Controller**:
- `cancelarPedido()` - Use `atualizarStatusPedido()` com status "cancelado"
- `atualizarItensPedido()` - Use `atualizarPedido()` que agora aceita itens

**Removidas das Rotas**:
- `POST /api/pedidos/:id/cancelar` - Use `PATCH /api/pedidos/:id/status`
- `PUT /api/pedidos/:id/itens` - Use `PUT /api/pedidos/:id`

### 5. Mapeamento de Status Antigos

Script `update-pedidos-status.js` migra automaticamente:

```javascript
'rascunho' → 'pendente'
'pendente' → 'pendente'
'aprovado' → 'pendente'
'em_separacao' → 'pendente'
'enviado' → 'recebido_parcial'
'entregue' → 'concluido'
'cancelado' → 'cancelado'
```

## Fluxo de Trabalho Simplificado

### Criar Pedido
```
POST /api/pedidos
Status inicial: pendente
```

### Editar Pedido (qualquer momento)
```
PUT /api/pedidos/:id
- Alterar observações
- Alterar competência
- Adicionar/remover/modificar itens
```

### Alterar Status Manualmente
```
PATCH /api/pedidos/:id/status
- pendente → recebido_parcial (recebeu parte)
- recebido_parcial → concluido (recebeu tudo)
- qualquer → suspenso (problema temporário)
- qualquer → cancelado (cancelar pedido)
```

### Excluir Pedido
```
DELETE /api/pedidos/:id
- Permitido em qualquer status
- Remove itens e faturamentos associados
```

## Exemplos de Uso

### 1. Criar Pedido
```typescript
const pedido = await pedidosService.criar({
  competencia_mes_ano: '2026-04',
  observacoes: 'Pedido urgente',
  itens: [
    {
      contrato_produto_id: 1,
      quantidade: 100,
      data_entrega_prevista: '2026-04-15'
    }
  ]
});
// Retorna: PED-ABR2026000001 com status "pendente"
```

### 2. Editar Pedido
```typescript
await pedidosService.atualizar(pedidoId, {
  observacoes: 'Alterado prazo de entrega',
  itens: [
    {
      contrato_produto_id: 1,
      quantidade: 150, // Aumentou quantidade
      data_entrega_prevista: '2026-04-20' // Alterou data
    }
  ]
});
```

### 3. Marcar como Recebido Parcial
```typescript
await pedidosService.atualizarStatus(pedidoId, {
  status: 'recebido_parcial',
  motivo: 'Recebido 80 de 150 unidades'
});
```

### 4. Concluir Pedido
```typescript
await pedidosService.atualizarStatus(pedidoId, {
  status: 'concluido',
  motivo: 'Pedido totalmente recebido e conferido'
});
```

### 5. Suspender Pedido
```typescript
await pedidosService.atualizarStatus(pedidoId, {
  status: 'suspenso',
  motivo: 'Aguardando resolução de problema com fornecedor'
});
```

### 6. Cancelar Pedido
```typescript
await pedidosService.atualizarStatus(pedidoId, {
  status: 'cancelado',
  motivo: 'Produto descontinuado pelo fornecedor'
});
```

## Frontend

### Componente NovoPedido
- Campo de competência adicionado
- Tipo `month` para seleção fácil
- Valor padrão: mês/ano atual

### Componente PedidoDetalhe
- ✅ Botão "Editar" SEMPRE disponível (mesmo após concluído)
- ✅ Select para alterar status SEMPRE disponível (mesmo após concluído)
- ✅ Campo de motivo opcional ao alterar status
- ✅ Histórico de alterações nas observações

## Benefícios

1. **Simplicidade**: Menos status, mais claro
2. **Flexibilidade**: Editar a qualquer momento
3. **Controle Manual**: Usuário decide quando mudar status
4. **Rastreabilidade**: Motivos registrados nas observações
5. **Menos Código**: Funções duplicadas removidas

## Migração

### Banco de Dados
✅ Status atualizados automaticamente
✅ Pedidos existentes migrados

### Código
✅ Controller simplificado
✅ Rotas atualizadas
✅ Frontend com campo de competência

### Próximos Passos
- [x] Atualizar frontend para edição livre
- [x] Adicionar dropdown de status no detalhe
- [x] Implementar campo de motivo ao alterar status
- [x] Remover restrições de edição por status
- [ ] Atualizar relatórios se necessário
