const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true'
});

async function runMigration() {
  try {
    console.log('🔄 Executando migração de tenant para tabelas de estoque...');
    
    const sql = fs.readFileSync('./backend/migrations/011_add_tenant_to_estoque_tables.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('📋 Alterações realizadas:');
    console.log('  - Adicionado tenant_id às tabelas: estoque_escolas, estoque_lotes, estoque_escolas_historico');
    console.log('  - Criados índices compostos para performance');
    console.log('  - Implementado Row Level Security (RLS)');
    console.log('  - Criados triggers para definir tenant_id automaticamente');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

runMigration();