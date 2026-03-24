const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function listarTabelas() {
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND (tablename LIKE '%cardapio%' OR tablename LIKE '%refeic%')
      ORDER BY tablename
    `);
    
    console.log('\nTabelas relacionadas a cardápio/refeição:');
    result.rows.forEach(row => console.log(`  - ${row.tablename}`));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listarTabelas();
