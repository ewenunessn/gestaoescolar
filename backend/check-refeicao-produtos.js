const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkStructure() {
  console.log('\n🔍 Verificando estrutura da tabela refeicao_produtos...\n');

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'refeicao_produtos'
      ORDER BY ordinal_position
    `);

    if (result.rows.length > 0) {
      console.log('📋 Colunas da tabela refeicao_produtos:\n');
      result.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ Tabela refeicao_produtos não encontrada');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkStructure();
