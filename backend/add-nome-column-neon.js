const { Pool } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: neonUrl,
  ssl: { rejectUnauthorized: false }
});

async function addNomeColumnNeon() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Adicionando coluna nome à tabela guias no NEON\n');

    await client.query(`
      ALTER TABLE guias ADD COLUMN IF NOT EXISTS nome VARCHAR(255)
    `);

    console.log('✅ Coluna nome adicionada com sucesso no NEON!\n');

    // Verificar
    const check = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guias' AND column_name = 'nome'
    `);

    if (check.rows.length > 0) {
      console.log('✅ Coluna confirmada:', check.rows[0]);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addNomeColumnNeon();
