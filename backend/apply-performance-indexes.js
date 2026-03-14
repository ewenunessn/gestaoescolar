const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyIndexes() {
  try {
    console.log('🚀 Aplicando índices de performance...\n');

    const sqlPath = path.join(__dirname, 'migrations/20260314_add_performance_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Índices criados com sucesso!\n');

    // Verificar índices criados
    const indexes = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log('📊 Índices no banco:\n');
    indexes.rows.forEach(idx => {
      console.log(`  ${idx.tablename}.${idx.indexname}`);
    });

    console.log(`\n✅ Total: ${indexes.rows.length} índices`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

applyIndexes();
