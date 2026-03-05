const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkStructure() {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name='pedidos' 
    ORDER BY ordinal_position
  `);
  
  console.log('Colunas da tabela pedidos:');
  result.rows.forEach(row => {
    console.log(`  - ${row.column_name}: ${row.data_type}`);
  });
  
  await pool.end();
}

checkStructure();
