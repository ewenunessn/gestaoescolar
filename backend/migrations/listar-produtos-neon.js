require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const cs = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } });

async function main() {
  const r = await pool.query(`SELECT id, nome FROM produtos ORDER BY id`);
  console.log(`Total: ${r.rows.length} produtos`);
  r.rows.forEach(p => console.log(`  id=${p.id} | ${p.nome}`));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
