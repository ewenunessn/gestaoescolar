const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE instituicoes
        ADD COLUMN IF NOT EXISTS departamento VARCHAR(255),
        ADD COLUMN IF NOT EXISTS pdf_templates JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ Colunas departamento e pdf_templates adicionadas');
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
