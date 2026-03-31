const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Executando migration...');
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'migrations', '20260401_allow_duplicate_refeicoes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Agora é possível adicionar múltiplas refeições do mesmo tipo no mesmo dia');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration();
