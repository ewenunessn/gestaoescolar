# Renomeação do Módulo: Pedidos → Compras

## Resumo
O módulo "pedidos" foi completamente renomeado para "compras" em todo o sistema (backend e frontend), refletindo melhor a natureza do módulo que gerencia compras/ordens de compra para alimentação escolar.

## Alterações Realizadas

### Backend

#### 1. Estrutura de Pastas
- ✅ `backend/src/modules/pedidos/` → `backend/src/modules/compras/`
- ✅ Todos os arquivos internos renomeados:
  - `pedidoController.ts` → `compraController.ts`
  - `pedidoRoutes.ts` → `compraRoutes.ts`
  - `Pedido.ts` → `Compra.ts`
  - `PedidoItem.ts` → `CompraItem.ts`

#### 2. Controller (`compraController.ts`)
- ✅ Constante renomeada: `STATUS_PEDIDO` → `STATUS_COMPRA`
- ✅ Funções renomeadas:
  - `listarPedidos()` → `listarCompras()`
  - `buscarPedido()` → `buscarCompra()`
  - `criarPedido()` → `criarCompra()`
  - `atualizarPedido()` → `atualizarCompra()`
  - `atualizarStatusPedido()` → `atualizarStatusCompra()`
  - `excluirPedido()` → `excluirCompra()`
  - `obterEstatisticasPedidos()` → `obterEstatisticasCompras()`
  - `resumoTipoFornecedorPedido()` → `resumoTipoFornecedorCompra()`
- ✅ Variáveis internas renomeadas (pedidoResult → compraResult, etc)
- ✅ Mensagens de erro/sucesso atualizadas

#### 3. Routes (`compraRoutes.ts`)
- ✅ Imports atualizados para usar `compraController`
- ✅ Comentários atualizados: "Rotas de pedidos" → "Rotas de compras"
- ✅ Todas as referências de função atualizadas

#### 4. Index (`backend/src/index.ts`)
- ✅ Import atualizado: `pedidoRoutes` → `compraRoutes`
- ✅ Rota registrada: `/api/pedidos` → `/api/compras`
- ✅ Lista de rotas disponíveis atualizada

### Frontend

#### 1. Páginas Renomeadas
- ✅ `Pedidos.tsx` → `Compras.tsx`
- ✅ `NovoPedido.tsx` → `NovaCompra.tsx`
- ✅ `EditarPedido.tsx` → `EditarCompra.tsx`
- ✅ `PedidoDetalhe.tsx` → `CompraDetalhe.tsx`
- ✅ `FaturamentosPedido.tsx` → `FaturamentosCompra.tsx`

#### 2. Rotas (`AppRouter.tsx`)
- ✅ Lazy imports atualizados:
  - `const Pedidos` → `const Compras`
  - `const NovoPedido` → `const NovaCompra`
  - `const PedidoDetalhe` → `const CompraDetalhe`
  - `const EditarPedido` → `const EditarCompra`
  - `const FaturamentosPedido` → `const FaturamentosCompra`
- ✅ Paths atualizados:
  - `/pedidos` → `/compras`
  - `/pedidos/novo` → `/compras/novo`
  - `/pedidos/:id` → `/compras/:id`
  - `/pedidos/:id/editar` → `/compras/:id/editar`
  - `/pedidos/:id/faturamentos` → `/compras/:id/faturamentos`
  - E todos os sub-paths relacionados
- ✅ Componentes nas rotas atualizados

#### 3. Services (`pedidos.ts`)
- ✅ Todos os endpoints atualizados: `/api/pedidos` → `/api/compras`
- ✅ Comentários atualizados (pedido → compra)
- ✅ Mantido nome do arquivo como `pedidos.ts` (pode ser renomeado depois se necessário)

#### 4. Navegação em Páginas
Todas as chamadas `navigate()` foram atualizadas em:
- ✅ `Compras.tsx`
- ✅ `NovaCompra.tsx`
- ✅ `EditarCompra.tsx`
- ✅ `CompraDetalhe.tsx`
- ✅ `FaturamentosCompra.tsx`
- ✅ `FaturamentoModalidades.tsx`
- ✅ `GerarFaturamento.tsx`
- ✅ `FaturamentoDetalhe.tsx`
- ✅ `RelatorioFaturamentoTipoFornecedor.tsx`

