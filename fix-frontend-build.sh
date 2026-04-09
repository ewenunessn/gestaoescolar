#!/bin/bash

# Script para corrigir problemas de build do frontend
# Execute: bash fix-frontend-build.sh

echo "🔧 CORREÇÃO DE BUILD DO FRONTEND"
echo "================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "frontend" ]; then
  echo "❌ Erro: Diretório 'frontend' não encontrado"
  echo "   Execute este script na raiz do projeto"
  exit 1
fi

cd frontend

echo "📋 Passo 1: Verificando typos em imports..."
echo "-------------------------------------------"

# Procurar por @tantml (typo)
if grep -r "@tantml" src/ 2>/dev/null; then
  echo "❌ TYPO ENCONTRADO: @tantml ao invés de @tanstack"
  echo "   Corrigindo automaticamente..."
  
  # Corrigir typo em todos os arquivos
  find src/ -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@tantml/@tanstack/g' 2>/dev/null || \
  find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/@tantml/@tanstack/g' {} \;
  
  echo "✅ Typos corrigidos"
else
  echo "✅ Nenhum typo encontrado"
fi

echo ""
echo "📋 Passo 2: Limpando cache e dependências..."
echo "-------------------------------------------"

# Remover node_modules e lock files
if [ -d "node_modules" ]; then
  echo "🗑️  Removendo node_modules..."
  rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
  echo "🗑️  Removendo package-lock.json..."
  rm -f package-lock.json
fi

if [ -d "dist" ]; then
  echo "🗑️  Removendo dist..."
  rm -rf dist
fi

echo "✅ Cache limpo"

echo ""
echo "📋 Passo 3: Reinstalando dependências..."
echo "-------------------------------------------"

npm install

if [ $? -ne 0 ]; then
  echo "❌ Erro ao instalar dependências"
  exit 1
fi

echo "✅ Dependências instaladas"

echo ""
echo "📋 Passo 4: Testando build..."
echo "-------------------------------------------"

npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build falhou"
  echo "   Verifique os erros acima"
  exit 1
fi

echo "✅ Build bem-sucedido"

echo ""
echo "📋 Passo 5: Verificando arquivos gerados..."
echo "-------------------------------------------"

if [ -d "dist" ]; then
  echo "✅ Diretório dist criado"
  echo "   Arquivos gerados:"
  ls -lh dist/ | head -10
else
  echo "❌ Diretório dist não foi criado"
  exit 1
fi

echo ""
echo "================================"
echo "✅ CORREÇÃO CONCLUÍDA COM SUCESSO"
echo "================================"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "1. Fazer commit das alterações:"
echo "   git add ."
echo "   git commit -m \"fix: corrigir build do frontend\""
echo "   git push origin main"
echo ""
echo "2. No Vercel Dashboard:"
echo "   - Vá em Settings → General"
echo "   - Clique em 'Clear Build Cache'"
echo "   - Vá em Deployments"
echo "   - Clique em 'Redeploy' (sem usar cache)"
echo ""
echo "3. Testar no navegador em modo anônimo"
echo ""
