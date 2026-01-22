const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech',
  user: 'gestaoescolar_owner',
  database: 'gestaoescolar',
  password: 'your_password_here', // REPLACE WITH YOUR ACTUAL PASSWORD
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function debugContratosProdutos() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging contrato_produtos table...');
    
    // Check table structure
    console.log('\n1. Table structure:');
    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos'
      ORDER BY ordinal_position
    `);
    console.table(structure.rows);
    
    // Check constraints
    console.log('\n2. Table constraints:');
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'contrato_produtos'
    `);
    console.table(constraints.rows);
    
    // Check unique indexes
    console.log('\n3. Unique indexes:');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'contrato_produtos' AND indexdef LIKE '%UNIQUE%'
    `);
    console.table(indexes.rows);
    
    // Check if unidade column exists
    console.log('\n4. Unidade column check:');
    const unidadeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    console.log('Unidade column exists:', unidadeCheck.rows.length > 0);
    
    // Check existing data
    console.log('\n5. Sample data:');
    const sampleData = await client.query(`
      SELECT cp.*, p.nome as produto_nome, c.numero as contrato_numero
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LIMIT 5
    `);
    console.table(sampleData.rows);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the debug
debugContratosProdutos()
  .then(() => {
    console.log('🎉 Debug completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });