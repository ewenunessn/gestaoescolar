require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const cs = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: cs, ssl: cs.includes('neon.tech') ? { rejectUnauthorized: false } : false });

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '20260322_create_grupos_ingredientes.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Tabelas grupos_ingredientes e grupos_ingredientes_itens criadas no Neon.');
  await pool.end();
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
