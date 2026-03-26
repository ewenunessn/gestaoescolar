@echo off
echo Gerando instalador Windows...
echo Isso vai demorar 5-10 minutos...
echo.
npm run build:win
if errorlevel 1 (
    echo.
    echo Erro ao gerar instalador!
    echo Verifique os logs acima.
    pause
    exit /b 1
)
echo.
echo ========================================
echo   INSTALADOR GERADO COM SUCESSO!
echo ========================================
echo.
echo Arquivo: dist\Gestao Escolar Setup 1.0.0.exe
echo.
pause
explorer dist
