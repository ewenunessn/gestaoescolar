const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkTenantId() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tenant ID do token da Brenda...\n');

    // O tenant ID que aparece no token
    const tenantIdFromToken = '1e7141a9-9298-40a4-baba-828aab9254ad';
    
    console.log('🔍 Buscando tenant:', tenantIdFromToken);
    console.log();

    // Buscar tenant
    const tenantResult = await client.query(`
      SELECT id, name, slug, status, institution_id
      FROM tenants 
      WHERE id = $1
    `, [tenantIdFromToken]);

    if (tenantResult.rows.length === 0) {
      console.log('❌ Tenant NÃO encontrado no banco!\n');
      
      // Listar todos os tenants
      const allTenants = await client.query(`
        SELECT id, name, slug, status, institution_id
        FROM tenants 
        ORDER BY created_at DESC
      `);
      
      console.log(`📋 Tenants disponíveis no banco (${allTenants.rows.length}):`);
      allTenants.rows.forEach(t => {
        console.log(`  - ${t.name} (${t.slug})`);
        console.log(`    ID: ${t.id}`);
        console.log(`    Institution: ${t.institution_id}`);
        console.log(`    Status: ${t.status}`);
        console.log();
      });
    } else {
      console.log('✅ Tenant encontrado:');
      console.log(JSON.stringify(tenantResult.rows[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTenantId()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
