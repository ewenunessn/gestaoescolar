# Script para atualizar o GitHub
# Uso: .\update-github.ps1 "Mensagem do commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

# Cores para output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "🚀 Iniciando atualização do GitHub..." -ForegroundColor $Cyan
Write-Host ""

# Verificar se estamos em um repositório Git
if (-not (Test-Path ".git")) {
    Write-Host "❌ Erro: Este diretório não é um repositório Git!" -ForegroundColor $Red
    exit 1
}

# Verificar status do repositório
Write-Host "📋 Verificando status do repositório..." -ForegroundColor $Yellow
git status --porcelain

# Adicionar todos os arquivos modificados
Write-Host "📁 Adicionando arquivos modificados..." -ForegroundColor $Yellow
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar arquivos!" -ForegroundColor $Red
    exit 1
}

# Verificar se há algo para commitar
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ Nenhuma alteração para commitar." -ForegroundColor $Green
    exit 0
}

# Fazer commit
Write-Host "💾 Fazendo commit com mensagem: '$CommitMessage'" -ForegroundColor $Yellow
git commit -m $CommitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer commit!" -ForegroundColor $Red
    exit 1
}

# Fazer push para o repositório remoto
Write-Host "🌐 Enviando alterações para o GitHub..." -ForegroundColor $Yellow
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao fazer push! Verifique sua conexão e credenciais." -ForegroundColor $Red
    exit 1
}

Write-Host ""
Write-Host "✅ Atualização concluída com sucesso!" -ForegroundColor $Green
Write-Host "🎉 Suas alterações foram enviadas para o GitHub." -ForegroundColor $Green

# Mostrar o último commit
Write-Host ""
Write-Host "📝 Último commit:" -ForegroundColor $Cyan
git log -1 --oneline