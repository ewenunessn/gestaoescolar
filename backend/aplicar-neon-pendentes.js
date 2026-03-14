const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const neonUrl = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString: neonUrl,
  ssl: { rejectUnauthorized: false },
});

// Migrations pendentes no Neon (em ordem)
const migrations = [
  '20260313_add_percapita_modalidade.sql',
  '20260314_add_performance_indexes.sql',
];

async function executarStatement(stmt) {
  try {
    await pool.query(stmt);
    return true;
  } catch (error) {
    const msg = error.message.split('\n')[0];
    // Ignorar erros de "já existe"
    if (msg.includes('already exists') || msg.includes('já existe')) {
      return true;
    }
    console.warn(`   ⚠️  ${msg}`);
    return false;
  }
}

async function aplicarMigration(arquivo) {
  const sqlPath = path.join(__dirname, 'migrations', arquivo);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log(`   ✅ ${arquivo}: aplicado com sucesso`);
  } catch (error) {
    const msg = error.message.split('\n')[0];
    console.warn(`   ⚠️  ${arquivo}: ${msg}`);
  }
}

async function main() {
  console.log('🚀 Aplicando migrations pendentes no NEON...\n');

  for (const migration of migrations) {
    console.log(`📄 Aplicando: ${migration}`);
    await aplicarMigration(migration);
  }

  // Verificar tabelas criadas
  const result = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('refeicao_produto_modalidade', 'cardapios_modalidade', 'cardapio_refeicoes_dia')
    ORDER BY table_name
  `);

  console.log('\n📊 Tabelas verificadas no Neon:');
  result.rows.forEach(r => console.log(`   ✅ ${r.table_name}`));

  // Verificar índices
  const idxResult = await pool.query(`
    SELECT indexname, tablename FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_refeicao_produto_modalidade%'
    ORDER BY indexname
  `);

  console.log('\n📊 Índices refeicao_produto_modalidade:');
  if (idxResult.rows.length > 0) {
    idxResult.rows.forEach(r => console.log(`   ✅ ${r.indexname}`));
  } else {
    console.log('   ⚠️  Nenhum índice encontrado');
  }

  console.log('\n✅ Concluído!');
  await pool.end();
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
