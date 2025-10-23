#!/bin/bash
# Script para configurar banco PostgreSQL local
# Execute este script após instalar PostgreSQL

echo "🚀 Configurando banco de dados local..."

# Configurações
DB_NAME="gestao_escolar"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Criar database
echo "📋 Criando database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Executar schema
echo "🔧 Executando schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/schema.sql"

echo "✅ Configuração concluída!"
echo "🔗 String de conexão local:"
echo "postgresql://$DB_USER:SUA_SENHA@$DB_HOST:$DB_PORT/$DB_NAME"

# Instruções para Windows
echo ""
echo "📝 Para Windows (PowerShell):"
echo "createdb -h localhost -p 5432 -U postgres gestao_escolar"
echo "psql -h localhost -p 5432 -U postgres -d gestao_escolar -f schema.sql"
