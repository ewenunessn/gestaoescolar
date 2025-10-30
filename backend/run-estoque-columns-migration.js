/**
 * Script para executar a migração que adiciona colunas data_validade e data_entrada
 * na tabela estoque_escolas
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function runMigration() {
  console.log('🔄 Executando migração para adicionar colunas data_validade e data_entrada...');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', 'add-data-validade-entrada-estoque-escolas.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migração
    const result = await pool.query(sql);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('   - Adicionada coluna data_validade (opcional)');
    console.log('   - Adicionada coluna data_entrada (com default CURRENT_TIMESTAMP)');
    console.log('   - Criados índices para melhor performance');
    
    // Mostrar resultado da verificação
    if (result && result.length > 0) {
      console.log('\n📋 Verificação das colunas:');
      result.forEach(row => {
        if (row.column_name && row.data_type) {
          console.log(`   - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('💡 Dica: Verifique as credenciais do banco de dados');
    } else if (error.message.includes('does not exist')) {
      console.log('💡 Dica: Verifique se o banco de dados e a tabela existem');
    } else if (error.message.includes('already exists')) {
      console.log('💡 Info: As colunas já existem no banco de dados');
    }
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };