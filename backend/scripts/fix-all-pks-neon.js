#!/usr/bin/env node
const { Pool } = require('pg');

const NEON_URL = process.env.POSTGRES_URL;

if (!NEON_URL) {
  console.error('❌ POSTGRES_URL não configurado');
  process.exit(1);
}

const tabelas = ['produtos', 'usuarios', 'escolas', 'contratos', 'fornecedores'];

async function fixAllPKs() {
  const pool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Verificando e corrigindo PKs no Neon...\n');

    for (const tabela of tabelas) {
      // Verificar se tabela existe
      const checkTable = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = $1
      `, [tabela]);

      if (checkTable.rows.length === 0) {
        console.log(`⏭️  Tabela ${tabela} não existe - pulando`);
        continue;
      }

      // Verificar se já tem PK
      const checkPK = await pool.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = $1 AND constraint_type = 'PRIMARY KEY'
      `, [tabela]);

      if (checkPK.rows.length > 0) {
        console.log(`✅ ${tabela}: já tem PK (${checkPK.rows[0].constraint_name})`);
      } else {
        console.log(`⚠️  ${tabela}: sem PK - adicionando...`);
        try {
          await pool.query(`ALTER TABLE ${tabela} ADD PRIMARY KEY (id)`);
          console.log(`   ✅ PK adicionada`);
        } catch (err) {
          console.log(`   ❌ Erro: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Verificação concluída!');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixAllPKs();
