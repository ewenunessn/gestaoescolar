require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verEstrutura() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Estrutura da tabela comprovantes_entrega:\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'comprovantes_entrega'
      ORDER BY ordinal_position
    `);

    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verEstrutura()
  .then(() => {
    console.log('\n✅ Concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
