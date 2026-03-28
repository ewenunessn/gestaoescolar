const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const produtos = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'produtos' ORDER BY ordinal_position
    `);
    console.log('produtos:', produtos.rows.map(r => r.column_name).join(', '));

    const cp = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' ORDER BY ordinal_position
    `);
    console.log('contrato_produtos:', cp.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}
main();
