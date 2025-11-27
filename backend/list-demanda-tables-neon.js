const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function listTables() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%demanda%'
      ORDER BY table_name
    `);
    
    console.log('Tabelas com "demanda" no nome:');
    result.rows.forEach(t => console.log('  -', t.table_name));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

listTables();
