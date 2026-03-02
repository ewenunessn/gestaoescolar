@echo off
echo ========================================
echo   App Entregador Native - Expo
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERRO: Falha ao instalar dependencias
        echo Tente: npm install babel-preset-expo @types/react @types/react-native
        pause
        exit /b 1
    )
)

echo.
echo [2/3] Limpando cache...
call npx expo start --clear

echo.
echo [3/3] Iniciando Expo...
echo.
echo ========================================
echo   Escaneie o QR Code com Expo Go
echo ========================================
echo.
echo Dicas:
echo - Celular e PC devem estar na mesma rede WiFi
echo - Configure o IP da API em src/api/client.ts
echo - Use 'ipconfig' para descobrir seu IP
echo.

pause
