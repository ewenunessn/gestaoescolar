const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function verificarTenant() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const tenantId = '1e43f397-76ce-4f24-85c1-c896cacbad4a';
    console.log('🔍 Procurando tenant:', tenantId);
    
    const result = await client.query(
      'SELECT id, nome, slug, status FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Tenant encontrado:', result.rows[0]);
    } else {
      console.log('❌ Tenant NÃO encontrado!');
      console.log('\n📋 Todos os tenants:');
      const all = await client.query('SELECT id, nome, slug, status FROM tenants');
      all.rows.forEach(t => {
        console.log(`  - ${t.nome} (${t.id})`);
      });
    }
    
  } finally {
    await client.end();
  }
}

verificarTenant();
