const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarTenants() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    console.log('📋 Tenants cadastrados:');
    const tenants = await client.query('SELECT * FROM tenants ORDER BY created_at');
    console.log(`Total: ${tenants.rowCount}\n`);
    tenants.rows.forEach(t => {
      console.log(`  ID: ${t.id}`);
      console.log(`  Nome: ${t.nome}`);
      console.log(`  Slug: ${t.slug}`);
      console.log(`  Status: ${t.status}`);
      console.log('  ---');
    });
    
    console.log('\n👥 Associações tenant_users:');
    const associations = await client.query(`
      SELECT 
        u.nome as usuario,
        u.email,
        t.nome as tenant,
        tu.role,
        tu.status
      FROM tenant_users tu
      JOIN usuarios u ON tu.user_id = u.id
      JOIN tenants t ON tu.tenant_id = t.id
      ORDER BY u.nome
    `);
    console.log(`Total: ${associations.rowCount}\n`);
    associations.rows.forEach(a => {
      console.log(`  ${a.usuario} (${a.email})`);
      console.log(`    -> ${a.tenant} [${a.role}] (${a.status})`);
    });
    
  } finally {
    await client.end();
  }
}

verificarTenants();
