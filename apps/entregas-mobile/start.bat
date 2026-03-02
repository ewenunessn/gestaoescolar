@echo off
echo ========================================
echo   App de Entregas Mobile - Expo Go
echo ========================================
echo.

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [1/3] Instalando dependencias...
    call npm install
    echo.
)

echo [2/3] Verificando configuracao da API...
echo.
echo IMPORTANTE: Verifique se o arquivo src/config/api.ts
echo esta configurado com o IP correto da sua maquina!
echo.
echo Exemplo: export const API_URL = 'http://192.168.1.100:3000'
echo.
pause

echo [3/3] Iniciando Expo...
echo.
echo Aguarde o QR Code aparecer e escaneie com o Expo Go
echo.
call npm start

pause
