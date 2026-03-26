@echo off
echo ========================================
echo   Build Sistema Gestao Escolar
echo ========================================
echo.

echo [1/3] Fazendo build do frontend...
cd ..\frontend
call npm run build
if errorlevel 1 (
    echo ERRO: Build do frontend falhou!
    pause
    exit /b 1
)
echo Frontend build concluido!
echo.

echo [2/3] Instalando dependencias do Electron...
cd ..\electron
call npm install
if errorlevel 1 (
    echo ERRO: Instalacao de dependencias falhou!
    pause
    exit /b 1
)
echo.

echo [3/3] Gerando instalador Windows...
call npm run build:win
if errorlevel 1 (
    echo ERRO: Geracao do instalador falhou!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   Build concluido com sucesso!
echo ========================================
echo.
echo Instalador criado em:
echo electron\dist\Gestao Escolar Setup 1.0.0.exe
echo.
pause
