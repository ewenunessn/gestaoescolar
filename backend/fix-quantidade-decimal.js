const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestao_escolar'
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Executando migration para corrigir quantidade...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/021_fix_pedido_itens_quantidade.sql'),
      'utf8'
    );
    
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Coluna quantidade agora aceita apenas 2 casas decimais');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
