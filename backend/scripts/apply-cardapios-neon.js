const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL,
  ssl: process.env.POSTGRES_URL ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await neonPool.connect();
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../src/migrations/20260305_refactor_cardapios_v2.sql'),
      'utf8'
    );
    
    console.log('🔄 Aplicando migration de cardápios v2 no Neon...');
    await client.query(sql);
    console.log('✅ Migration aplicada com sucesso no Neon!');
    
    // Verificar tabelas criadas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'cardapio%'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Tabelas de cardápios no Neon:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await neonPool.end();
  }
}

applyMigration();
