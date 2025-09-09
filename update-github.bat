@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM Script para atualizar o GitHub
REM Uso: update-github.bat "Mensagem do commit"

if "%~1"=="" (
    echo ❌ Erro: Forneça uma mensagem de commit!
    echo Uso: update-github.bat "Sua mensagem de commit"
    pause
    exit /b 1
)

set "COMMIT_MESSAGE=%~1"

echo 🚀 Iniciando atualização do GitHub...
echo.

REM Verificar se estamos em um repositório Git
if not exist ".git" (
    echo ❌ Erro: Este diretório não é um repositório Git!
    pause
    exit /b 1
)

REM Verificar status do repositório
echo 📋 Verificando status do repositório...
git status --porcelain

REM Adicionar todos os arquivos modificados
echo 📁 Adicionando arquivos modificados...
git add .
if errorlevel 1 (
    echo ❌ Erro ao adicionar arquivos!
    pause
    exit /b 1
)

REM Verificar se há algo para commitar
for /f %%i in ('git status --porcelain') do set HAS_CHANGES=1
if not defined HAS_CHANGES (
    echo ✅ Nenhuma alteração para commitar.
    pause
    exit /b 0
)

REM Fazer commit
echo 💾 Fazendo commit com mensagem: '%COMMIT_MESSAGE%'
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
    echo ❌ Erro ao fazer commit!
    pause
    exit /b 1
)

REM Fazer push para o repositório remoto
echo 🌐 Enviando alterações para o GitHub...
git push
if errorlevel 1 (
    echo ❌ Erro ao fazer push! Verifique sua conexão e credenciais.
    pause
    exit /b 1
)

echo.
echo ✅ Atualização concluída com sucesso!
echo 🎉 Suas alterações foram enviadas para o GitHub.

REM Mostrar o último commit
echo.
echo 📝 Último commit:
git log -1 --oneline

echo.
echo Pressione qualquer tecla para continuar...
pause >nul