const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const cols = await pool.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos'
      AND column_name IN ('fator_correcao', 'tipo_fator_correcao')
    ORDER BY ordinal_position
  `);

  console.log('📋 Colunas fator_correcao no LOCAL:\n');
  cols.rows.forEach(c => console.log(`  ✅ ${c.column_name} (${c.data_type}) default: ${c.column_default}`));

  if (cols.rows.length === 0) console.log('  ❌ Nenhuma coluna encontrada');

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
