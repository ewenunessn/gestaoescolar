const { Pool } = require('pg');
require('dotenv').config();

// Banco NEON (Produção)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function aplicarPKNeon() {
  try {
    console.log('🔧 Aplicando PRIMARY KEY na tabela guias (NEON)...\n');

    // Verificar se já existe PK
    const checkPK = await pool.query(`
      SELECT 1 
      FROM pg_constraint 
      WHERE conname = 'guias_pkey' 
      AND conrelid = 'guias'::regclass
    `);

    if (checkPK.rows.length > 0) {
      console.log('✅ PRIMARY KEY já existe na tabela guias (NEON)');
    } else {
      // Adicionar PRIMARY KEY
      await pool.query('ALTER TABLE guias ADD PRIMARY KEY (id)');
      console.log('✅ PRIMARY KEY adicionada com sucesso na tabela guias (NEON)');
    }

    // Verificar estrutura
    const structure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'guias'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Estrutura da tabela guias:');
    console.log('─'.repeat(80));
    structure.rows.forEach(row => {
      console.log(`${row.column_name} | ${row.data_type} | Nullable: ${row.is_nullable} | Default: ${row.column_default || 'N/A'}`);
    });

    // Verificar constraints
    const constraints = await pool.query(`
      SELECT
        conname AS constraint_name,
        contype AS constraint_type
      FROM pg_constraint
      WHERE conrelid = 'guias'::regclass
    `);

    console.log('\n🔒 Constraints:');
    console.log('─'.repeat(80));
    constraints.rows.forEach(row => {
      const type = {
        'p': 'PRIMARY KEY',
        'f': 'FOREIGN KEY',
        'u': 'UNIQUE',
        'c': 'CHECK'
      }[row.constraint_type] || row.constraint_type;
      console.log(`${row.constraint_name} | ${type}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

aplicarPKNeon();
