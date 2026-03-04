# Módulo de Recebimento de Mercadorias

## Visão Geral
Módulo para registrar recebimentos de itens de pedidos no app mobile, inspirado no módulo de entregas.

## Estrutura Criada

### Backend
✅ Migration: `backend/src/migrations/20260304_create_recebimentos.sql`
✅ Controller: `backend/src/modules/recebimentos/controllers/recebimentoController.ts`
✅ Routes: `backend/src/modules/recebimentos/routes/recebimentoRoutes.ts`
✅ Registrado em: `backend/src/index.ts`

### App (React Native)
✅ API Client: `apps/entregador-native/src/api/recebimentos.ts`
✅ Tela 1: `apps/entregador-native/src/screens/RecebimentosScreen.tsx` (Lista de pedidos)
✅ Tela 2: `apps/entregador-native/src/screens/RecebimentoFornecedoresScreen.tsx` (Fornecedores do pedido)
✅ Tela 3: `apps/entregador-native/src/screens/RecebimentoItensScreen.tsx` (Itens do fornecedor + registro)
✅ Navegação: Adicionada em `App.tsx`
✅ Menu: Adicionado card em `HomeScreen.tsx`

## Fluxo de Navegação

```
RecebimentosScreen (Lista pedidos pendentes/parciais)
  ↓ Clica no pedido
RecebimentoFornecedoresScreen (Lista fornecedores do pedido)
  ↓ Clica no fornecedor
RecebimentoItensScreen (Lista itens + registrar recebimento)
```

## Endpoints Criados

- `GET /api/recebimentos/pedidos-pendentes` - Lista pedidos pendentes e parciais
- `GET /api/recebimentos/pedidos/:pedidoId/fornecedores` - Fornecedores do pedido
- `GET /api/recebimentos/pedidos/:pedidoId/fornecedores/:fornecedorId/itens` - Itens do fornecedor
- `POST /api/recebimentos/registrar` - Registrar recebimento
- `GET /api/recebimentos/itens/:pedidoItemId/recebimentos` - Histórico de recebimentos do item
- `GET /api/recebimentos/pedidos/:pedidoId/historico` - Histórico completo do pedido

## Próximos Passos

### ✅ Módulo Completo!

Todas as funcionalidades foram implementadas:
- ✅ Backend com 6 endpoints
- ✅ 3 telas no app mobile
- ✅ Navegação configurada
- ✅ Menu principal atualizado
- ✅ Registro de recebimentos com validações
- ✅ Histórico de recebimentos
- ✅ Atualização automática de status do pedido

### Testar o Módulo

1. Abrir o app e fazer login
2. Na tela inicial, clicar em "Acessar Recebimentos"
3. Selecionar um pedido pendente ou parcial
4. Selecionar um fornecedor
5. Registrar recebimento de um item
6. Verificar histórico de recebimentos
7. Confirmar que status do pedido é atualizado automaticamente

## Funcionalidades

### Registro de Recebimento
- Permite registrar recebimentos parciais
- Valida se quantidade não excede saldo pendente
- Atualiza status do pedido automaticamente:
  - `pendente` → `recebido_parcial` (primeiro recebimento)
  - `recebido_parcial` → `concluido` (todos itens recebidos)
- Registra usuário e data/hora do recebimento

### Validações
- Quantidade deve ser maior que zero
- Quantidade não pode exceder saldo pendente
- Item deve pertencer ao pedido informado

### Views do Banco
- `vw_recebimentos_detalhados` - Recebimentos com todos os dados
- `vw_resumo_recebimentos_pedido` - Resumo por pedido

## Exemplo de Uso

### Registrar Recebimento
```typescript
await recebimentosAPI.registrarRecebimento({
  pedidoId: 29,
  pedidoItemId: 45,
  quantidadeRecebida: 50,
  observacoes: 'Recebido em boas condições'
});
```

### Listar Histórico
```typescript
const historico = await recebimentosAPI.historicoRecebimentos(29);
```

## Data
04/03/2026
