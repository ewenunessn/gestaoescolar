const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
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
