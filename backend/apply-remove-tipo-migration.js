const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gestaoescolar',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aplicando migration para remover coluna tipo...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '20260401_remove_tipo_refeicoes.sql'),
      'utf8'
    );
    
    await client.query(sql);
    
    console.log('✅ Migration aplicada com sucesso!');
    console.log('✅ Coluna "tipo" removida da tabela refeicoes');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
