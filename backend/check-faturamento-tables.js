const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkTables() {
  console.log('\n🔍 Verificando tabelas de faturamento...\n');

  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%faturamento%'
      ORDER BY table_name
    `);

    if (result.rows.length > 0) {
      console.log('📋 Tabelas encontradas:\n');
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    } else {
      console.log('❌ Nenhuma tabela de faturamento encontrada');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
