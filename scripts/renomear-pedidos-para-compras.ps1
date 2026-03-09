# Script PowerShell para renomear módulo de "pedidos" para "compras"
# Backend e Frontend

Write-Host "🔄 Iniciando renomeação de 'pedidos' para 'compras'..." -ForegroundColor Cyan
Write-Host ""

# ============================================
# BACKEND
# ============================================

Write-Host "📦 BACKEND" -ForegroundColor Yellow
Write-Host "=========================================="

# 1. Renomear pasta do módulo
Write-Host "1. Renomeando pasta backend/src/modules/pedidos → compras"
if (Test-Path "backend/src/modules/pedidos") {
    Move-Item "backend/src/modules/pedidos" "backend/src/modules/compras" -Force
    Write-Host "   ✅ Pasta renomeada" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Pasta não encontrada" -ForegroundColor Yellow
}

# 2. Renomear arquivos
Write-Host "2. Renomeando arquivos do controller"

if (Test-Path "backend/src/modules/compras/controllers/pedidoController.ts") {
    Move-Item "backend/src/modules/compras/controllers/pedidoController.ts" "backend/src/modules/compras/controllers/compraController.ts" -Force
    Write-Host "   ✅ pedidoController.ts → compraController.ts" -ForegroundColor Green
}

if (Test-Path "backend/src/modules/compras/routes/pedidoRoutes.ts") {
    Move-Item "backend/src/modules/compras/routes/pedidoRoutes.ts" "backend/src/modules/compras/routes/compraRoutes.ts" -Force
    Write-Host "   ✅ pedidoRoutes.ts → compraRoutes.ts" -ForegroundColor Green
}

if (Test-Path "backend/src/modules/compras/models/Pedido.ts") {
    Move-Item "backend/src/modules/compras/models/Pedido.ts" "backend/src/modules/compras/models/Compra.ts" -Force
    Write-Host "   ✅ Pedido.ts → Compra.ts" -ForegroundColor Green
}

if (Test-Path "backend/src/modules/compras/models/PedidoItem.ts") {
    Move-Item "backend/src/modules/compras/models/PedidoItem.ts" "backend/src/modules/compras/models/CompraItem.ts" -Force
    Write-Host "   ✅ PedidoItem.ts → CompraItem.ts" -ForegroundColor Green
}

# 3. Função para substituir texto em arquivo
function Replace-InFile {
    param(
        [string]$FilePath,
        [hashtable]$Replacements
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw -Encoding UTF8
        foreach ($key in $Replacements.Keys) {
            $content = $content -replace $key, $Replacements[$key]
        }
        Set-Content $FilePath $content -Encoding UTF8 -NoNewline
    }
}

# 4. Atualizar controller
Write-Host "3. Atualizando imports e referências no backend"

if (Test-Path "backend/src/modules/compras/controllers/compraController.ts") {
    $replacements = @{
        'pedidoController' = 'compraController'
        'listarPedidos' = 'listarCompras'
        'buscarPedido' = 'buscarCompra'
        'criarPedido' = 'criarCompra'
        'atualizarPedido' = 'atualizarCompra'
        'atualizarStatusPedido' = 'atualizarStatusCompra'
        'excluirPedido' = 'excluirCompra'
        'obterEstatisticasPedidos' = 'obterEstatisticasCompras'
        'resumoTipoFornecedorPedido' = 'resumoTipoFornecedorCompra'
        'Erro ao listar pedidos' = 'Erro ao listar compras'
        'Erro ao buscar pedido' = 'Erro ao buscar compra'
        'Erro ao criar pedido' = 'Erro ao criar compra'
        'Erro ao atualizar pedido' = 'Erro ao atualizar compra'
        'Erro ao excluir pedido' = 'Erro ao excluir compra'
        'Pedido não encontrado' = 'Compra não encontrada'
        'Pedido criado com sucesso' = 'Compra criada com sucesso'
        'Pedido atualizado com sucesso' = 'Compra atualizada com sucesso'
    }
    Replace-InFile "backend/src/modules/compras/controllers/compraController.ts" $replacements
    Write-Host "   ✅ compraController.ts atualizado" -ForegroundColor Green
}

