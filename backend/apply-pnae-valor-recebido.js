// Script para aplicar migration de valor recebido FNDE
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Aplicando migration de valor recebido FNDE...\n');
    
    await client.query('BEGIN');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260312_add_pnae_valor_recebido.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Configure os valores recebidos do FNDE');
    console.log('   2. Use a API: POST /api/pnae/valores-recebidos');
    console.log('   3. O percentual será calculado corretamente');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
