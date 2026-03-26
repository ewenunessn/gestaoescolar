require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function listTables() {
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tabelas no banco de dados:\n');
    result.rows.forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${row.tablename}`);
    });
    console.log(`\n✅ Total: ${result.rows.length} tabelas\n`);
  } catch (error) {
    console.error('❌ Erro ao listar tabelas:', error.message);
  } finally {
    await pool.end();
  }
}

listTables();
