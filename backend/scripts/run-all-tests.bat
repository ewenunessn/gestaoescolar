@echo off
echo ========================================
echo   SUITE COMPLETA DE TESTES
echo ========================================
echo.

echo [1/3] Populando dados de teste...
node seed-test-data.js
if %errorlevel% neq 0 (
    echo ERRO ao popular dados!
    pause
    exit /b 1
)

echo.
echo [2/3] Executando testes de performance...
node test-performance.js
if %errorlevel% neq 0 (
    echo ERRO nos testes de performance!
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando estoque...
node verificar-estoque-atual.js
if %errorlevel% neq 0 (
    echo ERRO ao verificar estoque!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   TODOS OS TESTES CONCLUIDOS!
echo ========================================
echo.
echo Verifique os relatorios gerados:
echo   - docs/RELATORIO-PERFORMANCE.md
echo   - docs/TESTE-IDS-VALIDOS.md
echo.
pause
