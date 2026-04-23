# Script para configurar Node.js 24 como padrão
# Execute como Administrador: clique com botão direito no PowerShell > Executar como Administrador

Write-Host "Configurando Node.js 24 como padrão..." -ForegroundColor Cyan

# Obter PATH do sistema
$systemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

# Remover caminhos do nvm
$newSystemPath = ($systemPath -split ';' | Where-Object { 
    $_ -notlike "*nvm*" 
}) -join ';'

# Adicionar Node.js 24 no início
$nodePath = "C:\Program Files\nodejs"
$newSystemPath = "$nodePath;$newSystemPath"

# Salvar
[Environment]::SetEnvironmentVariable("Path", $newSystemPath, "Machine")

Write-Host "✓ Node.js 24 configurado como padrão!" -ForegroundColor Green
Write-Host "✓ NVM removido do PATH" -ForegroundColor Green
Write-Host ""
Write-Host "Feche todos os terminais e abra um novo para aplicar as mudanças." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
