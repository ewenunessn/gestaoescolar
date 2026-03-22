require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const cs = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function main() {
  // Colunas da tabela
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='taco_alimentos' ORDER BY ordinal_position`
  );
  console.log('Colunas:', cols.rows.map(r => r.column_name).join(', '));

  // Quantos têm vitamina_c_mg preenchida
  const vitC = await pool.query(`SELECT COUNT(*) as total FROM taco_alimentos WHERE vitamina_c_mg IS NOT NULL`);
  console.log(`\nvitamina_c_mg preenchida: ${vitC.rows[0].total}/597`);

  // Quantos têm vitamina_a_mcg preenchida
  const vitA = await pool.query(`SELECT COUNT(*) as total FROM taco_alimentos WHERE vitamina_a_mcg IS NOT NULL`);
  console.log(`vitamina_a_mcg preenchida: ${vitA.rows[0].total}/597`);

  // Amostras com vitamina C
  const sampleC = await pool.query(`SELECT id, nome, vitamina_c_mg FROM taco_alimentos WHERE vitamina_c_mg IS NOT NULL LIMIT 5`);
  console.log('\nAmostras com Vit C:', sampleC.rows);

  // Amostras com vitamina A
  const sampleA = await pool.query(`SELECT id, nome, vitamina_a_mcg FROM taco_alimentos WHERE vitamina_a_mcg IS NOT NULL LIMIT 5`);
  console.log('\nAmostras com Vit A:', sampleA.rows);

  // Ver todos os campos de um alimento rico em vitaminas (ex: cenoura)
  const cenoura = await pool.query(`SELECT * FROM taco_alimentos WHERE LOWER(nome) LIKE '%cenoura%' LIMIT 2`);
  console.log('\nCenoura:', cenoura.rows);

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
