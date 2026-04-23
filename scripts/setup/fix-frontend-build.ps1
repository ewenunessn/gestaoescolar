# Script para corrigir problemas de build do frontend
# Execute: powershell -ExecutionPolicy Bypass -File fix-frontend-build.ps1

Write-Host "🔧 CORREÇÃO DE BUILD DO FRONTEND" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "frontend")) {
    Write-Host "❌ Erro: Diretório 'frontend' não encontrado" -ForegroundColor Red
    Write-Host "   Execute este script na raiz do projeto" -ForegroundColor Yellow
    exit 1
}

Set-Location frontend

Write-Host "📋 Passo 1: Verificando typos em imports..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

# Procurar por @tantml (typo)
$typoFiles = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "@tantml" -List

if ($typoFiles) {
    Write-Host "❌ TYPO ENCONTRADO: @tantml ao invés de @tanstack" -ForegroundColor Red
    Write-Host "   Corrigindo automaticamente..." -ForegroundColor Yellow
    
    # Corrigir typo em todos os arquivos
    Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        if ($content -match "@tantml") {
            $content = $content -replace "@tantml", "@tanstack"
            Set-Content -Path $_.FullName -Value $content -NoNewline
            Write-Host "   Corrigido: $($_.Name)" -ForegroundColor Green
        }
    }
    
    Write-Host "✅ Typos corrigidos" -ForegroundColor Green
} else {
    Write-Host "✅ Nenhum typo encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "📋 Passo 2: Limpando cache e dependências..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

# Remover node_modules e lock files
if (Test-Path "node_modules") {
    Write-Host "🗑️  Removendo node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force
}

if (Test-Path "package-lock.json") {
    Write-Host "🗑️  Removendo package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Path "package-lock.json" -Force
}

if (Test-Path "dist") {
    Write-Host "🗑️  Removendo dist..." -ForegroundColor Yellow
    Remove-Item -Path "dist" -Recurse -Force
}

Write-Host "✅ Cache limpo" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Passo 3: Reinstalando dependências..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependências instaladas" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Passo 4: Testando build..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build falhou" -ForegroundColor Red
    Write-Host "   Verifique os erros acima" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Build bem-sucedido" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Passo 5: Verificando arquivos gerados..." -ForegroundColor Yellow
Write-Host "-------------------------------------------"

if (Test-Path "dist") {
    Write-Host "✅ Diretório dist criado" -ForegroundColor Green
    Write-Host "   Arquivos gerados:" -ForegroundColor Cyan
    Get-ChildItem -Path dist | Select-Object -First 10 | Format-Table Name, Length, LastWriteTime
} else {
    Write-Host "❌ Diretório dist não foi criado" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ CORREÇÃO CONCLUÍDA COM SUCESSO" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Fazer commit das alterações:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m `"fix: corrigir build do frontend`"" -ForegroundColor Gray
Write-Host "   git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "2. No Vercel Dashboard:" -ForegroundColor White
Write-Host "   - Vá em Settings → General" -ForegroundColor Gray
Write-Host "   - Clique em 'Clear Build Cache'" -ForegroundColor Gray
Write-Host "   - Vá em Deployments" -ForegroundColor Gray
Write-Host "   - Clique em 'Redeploy' (sem usar cache)" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Testar no navegador em modo anonimo" -ForegroundColor White
Write-Host ""
