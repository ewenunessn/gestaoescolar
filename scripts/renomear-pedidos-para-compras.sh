#!/bin/bash

# Script para renomear módulo de "pedidos" para "compras"
# Backend e Frontend

echo "🔄 Iniciando renomeação de 'pedidos' para 'compras'..."
echo ""

# ============================================
# BACKEND
# ============================================

echo "📦 BACKEND"
echo "=========================================="

# 1. Renomear pasta do módulo
echo "1. Renomeando pasta backend/src/modules/pedidos → compras"
if [ -d "backend/src/modules/pedidos" ]; then
  mv backend/src/modules/pedidos backend/src/modules/compras
  echo "   ✅ Pasta renomeada"
else
  echo "   ⚠️  Pasta não encontrada"
fi

# 2. Renomear arquivos
echo "2. Renomeando arquivos do controller"
if [ -f "backend/src/modules/compras/controllers/pedidoController.ts" ]; then
  mv backend/src/modules/compras/controllers/pedidoController.ts backend/src/modules/compras/controllers/compraController.ts
  echo "   ✅ pedidoController.ts → compraController.ts"
fi

if [ -f "backend/src/modules/compras/routes/pedidoRoutes.ts" ]; then
  mv backend/src/modules/compras/routes/pedidoRoutes.ts backend/src/modules/compras/routes/compraRoutes.ts
  echo "   ✅ pedidoRoutes.ts → compraRoutes.ts"
fi

if [ -f "backend/src/modules/compras/models/Pedido.ts" ]; then
  mv backend/src/modules/compras/models/Pedido.ts backend/src/modules/compras/models/Compra.ts
  echo "   ✅ Pedido.ts → Compra.ts"
fi

if [ -f "backend/src/modules/compras/models/PedidoItem.ts" ]; then
  mv backend/src/modules/compras/models/PedidoItem.ts backend/src/modules/compras/models/CompraItem.ts
  echo "   ✅ PedidoItem.ts → CompraItem.ts"
fi

# 3. Substituir conteúdo nos arquivos do backend
echo "3. Atualizando imports e referências no backend"

# Controller
if [ -f "backend/src/modules/compras/controllers/compraController.ts" ]; then
  sed -i 's/pedidoController/compraController/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/listarPedidos/listarCompras/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/buscarPedido/buscarCompra/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/criarPedido/criarCompra/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/atualizarPedido/atualizarCompra/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/atualizarStatusPedido/atualizarStatusCompra/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/excluirPedido/excluirCompra/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/obterEstatisticasPedidos/obterEstatisticasCompras/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/resumoTipoFornecedorPedido/resumoTipoFornecedorCompra/g' backend/src/modules/compras/controllers/compraController.ts
  sed -i 's/Erro ao.*pedido/Erro ao compra/gi' backend/src/modules/compras/controllers/compraController.ts
  echo "   ✅ compraController.ts atualizado"
fi

# Routes
if [ -f "backend/src/modules/compras/routes/compraRoutes.ts" ]; then
  sed -i 's/pedidoRoutes/compraRoutes/g' backend/src/modules/compras/routes/compraRoutes.ts
  sed -i 's/pedidoController/compraController/g' backend/src/modules/compras/routes/compraRoutes.ts
  sed -i "s/\/pedidos/\/compras/g" backend/src/modules/compras/routes/compraRoutes.ts
  echo "   ✅ compraRoutes.ts atualizado"
fi

# Index.ts principal
if [ -f "backend/src/index.ts" ]; then
  sed -i "s/\/api\/pedidos/\/api\/compras/g" backend/src/index.ts
  sed -i "s/pedidoRoutes/compraRoutes/g" backend/src/index.ts
  sed -i "s/'\.\/modules\/pedidos\/routes\/pedidoRoutes'/'\.\/modules\/compras\/routes\/compraRoutes'/g" backend/src/index.ts
  echo "   ✅ backend/src/index.ts atualizado"
fi

echo ""

# ============================================
# FRONTEND
# ============================================

echo "🎨 FRONTEND"
echo "=========================================="

# 1. Renomear arquivos de páginas
echo "1. Renomeando páginas"

if [ -f "frontend/src/pages/Pedidos.tsx" ]; then
  mv frontend/src/pages/Pedidos.tsx frontend/src/pages/Compras.tsx
  echo "   ✅ Pedidos.tsx → Compras.tsx"
fi

if [ -f "frontend/src/pages/NovoPedido.tsx" ]; then
  mv frontend/src/pages/NovoPedido.tsx frontend/src/pages/NovaCompra.tsx
  echo "   ✅ NovoPedido.tsx → NovaCompra.tsx"
fi

if [ -f "frontend/src/pages/EditarPedido.tsx" ]; then
  mv frontend/src/pages/EditarPedido.tsx frontend/src/pages/EditarCompra.tsx
  echo "   ✅ EditarPedido.tsx → EditarCompra.tsx"
fi

if [ -f "frontend/src/pages/PedidoDetalhe.tsx" ]; then
  mv frontend/src/pages/PedidoDetalhe.tsx frontend/src/pages/CompraDetalhe.tsx
  echo "   ✅ PedidoDetalhe.tsx → CompraDetalhe.tsx"
fi

if [ -f "frontend/src/pages/FaturamentosPedido.tsx" ]; then
  mv frontend/src/pages/FaturamentosPedido.tsx frontend/src/pages/FaturamentosCompra.tsx
  echo "   ✅ FaturamentosPedido.tsx → FaturamentosCompra.tsx"
fi

