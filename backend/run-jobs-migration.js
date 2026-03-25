const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Executando migration da tabela jobs...');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260324_criar_tabela_jobs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'jobs'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tabela jobs criada com sucesso!');
    } else {
      console.log('❌ Tabela jobs não foi encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
