const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function listarTabelas() {
  try {
    console.log('🔍 Listando tabelas relacionadas a guias...\n');

    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%guia%'
      ORDER BY table_name
    `);

    console.log('📋 Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    if (result.rows.length > 0) {
      console.log('\n📊 Estrutura das tabelas:\n');
      
      for (const row of result.rows) {
        console.log(`\n=== ${row.table_name} ===`);
        const cols = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [row.table_name]);
        
        cols.rows.forEach(col => {
          console.log(`   ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listarTabelas();
