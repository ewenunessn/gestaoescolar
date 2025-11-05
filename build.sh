#!/bin/bash
echo "🚀 Iniciando build do frontend..."

# Navegar para o diretório do frontend
cd frontend

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Build do projeto
echo "🔨 Executando build..."
npm run build

echo "✅ Build concluído!"