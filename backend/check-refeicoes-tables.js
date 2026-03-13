const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkTables() {
  try {
    console.log('🔍 Verificando tabelas relacionadas a refeições...\n');

    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%refeic%'
      ORDER BY table_name
    `);

    console.log('📋 Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });

    // Verificar colunas da tabela refeicoes
    console.log('\n📋 Colunas da tabela refeicoes:');
    const colsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'refeicoes'
      ORDER BY ordinal_position
    `);

    colsResult.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
