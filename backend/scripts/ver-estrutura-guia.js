const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verEstrutura() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guia_produto_escola'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas da tabela guia_produto_escola:');
    result.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verEstrutura();
