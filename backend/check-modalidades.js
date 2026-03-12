require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function check() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'modalidades'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela modalidades:\n');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}`);
    });
    
    // Ver dados de exemplo
    const data = await pool.query('SELECT * FROM modalidades LIMIT 3');
    console.log('\n📊 Dados de exemplo:\n');
    data.rows.forEach(row => {
      console.log(`ID: ${row.id}, Nome: ${row.nome}, Valor Repasse: ${row.valor_repasse || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

check();
