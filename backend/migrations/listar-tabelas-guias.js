require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function listarTabelas() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Listando tabelas relacionadas a guias...\n');

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%guia%'
      ORDER BY table_name
    `);

    console.log('Tabelas encontradas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n📋 Listando tabelas relacionadas a entregas...\n');

    const result2 = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name LIKE '%entrega%' OR table_name LIKE '%comprovante%')
      ORDER BY table_name
    `);

    console.log('Tabelas encontradas:');
    result2.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

listarTabelas()
  .then(() => {
    console.log('\n✅ Listagem concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