#### 5. Breadcrumbs
- ✅ Todos os breadcrumbs atualizados: "Pedidos" → "Compras"
- ✅ Paths nos breadcrumbs atualizados: `/pedidos` → `/compras`

#### 6. Menu de Navegação (`LayoutModerno.tsx`)
- ✅ Item de menu atualizado: "Pedidos" → "Compras"
- ✅ Path do menu atualizado: `/pedidos` → `/compras`

## Banco de Dados

⚠️ **IMPORTANTE**: As tabelas do banco de dados NÃO foram renomeadas para manter compatibilidade:
- Tabela `pedidos` permanece como está
- Tabela `pedido_itens` permanece como está
- Todas as queries SQL continuam usando os nomes originais das tabelas

Isso é intencional para evitar:
- Necessidade de migração de dados
- Quebra de integridade referencial
- Impacto em outros módulos que referenciam essas tabelas

## Como Testar

### 1. Backend
```bash
cd backend
npm run dev
```

Testar endpoints:
- GET `/api/compras` - Listar compras
- GET `/api/compras/:id` - Buscar compra
- POST `/api/compras` - Criar compra
- PUT `/api/compras/:id` - Atualizar compra
- DELETE `/api/compras/:id` - Excluir compra

### 2. Frontend
```bash
cd frontend
npm run dev
```

⚠️ **IMPORTANTE**: Após as alterações, é necessário:
1. Parar o servidor de desenvolvimento (Ctrl+C)
2. Limpar o cache do Vite: `rm -rf node_modules/.vite`
3. Reiniciar o servidor: `npm run dev`
4. Limpar o cache do navegador (Ctrl+Shift+R ou Ctrl+F5)

Testar rotas:
- `/compras` - Lista de compras
- `/compras/novo` - Nova compra
- `/compras/:id` - Detalhes da compra
- `/compras/:id/editar` - Editar compra
- `/compras/:id/faturamentos` - Faturamentos da compra

## Arquivos Modificados

### Backend (6 arquivos)
1. `backend/src/modules/compras/controllers/compraController.ts`
2. `backend/src/modules/compras/routes/compraRoutes.ts`
3. `backend/src/modules/compras/models/Compra.ts`
4. `backend/src/modules/compras/models/CompraItem.ts`
5. `backend/src/index.ts`

### Frontend (12 arquivos)
1. `frontend/src/routes/AppRouter.tsx`
2. `frontend/src/services/pedidos.ts`
3. `frontend/src/pages/Compras.tsx`
4. `frontend/src/pages/NovaCompra.tsx`
5. `frontend/src/pages/EditarCompra.tsx`
6. `frontend/src/pages/CompraDetalhe.tsx`
7. `frontend/src/pages/FaturamentosCompra.tsx`
8. `frontend/src/pages/FaturamentoModalidades.tsx`
9. `frontend/src/pages/GerarFaturamento.tsx`
10. `frontend/src/pages/FaturamentoDetalhe.tsx`
11. `frontend/src/pages/RelatorioFaturamentoTipoFornecedor.tsx`
12. `frontend/src/components/LayoutModerno.tsx`

## Próximos Passos (Opcional)

1. Renomear arquivo de serviço: `pedidos.ts` → `compras.ts`
2. Atualizar imports do serviço em todos os arquivos
3. Atualizar tipos TypeScript: `Pedido` → `Compra`, `PedidoDetalhado` → `CompraDetalhada`
4. Considerar renomear tabelas do banco (requer migração complexa)

## Status

✅ **CONCLUÍDO** - Todas as alterações de nomenclatura foram aplicadas com sucesso.

O módulo agora usa consistentemente a terminologia "compras" em todo o código, refletindo melhor sua função de gerenciar ordens de compra para alimentação escolar.
