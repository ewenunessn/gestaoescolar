const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPK() {
  try {
    console.log('🔍 Verificando PRIMARY KEY da tabela escolas (NEON)...\n');

    // Verificar constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'escolas'
      AND tc.constraint_type = 'PRIMARY KEY'
    `);

    console.log('📋 Constraints PRIMARY KEY:');
    if (constraints.rows.length === 0) {
      console.log('   ❌ Nenhuma PRIMARY KEY encontrada!');
    } else {
      constraints.rows.forEach(row => {
        console.log(`   ✓ ${row.constraint_name} (${row.column_name})`);
      });
    }

    // Verificar estrutura da tabela
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'escolas'
      ORDER BY ordinal_position
    `);

    console.log('\n📊 Estrutura da tabela escolas:');
    columns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkPK();
