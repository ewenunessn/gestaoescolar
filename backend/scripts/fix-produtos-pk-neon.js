#!/usr/bin/env node
const { Pool } = require('pg');

const NEON_URL = process.env.POSTGRES_URL;

if (!NEON_URL) {
  console.error('❌ POSTGRES_URL não configurado');
  process.exit(1);
}

async function fixPK() {
  const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Verificando e corrigindo PK da tabela produtos no Neon...\n');

    // Verificar se já tem PK
    const checkPK = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'produtos' AND constraint_type = 'PRIMARY KEY'
    `);

    if (checkPK.rows.length > 0) {
      console.log('✅ Tabela produtos já tem PRIMARY KEY:', checkPK.rows[0].constraint_name);
    } else {
      console.log('⚠️  Tabela produtos não tem PRIMARY KEY. Adicionando...');
      await pool.query('ALTER TABLE produtos ADD PRIMARY KEY (id)');
      console.log('✅ PRIMARY KEY adicionada com sucesso!');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixPK();