# 5. Atualizar routes
if (Test-Path "backend/src/modules/compras/routes/compraRoutes.ts") {
    $replacements = @{
        'pedidoRoutes' = 'compraRoutes'
        'pedidoController' = 'compraController'
        '/pedidos' = '/compras'
    }
    Replace-InFile "backend/src/modules/compras/routes/compraRoutes.ts" $replacements
    Write-Host "   ✅ compraRoutes.ts atualizado" -ForegroundColor Green
}

# 6. Atualizar index.ts
if (Test-Path "backend/src/index.ts") {
    $replacements = @{
        '/api/pedidos' = '/api/compras'
        'pedidoRoutes' = 'compraRoutes'
        './modules/pedidos/routes/pedidoRoutes' = './modules/compras/routes/compraRoutes'
    }
    Replace-InFile "backend/src/index.ts" $replacements
    Write-Host "   ✅ backend/src/index.ts atualizado" -ForegroundColor Green
}

Write-Host ""

# ============================================
# FRONTEND
# ============================================

Write-Host "🎨 FRONTEND" -ForegroundColor Yellow
Write-Host "=========================================="

# 1. Renomear páginas
Write-Host "1. Renomeando páginas"

if (Test-Path "frontend/src/pages/Pedidos.tsx") {
    Move-Item "frontend/src/pages/Pedidos.tsx" "frontend/src/pages/Compras.tsx" -Force
    Write-Host "   ✅ Pedidos.tsx → Compras.tsx" -ForegroundColor Green
}

if (Test-Path "frontend/src/pages/NovoPedido.tsx") {
    Move-Item "frontend/src/pages/NovoPedido.tsx" "frontend/src/pages/NovaCompra.tsx" -Force
    Write-Host "   ✅ NovoPedido.tsx → NovaCompra.tsx" -ForegroundColor Green
}

if (Test-Path "frontend/src/pages/EditarPedido.tsx") {
    Move-Item "frontend/src/pages/EditarPedido.tsx" "frontend/src/pages/EditarCompra.tsx" -Force
    Write-Host "   ✅ EditarPedido.tsx → EditarCompra.tsx" -ForegroundColor Green
}

if (Test-Path "frontend/src/pages/PedidoDetalhe.tsx") {
    Move-Item "frontend/src/pages/PedidoDetalhe.tsx" "frontend/src/pages/CompraDetalhe.tsx" -Force
    Write-Host "   ✅ PedidoDetalhe.tsx → CompraDetalhe.tsx" -ForegroundColor Green
}

if (Test-Path "frontend/src/pages/FaturamentosPedido.tsx") {
    Move-Item "frontend/src/pages/FaturamentosPedido.tsx" "frontend/src/pages/FaturamentosCompra.tsx" -Force
    Write-Host "   ✅ FaturamentosPedido.tsx → FaturamentosCompra.tsx" -ForegroundColor Green
}

# 2. Atualizar App.tsx
Write-Host "2. Atualizando rotas no App.tsx"
if (Test-Path "frontend/src/App.tsx") {
    $replacements = @{
        '/pedidos' = '/compras'
        "from './pages/Pedidos'" = "from './pages/Compras'"
        "from './pages/NovoPedido'" = "from './pages/NovaCompra'"
        "from './pages/EditarPedido'" = "from './pages/EditarCompra'"
        "from './pages/PedidoDetalhe'" = "from './pages/CompraDetalhe'"
        "from './pages/FaturamentosPedido'" = "from './pages/FaturamentosCompra'"
        '<Pedidos' = '<Compras'
        '<NovoPedido' = '<NovaCompra'
        '<EditarPedido' = '<EditarCompra'
        '<PedidoDetalhe' = '<CompraDetalhe'
        '<FaturamentosPedido' = '<FaturamentosCompra'
    }
    Replace-InFile "frontend/src/App.tsx" $replacements
    Write-Host "   ✅ App.tsx atualizado" -ForegroundColor Green
}

