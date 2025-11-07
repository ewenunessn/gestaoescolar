const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarColunas() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela tenants:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
  } finally {
    await client.end();
  }
}

verificarColunas();
