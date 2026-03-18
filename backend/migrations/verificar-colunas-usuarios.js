const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function verificar() {
  try {
    console.log('🔍 Verificando estrutura da tabela usuarios...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `);

    console.log('📋 Colunas da tabela usuarios:');
    result.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
