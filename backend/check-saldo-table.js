const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkTable() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'saldo_produtos_modalidades'
      )
    `);
    
    console.log('Tabela saldo_produtos_modalidades existe?', result.rows[0].exists);
    
    if (!result.rows[0].exists) {
      console.log('\n💡 Precisa criar a tabela!');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTable();
