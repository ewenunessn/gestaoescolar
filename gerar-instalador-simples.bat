@echo off
cls
echo ========================================
echo   GERADOR DE INSTALADOR
echo   Sistema Gestao Escolar
echo ========================================
echo.
echo Este processo vai demorar 10-15 minutos
echo Nao feche esta janela!
echo.
echo Pressione qualquer tecla para iniciar...
pause >nul
cls

echo.
echo [1/3] Build do Frontend...
echo.
cd frontend
call npm run build
if errorlevel 1 (
    echo ERRO no build do frontend!
    pause
    exit /b 1
)
cd ..
echo.
echo Frontend OK!
echo.

echo [2/3] Instalando Electron...
echo.
cd electron
call npm install
if errorlevel 1 (
    echo ERRO ao instalar Electron!
    pause
    exit /b 1
)
echo.
echo Electron OK!
echo.

echo [3/3] Gerando instalador...
echo Isso vai demorar 5-10 minutos...
echo.
call npm run build:win
if errorlevel 1 (
    echo ERRO ao gerar instalador!
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo   SUCESSO!
echo ========================================
echo.
echo Instalador criado em:
echo electron\dist\Gestao Escolar Setup 1.0.0.exe
echo.
echo Pressione qualquer tecla para abrir a pasta...
pause >nul
explorer electron\dist