# 2. Atualizar rotas no App.tsx
echo "2. Atualizando rotas no App.tsx"
if [ -f "frontend/src/App.tsx" ]; then
  sed -i "s/\/pedidos/\/compras/g" frontend/src/App.tsx
  sed -i "s/from '\.\/pages\/Pedidos'/from '\.\/pages\/Compras'/g" frontend/src/App.tsx
  sed -i "s/from '\.\/pages\/NovoPedido'/from '\.\/pages\/NovaCompra'/g" frontend/src/App.tsx
  sed -i "s/from '\.\/pages\/EditarPedido'/from '\.\/pages\/EditarCompra'/g" frontend/src/App.tsx
  sed -i "s/from '\.\/pages\/PedidoDetalhe'/from '\.\/pages\/CompraDetalhe'/g" frontend/src/App.tsx
  sed -i "s/from '\.\/pages\/FaturamentosPedido'/from '\.\/pages\/FaturamentosCompra'/g" frontend/src/App.tsx
  sed -i "s/<Pedidos/<Compras/g" frontend/src/App.tsx
  sed -i "s/<NovoPedido/<NovaCompra/g" frontend/src/App.tsx
  sed -i "s/<EditarPedido/<EditarCompra/g" frontend/src/App.tsx
  sed -i "s/<PedidoDetalhe/<CompraDetalhe/g" frontend/src/App.tsx
  sed -i "s/<FaturamentosPedido/<FaturamentosCompra/g" frontend/src/App.tsx
  echo "   ✅ App.tsx atualizado"
fi

# 3. Atualizar serviços/API
echo "3. Atualizando serviços de API"
if [ -f "frontend/src/services/api.ts" ]; then
  sed -i "s/\/api\/pedidos/\/api\/compras/g" frontend/src/services/api.ts
  echo "   ✅ api.ts atualizado"
fi

# 4. Atualizar componentes que referenciam pedidos
echo "4. Atualizando referências em componentes"
find frontend/src/components -type f -name "*.tsx" -exec sed -i 's/\/pedidos/\/compras/g' {} \;
find frontend/src/components -type f -name "*.tsx" -exec sed -i 's/pedido_id/compra_id/g' {} \;
echo "   ✅ Componentes atualizados"

# 5. Atualizar páginas renomeadas
echo "5. Atualizando conteúdo das páginas"

# Compras.tsx
if [ -f "frontend/src/pages/Compras.tsx" ]; then
  sed -i 's/Pedidos/Compras/g' frontend/src/pages/Compras.tsx
  sed -i 's/pedidos/compras/g' frontend/src/pages/Compras.tsx
  sed -i 's/pedido/compra/g' frontend/src/pages/Compras.tsx
  sed -i 's/Novo Pedido/Nova Compra/g' frontend/src/pages/Compras.tsx
  sed -i 's/\/api\/pedidos/\/api\/compras/g' frontend/src/pages/Compras.tsx
  echo "   ✅ Compras.tsx atualizado"
fi

# NovaCompra.tsx
if [ -f "frontend/src/pages/NovaCompra.tsx" ]; then
  sed -i 's/NovoPedido/NovaCompra/g' frontend/src/pages/NovaCompra.tsx
  sed -i 's/Novo Pedido/Nova Compra/g' frontend/src/pages/NovaCompra.tsx
  sed -i 's/pedido/compra/g' frontend/src/pages/NovaCompra.tsx
  sed -i 's/\/api\/pedidos/\/api\/compras/g' frontend/src/pages/NovaCompra.tsx
  echo "   ✅ NovaCompra.tsx atualizado"
fi

# EditarCompra.tsx
if [ -f "frontend/src/pages/EditarCompra.tsx" ]; then
  sed -i 's/EditarPedido/EditarCompra/g' frontend/src/pages/EditarCompra.tsx
  sed -i 's/Editar Pedido/Editar Compra/g' frontend/src/pages/EditarCompra.tsx
  sed -i 's/pedido/compra/g' frontend/src/pages/EditarCompra.tsx
  sed -i 's/\/api\/pedidos/\/api\/compras/g' frontend/src/pages/EditarCompra.tsx
  echo "   ✅ EditarCompra.tsx atualizado"
fi

# CompraDetalhe.tsx
if [ -f "frontend/src/pages/CompraDetalhe.tsx" ]; then
  sed -i 's/PedidoDetalhe/CompraDetalhe/g' frontend/src/pages/CompraDetalhe.tsx
  sed -i 's/Detalhes do Pedido/Detalhes da Compra/g' frontend/src/pages/CompraDetalhe.tsx
  sed -i 's/pedido/compra/g' frontend/src/pages/CompraDetalhe.tsx
  sed -i 's/\/api\/pedidos/\/api\/compras/g' frontend/src/pages/CompraDetalhe.tsx
  echo "   ✅ CompraDetalhe.tsx atualizado"
fi

# FaturamentosCompra.tsx
if [ -f "frontend/src/pages/FaturamentosCompra.tsx" ]; then
  sed -i 's/FaturamentosPedido/FaturamentosCompra/g' frontend/src/pages/FaturamentosCompra.tsx
  sed -i 's/Faturamentos do Pedido/Faturamentos da Compra/g' frontend/src/pages/FaturamentosCompra.tsx
  sed -i 's/pedido/compra/g' frontend/src/pages/FaturamentosCompra.tsx
  echo "   ✅ FaturamentosCompra.tsx atualizado"
fi

echo ""
echo "✅ Renomeação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Revisar as alterações: git diff"
echo "2. Testar o backend: cd backend && npm run dev"
echo "3. Testar o frontend: cd frontend && npm run dev"
echo "4. Commit: git add . && git commit -m 'refactor: renomear pedidos para compras'"
echo ""
