const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function executarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigindo view vw_faturamentos_detalhados...\n');

    // Ler arquivo de migration
    const migrationPath = path.join(__dirname, '../migrations/20260324_fix_vw_faturamentos_detalhados.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Executar migration
    await client.query(sql);

    console.log('✅ View corrigida com sucesso!\n');

    // Testar a view
    console.log('🧪 Testando a view...\n');
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'vw_faturamentos_detalhados'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas da view:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Migration executada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

executarMigration().catch(console.error);
