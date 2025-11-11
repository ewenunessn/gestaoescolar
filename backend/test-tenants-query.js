const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

console.log('📁 Carregando .env de:', path.join(__dirname, '.env'));
console.log('🔑 POSTGRES_URL definido:', !!process.env.POSTGRES_URL);
console.log('🔑 DATABASE_URL definido:', !!process.env.DATABASE_URL);
console.log('');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL ou POSTGRES_URL não configurado');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function testTenantsQuery() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando query de tenants...\n');

    const institutionId = '00000000-0000-0000-0000-000000000001';

    // Testar query simples
    console.log('1️⃣ Testando SELECT * FROM tenants...');
    const result1 = await client.query('SELECT * FROM tenants LIMIT 1');
    console.log('✅ Sucesso! Colunas:', Object.keys(result1.rows[0] || {}));
    console.log('');

    // Testar query com ORDER BY name
    console.log('2️⃣ Testando SELECT * FROM tenants ORDER BY name...');
    const result2 = await client.query('SELECT * FROM tenants ORDER BY name LIMIT 1');
    console.log('✅ Sucesso!');
    console.log('');

    // Testar query completa
    console.log('3️⃣ Testando query completa com institution_id...');
    const result3 = await client.query(`
      SELECT * FROM tenants 
      WHERE institution_id = $1 
      ORDER BY name
    `, [institutionId]);
    console.log('✅ Sucesso! Total de tenants:', result3.rows.length);
    
    if (result3.rows.length > 0) {
      console.log('\n📊 Primeiro tenant:');
      console.log(JSON.stringify(result3.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testTenantsQuery()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
