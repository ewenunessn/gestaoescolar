const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkTenantInstitution() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando tenants e suas instituições...\n');

    // Buscar todos os tenants
    const tenants = await client.query(`
      SELECT id, name, slug, institution_id, status
      FROM tenants 
      ORDER BY created_at DESC
    `);

    console.log(`📋 Tenants no banco (${tenants.rows.length}):\n`);
    
    for (const tenant of tenants.rows) {
      console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
      console.log(`  ID: ${tenant.id}`);
      console.log(`  Institution ID: ${tenant.institution_id || 'NULL'}`);
      console.log(`  Status: ${tenant.status}`);
      
      if (tenant.institution_id) {
        const inst = await client.query(`
          SELECT name, slug FROM institutions WHERE id = $1
        `, [tenant.institution_id]);
        
        if (inst.rows.length > 0) {
          console.log(`  Instituição: ${inst.rows[0].name}`);
        }
      }
      console.log();
    }
    
    // Verificar especificamente o tenant da Brenda
    const brendaTenant = '1e7141a9-9298-40a4-baba-828aab9254ad';
    console.log('🔍 Verificando tenant da Brenda:', brendaTenant);
    
    const tenant = await client.query(`
      SELECT id, name, slug, institution_id, status
      FROM tenants 
      WHERE id = $1
    `, [brendaTenant]);
    
    if (tenant.rows.length > 0) {
      console.log('✅ Tenant encontrado:');
      console.log(JSON.stringify(tenant.rows[0], null, 2));
    } else {
      console.log('❌ Tenant não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTenantInstitution()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error.message);
    process.exit(1);
  });
