@echo off
echo ========================================
echo   Gerando Instalador - Gestao Escolar
echo ========================================
echo.
echo IMPORTANTE: Este processo pode demorar 10-15 minutos
echo Nao feche esta janela!
echo.
pause

echo [1/3] Fazendo build do frontend...
echo Isso pode demorar alguns minutos...
cd frontend
call npm run build
if errorlevel 1 (
    echo.
    echo ERRO: Build do frontend falhou!
    echo Verifique se todas as dependencias estao instaladas.
    echo.
    pause
    exit /b 1
)
echo Frontend build concluido!
echo.

echo [2/3] Instalando dependencias do Electron...
cd ..\electron
call npm install
if errorlevel 1 (
    echo.
    echo ERRO: Instalacao de dependencias falhou!
    echo.
    pause
    exit /b 1
)
echo.

echo [3/3] Gerando instalador Windows...
echo Isso pode demorar 5-10 minutos...
call npm run build:win
if errorlevel 1 (
    echo.
    echo ERRO: Geracao do instalador falhou!
    echo.
    pause
    exit /b 1
)
echo.

echo ========================================
echo   SUCESSO!
echo ========================================
echo.
echo Instalador criado em:
echo %CD%\dist\Gestao Escolar Setup 1.0.0.exe
echo.
echo Tamanho aproximado: 150MB
echo.
echo Voce pode:
echo 1. Testar o instalador neste PC
echo 2. Copiar para outros PCs
echo 3. Distribuir para usuarios
echo.
pause
