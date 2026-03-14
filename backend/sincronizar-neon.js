const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function aplicar(pool, nome, arquivo) {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', arquivo), 'utf8');
  try {
    await pool.query(sql);
    console.log(`  ✅ ${arquivo}`);
  } catch (e) {
    console.log(`  ⚠️  ${arquivo}: ${e.message.split('\n')[0]}`);
  }
}

async function verificarProdutos(pool, nome) {
  const r = await pool.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos'
      AND column_name IN ('fator_correcao', 'tipo_fator_correcao')
    ORDER BY column_name
  `);
  console.log(`\n📋 ${nome} - produtos:`);
  r.rows.forEach(c => console.log(`  ✅ ${c.column_name} (${c.data_type})`));
  if (r.rows.length < 2) {
    const faltando = ['fator_correcao', 'tipo_fator_correcao'].filter(
      col => !r.rows.find(c => c.column_name === col)
    );
    faltando.forEach(c => console.log(`  ❌ ${c} (faltando)`));
  }
}

async function main() {
  const local = new Pool({ connectionString: process.env.DATABASE_URL });
  const neon  = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  console.log('🚀 Sincronizando schema...\n');

  console.log('📦 LOCAL:');
  await aplicar(local, 'local', '20260314_add_tipo_fator_correcao.sql');

  console.log('\n☁️  NEON:');
  await aplicar(neon, 'neon', '20260313_add_fator_correcao_produtos.sql');
  await aplicar(neon, 'neon', '20260314_add_tipo_fator_correcao.sql');

  await verificarProdutos(local, 'LOCAL');
  await verificarProdutos(neon,  'NEON');

  console.log('\n✅ Sincronização concluída!');
  await local.end();
  await neon.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
