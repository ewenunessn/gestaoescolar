const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sqlPath = path.join(__dirname, 'migrations', '20260314_add_performance_indexes.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function aplicarEmBanco(nome, connectionString, ssl = false) {
  const pool = new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });

  // Separar cada CREATE INDEX em statements individuais
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.toUpperCase().startsWith('CREATE INDEX'));

  let ok = 0, erros = 0;
  console.log(`\n🔌 Conectando em: ${nome}...`);

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      ok++;
    } catch (error) {
      console.warn(`   ⚠️  Pulado: ${error.message.split('\n')[0]}`);
      erros++;
    }
  }

  console.log(`✅ ${nome}: ${ok} índices aplicados, ${erros} pulados`);
  await pool.end();
}

async function main() {
  console.log('🚀 Aplicando índices de performance...');

  // Local
  await aplicarEmBanco('LOCAL (localhost)', process.env.DATABASE_URL, false);

  // Neon (produção)
  const neonUrl = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL;
  if (neonUrl) {
    await aplicarEmBanco('NEON (produção)', neonUrl, true);
  } else {
    console.log('\n⚠️  NEON_DATABASE_URL não encontrado, pulando Neon.');
  }

  console.log('\n✅ Concluído!');
}

main();
