const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE cardapios_modalidade
        ADD CONSTRAINT cardapios_modalidade_nutricionista_id_fkey
        FOREIGN KEY (nutricionista_id) REFERENCES nutricionistas(id) ON DELETE SET NULL
    `);
    console.log('✅ FK nutricionista restaurada');

    await client.query(`
      ALTER TABLE cardapios_modalidade
        ADD CONSTRAINT cardapios_modalidade_periodo_id_fkey
        FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE SET NULL
    `);
    console.log('✅ FK periodo restaurada');

    await client.query('COMMIT');
    console.log('✅ FKs restauradas com sucesso');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);
