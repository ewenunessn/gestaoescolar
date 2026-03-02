#!/bin/bash

echo "========================================"
echo "  App Entregador Native - Expo"
echo "========================================"
echo ""

cd "$(dirname "$0")"

echo "[1/3] Verificando dependências..."
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "ERRO: Falha ao instalar dependências"
        echo "Tente: npm install babel-preset-expo @types/react @types/react-native"
        exit 1
    fi
fi

echo ""
echo "[2/3] Limpando cache..."
npx expo start --clear

echo ""
echo "[3/3] Iniciando Expo..."
echo ""
echo "========================================"
echo "  Escaneie o QR Code com Expo Go"
echo "========================================"
echo ""
echo "Dicas:"
echo "- Celular e PC devem estar na mesma rede WiFi"
echo "- Configure o IP da API em src/api/client.ts"
echo "- Use 'ifconfig' para descobrir seu IP"
echo ""
