#!/bin/bash

# Script de deploy para Vercel
# Execute este script para fazer deploy do frontend

echo "🚀 Iniciando deploy do frontend no Vercel..."

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instalando..."
    npm install -g vercel
fi

# Fazer login no Vercel (se necessário)
echo "🔐 Verificando autenticação no Vercel..."
vercel whoami || vercel login

# Fazer build do projeto
echo "🔨 Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Abortando deploy."
    exit 1
fi

# Deploy para produção
echo "📦 Fazendo deploy para produção..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
    echo "🌐 Seu frontend está disponível no Vercel"
else
    echo "❌ Erro no deploy"
    exit 1
fi