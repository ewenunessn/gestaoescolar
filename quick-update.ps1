# Script de atualizacao rapida do GitHub
# Uso: .\quick-update.ps1
# Este script usa uma mensagem de commit automatica com timestamp

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Atualizacao automatica - $timestamp"

Write-Host "Atualizacao rapida do GitHub" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor Yellow
Write-Host ""

# Verificar se estamos em um repositorio Git
if (-not (Test-Path ".git")) {
    Write-Host "Erro: Este diretorio nao e um repositorio Git!" -ForegroundColor Red
    Read-Host "Pressione Enter para continuar"
    exit 1
}

# Adicionar, commitar e fazer push
try {
    Write-Host "Adicionando arquivos..." -ForegroundColor Yellow
    git add .
    
    # Verificar se ha alteracoes
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "Nenhuma alteracao para commitar." -ForegroundColor Green
        Read-Host "Pressione Enter para continuar"
        exit 0
    }
    
    Write-Host "Fazendo commit..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    Write-Host "Enviando para GitHub..." -ForegroundColor Yellow
    git push
    
    Write-Host ""
    Write-Host "Atualizacao concluida!" -ForegroundColor Green
    Write-Host "Commit: $commitMessage" -ForegroundColor Cyan
}
catch {
    Write-Host "Erro durante a atualizacao: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Pressione Enter para continuar"