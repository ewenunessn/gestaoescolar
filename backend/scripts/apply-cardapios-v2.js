const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const localPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function applyMigration() {
  const client = await localPool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../src/migrations/20260305_refactor_cardapios_v2.sql'),
      'utf8'
    );
    
    console.log('🔄 Aplicando migration de cardápios v2...');
    await client.query(sql);
    console.log('✅ Migration aplicada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await localPool.end();
  }
}

applyMigration();
