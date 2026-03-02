#!/bin/bash

echo "========================================"
echo "  App de Entregas Mobile - Expo Go"
echo "========================================"
echo ""

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "[1/3] Instalando dependências..."
    npm install
    echo ""
fi

echo "[2/3] Verificando configuração da API..."
echo ""
echo "IMPORTANTE: Verifique se o arquivo src/config/api.ts"
echo "está configurado com o IP correto da sua máquina!"
echo ""
echo "Exemplo: export const API_URL = 'http://192.168.1.100:3000'"
echo ""
read -p "Pressione ENTER para continuar..."

echo "[3/3] Iniciando Expo..."
echo ""
echo "Aguarde o QR Code aparecer e escaneie com o Expo Go"
echo ""
npm start
