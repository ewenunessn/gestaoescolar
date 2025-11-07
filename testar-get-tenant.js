// Simular o getTenant do tenantService
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testarGetTenant() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const tenantId = '00000000-0000-0000-0000-000000000000';
    console.log('🔍 Testando query do getTenant...');
    console.log('ID:', tenantId);
    
    // Query exata do tenantService
    const result = await client.query(`
      SELECT 
        id,
        slug,
        nome as name,
        domain,
        subdomain,
        status,
        settings,
        limits,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenants 
      WHERE id = $1
    `, [tenantId]);
    
    console.log('\n📊 Resultado:');
    console.log('Rows encontrados:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\n✅ Tenant encontrado:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('\n❌ Nenhum tenant encontrado!');
    }
    
  } finally {
    await client.end();
  }
}

testarGetTenant();
