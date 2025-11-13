const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

// Conexão Local
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gestaoescolar'
});

async function testLocalBrenda() {
  const client = await localPool.connect();
  
  try {
    console.log('🔍 TESTE NO BANCO LOCAL\n');
    console.log('='.repeat(80));

    // 1. Verificar se Brenda existe no local
    console.log('\n1️⃣ VERIFICANDO BRENDA NO LOCAL');
    console.log('-'.repeat(80));
    const brenda = await client.query(`
      SELECT id, nome, email, tipo, institution_id, tenant_id
      FROM usuarios 
      WHERE email = 'ewertonsolon@gmail.com'
    `);

    if (brenda.rows.length === 0) {
      console.log('❌ Brenda NÃO existe no banco local');
      console.log('💡 Use um usuário que existe no banco local para testar');
      return;
    }
    
    console.log('✅ Brenda encontrada:');
    console.log(JSON.stringify(brenda.rows[0], null, 2));

    const brendaData = brenda.rows[0];

    // 2. Verificar instituição
    console.log('\n2️⃣ VERIFICANDO INSTITUIÇÃO');
    console.log('-'.repeat(80));
    const inst = await client.query(`
      SELECT id, name, slug FROM institutions WHERE id = $1
    `, [brendaData.institution_id]);

    if (inst.rows.length > 0) {
      console.log('✅ Instituição encontrada:');
      console.log(JSON.stringify(inst.rows[0], null, 2));
    } else {
      console.log('❌ Instituição NÃO encontrada');
    }

    // 3. Verificar tenants da instituição
    console.log('\n3️⃣ VERIFICANDO TENANTS DA INSTITUIÇÃO');
    console.log('-'.repeat(80));
    const tenants = await client.query(`
      SELECT id, name, slug, institution_id, status, settings, limits
      FROM tenants 
      WHERE institution_id = $1
    `, [brendaData.institution_id]);

    console.log(`📊 Tenants encontrados: ${tenants.rows.length}`);
    tenants.rows.forEach(t => {
      console.log(`\n  • ${t.name} (${t.slug})`);
      console.log(`    ID: ${t.id}`);
      console.log(`    Institution ID: ${t.institution_id}`);
      console.log(`    Status: ${t.status}`);
      console.log(`    Settings: ${t.settings ? 'Presente' : 'NULL'}`);
      console.log(`    Limits: ${t.limits ? 'Presente' : 'NULL'}`);
    });

    // 4. Verificar associações
    console.log('\n4️⃣ VERIFICANDO ASSOCIAÇÕES');
    console.log('-'.repeat(80));
    
    const instUsers = await client.query(`
      SELECT * FROM institution_users WHERE user_id = $1
    `, [brendaData.id]);
    console.log(`📊 institution_users: ${instUsers.rows.length} associações`);

    const tenantUsers = await client.query(`
      SELECT * FROM tenant_users WHERE user_id = $1
    `, [brendaData.id]);
    console.log(`📊 tenant_users: ${tenantUsers.rows.length} associações`);

    // 5. Simular query do listTenants
    console.log('\n5️⃣ SIMULANDO QUERY listTenants()');
    console.log('-'.repeat(80));
    const listTenantsQuery = await client.query(`
      SELECT 
        id,
        slug,
        name,
        domain,
        slug as subdomain,
        institution_id,
        status,
        settings,
        limits,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM tenants 
      WHERE 1=1
      ORDER BY created_at DESC
    `);

    console.log(`📊 Query retornou: ${listTenantsQuery.rows.length} tenants`);
    if (listTenantsQuery.rows.length > 0) {
      const firstTenant = listTenantsQuery.rows[0];
      console.log('\n📋 Primeiro tenant:');
      console.log(`  - ID: ${firstTenant.id}`);
      console.log(`  - Name: ${firstTenant.name}`);
      console.log(`  - Institution ID: ${firstTenant.institution_id || '❌ NULL'}`);
      console.log(`  - Settings: ${firstTenant.settings ? 'Presente' : '❌ NULL'}`);
      console.log(`  - Limits: ${firstTenant.limits ? 'Presente' : '❌ NULL'}`);
    }

    // 6. Resumo
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO');
    console.log('='.repeat(80));
    console.log(`✅ Brenda existe: ${brenda.rows.length > 0}`);
    console.log(`✅ Tem institution_id: ${!!brendaData.institution_id}`);
    console.log(`✅ Instituição existe: ${inst.rows.length > 0}`);
    console.log(`✅ Tenants da instituição: ${tenants.rows.length}`);
    console.log(`✅ Tenants têm institution_id: ${tenants.rows.every(t => t.institution_id)}`);
    console.log(`✅ Tenants têm settings: ${tenants.rows.every(t => t.settings)}`);
    console.log(`✅ Tenants têm limits: ${tenants.rows.every(t => t.limits)}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await localPool.end();
  }
}

testLocalBrenda()
  .then(() => {
    console.log('\n✅ Teste concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error.message);
    process.exit(1);
  });
