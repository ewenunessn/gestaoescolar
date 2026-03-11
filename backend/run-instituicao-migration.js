const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'alimentacao_escolar',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin123',
});

async function runMigration() {
  try {
    console.log('🔄 Executando migração da tabela instituicoes...');
    
    const sqlPath = path.join(__dirname, 'src/migrations/create_instituicoes_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'instituicoes'
    `);
    
    console.log(`📊 Tabela instituicoes: ${result.rows[0].count > 0 ? 'Criada' : 'Não encontrada'}`);
    
    // Verificar se há registro padrão
    const instituicoes = await pool.query('SELECT COUNT(*) as count FROM instituicoes');
    console.log(`📋 Registros na tabela: ${instituicoes.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();