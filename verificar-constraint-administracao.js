const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarConstraint() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'escolas_administracao_check'
    `);
    
    console.log('📋 Constraint escolas_administracao_check:');
    console.log(result.rows[0]);
    
  } finally {
    await client.end();
  }
}

verificarConstraint();