# 3. Atualizar serviços
Write-Host "3. Atualizando serviços de API"
if (Test-Path "frontend/src/services/api.ts") {
    $replacements = @{
        '/api/pedidos' = '/api/compras'
    }
    Replace-InFile "frontend/src/services/api.ts" $replacements
    Write-Host "   ✅ api.ts atualizado" -ForegroundColor Green
}

# 4. Atualizar componentes
Write-Host "4. Atualizando referências em componentes"
Get-ChildItem "frontend/src/components" -Filter "*.tsx" -Recurse | ForEach-Object {
    $replacements = @{
        '/pedidos' = '/compras'
        'pedido_id' = 'compra_id'
    }
    Replace-InFile $_.FullName $replacements
}
Write-Host "   ✅ Componentes atualizados" -ForegroundColor Green

# 5. Atualizar páginas renomeadas
Write-Host "5. Atualizando conteúdo das páginas"

# Compras.tsx
if (Test-Path "frontend/src/pages/Compras.tsx") {
    $replacements = @{
        'Pedidos' = 'Compras'
        'pedidos' = 'compras'
        'pedido' = 'compra'
        'Novo Pedido' = 'Nova Compra'
        '/api/pedidos' = '/api/compras'
    }
    Replace-InFile "frontend/src/pages/Compras.tsx" $replacements
    Write-Host "   ✅ Compras.tsx atualizado" -ForegroundColor Green
}

# NovaCompra.tsx
if (Test-Path "frontend/src/pages/NovaCompra.tsx") {
    $replacements = @{
        'NovoPedido' = 'NovaCompra'
        'Novo Pedido' = 'Nova Compra'
        'pedido' = 'compra'
        '/api/pedidos' = '/api/compras'
    }
    Replace-InFile "frontend/src/pages/NovaCompra.tsx" $replacements
    Write-Host "   ✅ NovaCompra.tsx atualizado" -ForegroundColor Green
}

# EditarCompra.tsx
if (Test-Path "frontend/src/pages/EditarCompra.tsx") {
    $replacements = @{
        'EditarPedido' = 'EditarCompra'
        'Editar Pedido' = 'Editar Compra'
        'pedido' = 'compra'
        '/api/pedidos' = '/api/compras'
    }
    Replace-InFile "frontend/src/pages/EditarCompra.tsx" $replacements
    Write-Host "   ✅ EditarCompra.tsx atualizado" -ForegroundColor Green
}

# CompraDetalhe.tsx
if (Test-Path "frontend/src/pages/CompraDetalhe.tsx") {
    $replacements = @{
        'PedidoDetalhe' = 'CompraDetalhe'
        'Detalhes do Pedido' = 'Detalhes da Compra'
        'pedido' = 'compra'
        '/api/pedidos' = '/api/compras'
    }
    Replace-InFile "frontend/src/pages/CompraDetalhe.tsx" $replacements
    Write-Host "   ✅ CompraDetalhe.tsx atualizado" -ForegroundColor Green
}

# FaturamentosCompra.tsx
if (Test-Path "frontend/src/pages/FaturamentosCompra.tsx") {
    $replacements = @{
        'FaturamentosPedido' = 'FaturamentosCompra'
        'Faturamentos do Pedido' = 'Faturamentos da Compra'
        'pedido' = 'compra'
    }
    Replace-InFile "frontend/src/pages/FaturamentosCompra.tsx" $replacements
    Write-Host "   ✅ FaturamentosCompra.tsx atualizado" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Renomeação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Revisar as alterações: git diff"
Write-Host "2. Testar o backend: cd backend; npm run dev"
Write-Host "3. Testar o frontend: cd frontend; npm run dev"
Write-Host "4. Commit: git add .; git commit -m 'refactor: renomear pedidos para compras'"
Write-Host ""
