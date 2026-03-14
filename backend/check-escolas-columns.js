const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'escolas' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela escolas:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name}: ${r.data_type}`);
    });
    
    console.log('\n📊 Exemplo de dados:');
    const dados = await pool.query('SELECT * FROM escolas LIMIT 1');
    console.log(JSON.stringify(dados.rows[0], null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();
