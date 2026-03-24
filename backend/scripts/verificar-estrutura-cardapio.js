const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verificar() {
  try {
    // Verificar refeicao_produtos
    const result1 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'refeicao_produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('\nColunas da tabela refeicao_produtos:');
    result1.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
    
    // Verificar se tem produto_id
    const result2 = await pool.query(`
      SELECT COUNT(*) as total
      FROM refeicao_produtos
      WHERE produto_id = 175
    `);
    
    console.log(`\nRegistros com produto Óleo (175): ${result2.rows[0].total}`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
