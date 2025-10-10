const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  try {
    console.log('🔄 Executando migration de demandas...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '../src/database/migrations/009_create_demandas.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar a migration
    await pool.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    console.log('📋 Tabela "demandas" criada');
    console.log('🔍 Índices criados');
    console.log('\n🎉 Sistema de Demandas pronto para uso!');
    console.log('📍 Acesse: http://localhost:3000/demandas');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
