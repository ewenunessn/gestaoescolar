const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verificar() {
  const client = await pool.connect();
  
  try {
    // Verificar colunas da tabela
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'produto_composicao_nutricional'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas da tabela produto_composicao_nutricional:\n');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Ver um exemplo de dados
    console.log('\n📊 Exemplo de dados:\n');
    const exemplo = await client.query(`
      SELECT *
      FROM produto_composicao_nutricional
      LIMIT 1
    `);

    if (exemplo.rows.length > 0) {
      console.log(JSON.stringify(exemplo.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verificar();
