# Script de deploy para Vercel (PowerShell)
# Execute este script para fazer deploy do frontend

Write-Host "🚀 Iniciando deploy do frontend no Vercel..." -ForegroundColor Green

# Verificar se o Vercel CLI está instalado
try {
    vercel --version | Out-Null
    Write-Host "✅ Vercel CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI não encontrado. Instalando..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

# Verificar autenticação no Vercel
Write-Host "🔐 Verificando autenticação no Vercel..." -ForegroundColor Blue
try {
    vercel whoami | Out-Null
    Write-Host "✅ Usuário autenticado no Vercel" -ForegroundColor Green
} catch {
    Write-Host "🔑 Fazendo login no Vercel..." -ForegroundColor Yellow
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no login do Vercel" -ForegroundColor Red
        exit 1
    }
}

# Fazer build do projeto
Write-Host "🔨 Fazendo build do projeto..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build. Abortando deploy." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green

# Deploy para produção
Write-Host "📦 Fazendo deploy para produção..." -ForegroundColor Blue
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "🌐 Seu frontend está disponível no Vercel" -ForegroundColor Cyan
    Write-Host "💡 Dica: Configure as variáveis de ambiente no painel do Vercel:" -ForegroundColor Yellow
    Write-Host "   VITE_API_URL=https://seu-backend.vercel.app" -ForegroundColor Gray
    Write-Host "   VITE_APP_ENV=production" -ForegroundColor Gray
    Write-Host "   NODE_ENV=production" -ForegroundColor Gray
} else {
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    exit 1
}