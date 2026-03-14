const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  // Verificar colunas da tabela produtos
  const cols = await pool.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'produtos'
    ORDER BY ordinal_position
  `);

  console.log('📋 Colunas da tabela produtos no Neon:\n');
  cols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  const temFator = cols.rows.some(c => c.column_name === 'fator_correcao');
  const temTipo  = cols.rows.some(c => c.column_name === 'tipo_fator_correcao');

  console.log(`\n${temFator ? '✅' : '❌'} fator_correcao`);
  console.log(`${temTipo  ? '✅' : '❌'} tipo_fator_correcao`);

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
