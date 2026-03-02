const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function addPK() {
  try {
    console.log('🔧 Adicionando PRIMARY KEY na tabela escolas (NEON)...\n');

    // Adicionar PRIMARY KEY
    await pool.query(`
      ALTER TABLE escolas 
      ADD CONSTRAINT escolas_pkey PRIMARY KEY (id)
    `);

    console.log('✅ PRIMARY KEY adicionada com sucesso!\n');

    // Verificar
    const result = await pool.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'escolas'
      AND tc.constraint_type = 'PRIMARY KEY'
    `);

    console.log('📋 PRIMARY KEY criada:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.constraint_name} (${row.column_name})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

addPK();
