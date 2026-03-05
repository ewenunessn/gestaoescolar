# Produtos Duplicados em Pedidos

## Problema
O sistema não permitia adicionar o mesmo produto múltiplas vezes em um pedido, mesmo quando necessário para diferentes datas de entrega.

## Solução Implementada

### 1. Frontend - Remoção da Validação
Removida a validação que impedia adicionar produtos duplicados em:
- `frontend/src/pages/NovoPedido.tsx`
- `frontend/src/pages/EditarPedido.tsx`

Agora é possível adicionar o mesmo produto várias vezes com diferentes:
- Quantidades
- Datas de entrega prevista
- Observações

### 2. Backend - Atualização de Pedidos
Modificada a função `atualizarPedido` em `backend/src/modules/pedidos/controllers/pedidoController.ts`:

**Antes:**
- Usava `contrato_produto_id` como chave única
- Ao editar, sobrescrevia itens do mesmo produto

**Depois:**
- Usa o `id` do item como chave única
- Permite múltiplos itens do mesmo produto
- Preserva os IDs dos itens existentes (importante para faturamentos)

### 3. Faturamento - Agrupamento Automático
No faturamento, os itens do mesmo produto/contrato são:
- Agrupados automaticamente
- Quantidades somadas
- Exibidos como um único item

**Regra de Agrupamento:**
Itens são agrupados quando têm o mesmo `contrato_produto_id` (mesmo produto do mesmo contrato).

## Exemplo de Uso

### Criar Pedido com Múltiplas Entregas
```
Pedido #001
├── Item 1: Arroz (Contrato A) - 100kg - Entrega: 10/03
├── Item 2: Arroz (Contrato A) - 150kg - Entrega: 20/03
└── Item 3: Feijão (Contrato A) - 80kg - Entrega: 10/03
```

### Faturamento
No faturamento, os itens são agrupados:
```
Modalidade: PNAE
├── Arroz: 250kg (100 + 150) - R$ 2.500,00
└── Feijão: 80kg - R$ 800,00
```

## Benefícios
1. Flexibilidade para programar entregas em datas diferentes
2. Controle individual de cada entrega
3. Faturamento simplificado com totais agrupados
4. Preservação de referências para rastreabilidade

## Notas Técnicas
- Os IDs dos `pedido_itens` são preservados ao editar
- Faturamentos mantêm referências aos itens originais
- Agrupamento é feito apenas na visualização do faturamento
- Dados originais permanecem separados no banco
