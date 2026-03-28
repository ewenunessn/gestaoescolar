process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const DB = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DB });

async function main() {
  const client = await pool.connect();
  try {
    const p = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='produtos' ORDER BY ordinal_position`);
    const cp = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='contrato_produtos' ORDER BY ordinal_position`);
    console.log('PRODUTOS:', p.rows.map(r => r.column_name).join(', '));
    console.log('CONTRATO_PRODUTOS:', cp.rows.map(r => r.column_name).join(', '));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
