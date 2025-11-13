const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function debugBrendaTenants() {
  const client = await neonPool.connect();
  
  try {
    console.log('🔍 DEBUG - Brenda e Tenants\n');
    console.log('='.repeat(80));

    // 1. Dados da Brenda
    console.log('\n1️⃣ DADOS DA BRENDA');
    console.log('-'.repeat(80));
    const brenda = await client.query(`
      SELECT id, nome, email, tipo, institution_id, tenant_id, ativo
      FROM usuarios 
      WHERE email = 'ewertonsolon@gmail.com'
    `);

    if (brenda.rows.length === 0) {
      console.log('❌ Brenda não encontrada!');
      return;
    }

    console.log('📊 Usuária:');
    console.log(JSON.stringify(brenda.rows[0], null, 2));

    const brendaData = brenda.rows[0];

    // 2. Instituição da Brenda
    console.log('\n2️⃣ INSTITUIÇÃO DA BRENDA');
    console.log('-'.repeat(80));
    if (brendaData.institution_id) {
      const inst = await client.query(`
        SELECT id, name, slug, status
        FROM institutions 
        WHERE id = $1
      `, [brendaData.institution_id]);

      if (inst.rows.length > 0) {
        console.log('✅ Instituição encontrada:');
        console.log(JSON.stringify(inst.rows[0], null, 2));
      } else {
        console.log('❌ Instituição NÃO encontrada no banco!');
      }
    } else {
      console.log('❌ Brenda NÃO tem institution_id!');
    }

    // 3. Tenants da Instituição
    console.log('\n3️⃣ TENANTS DA INSTITUIÇÃO');
    console.log('-'.repeat(80));
    if (brendaData.institution_id) {
      const tenants = await client.query(`
        SELECT id, name, slug, institution_id, status
        FROM tenants 
        WHERE institution_id = $1
      `, [brendaData.institution_id]);

      console.log(`📊 Tenants encontrados: ${tenants.rows.length}`);
      if (tenants.rows.length > 0) {
        tenants.rows.forEach(t => {
          console.log(`\n  • ${t.name} (${t.slug})`);
          console.log(`    ID: ${t.id}`);
          console.log(`    Institution ID: ${t.institution_id}`);
          console.log(`    Status: ${t.status}`);
        });
      } else {
        console.log('❌ NENHUM tenant encontrado para esta instituição!');
        console.log('   Institution ID:', brendaData.institution_id);
      }
    }

    // 4. TODOS os tenants (para comparação)
    console.log('\n4️⃣ TODOS OS TENANTS NO BANCO');
    console.log('-'.repeat(80));
    const allTenants = await client.query(`
      SELECT id, name, slug, institution_id, status
      FROM tenants 
      ORDER BY created_at DESC
    `);

    console.log(`📊 Total de tenants: ${allTenants.rows.length}`);
    allTenants.rows.forEach(t => {
      console.log(`\n  • ${t.name} (${t.slug})`);
      console.log(`    ID: ${t.id}`);
      console.log(`    Institution ID: ${t.institution_id || '❌ NULL'}`);
      console.log(`    Status: ${t.status}`);
    });

    // 5. Associações tenant_users
    console.log('\n5️⃣ ASSOCIAÇÕES TENANT_USERS DA BRENDA');
    console.log('-'.repeat(80));
    const tenantUsers = await client.query(`
      SELECT tu.*, t.name as tenant_name, t.slug as tenant_slug
      FROM tenant_users tu
      LEFT JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.user_id = $1
    `, [brendaData.id]);

    console.log(`📊 Associações encontradas: ${tenantUsers.rows.length}`);
    if (tenantUsers.rows.length > 0) {
      tenantUsers.rows.forEach(tu => {
        console.log(`\n  • Tenant: ${tu.tenant_name} (${tu.tenant_slug})`);
        console.log(`    Role: ${tu.role}`);
        console.log(`    Status: ${tu.status}`);
      });
    } else {
      console.log('❌ Brenda NÃO tem associações em tenant_users!');
    }

    // 6. Associações institution_users
    console.log('\n6️⃣ ASSOCIAÇÕES INSTITUTION_USERS DA BRENDA');
    console.log('-'.repeat(80));
    const instUsers = await client.query(`
      SELECT iu.*, i.name as institution_name
      FROM institution_users iu
      LEFT JOIN institutions i ON i.id = iu.institution_id
      WHERE iu.user_id = $1
    `, [brendaData.id]);

    console.log(`📊 Associações encontradas: ${instUsers.rows.length}`);
    if (instUsers.rows.length > 0) {
      instUsers.rows.forEach(iu => {
        console.log(`\n  • Institution: ${iu.institution_name}`);
        console.log(`    Role: ${iu.role}`);
        console.log(`    Status: ${iu.status}`);
      });
    } else {
      console.log('❌ Brenda NÃO tem associações em institution_users!');
    }

    // 7. DIAGNÓSTICO
    console.log('\n' + '='.repeat(80));
    console.log('📋 DIAGNÓSTICO');
    console.log('='.repeat(80));

    const issues = [];
    
    if (!brendaData.institution_id) {
      issues.push('❌ Brenda não tem institution_id');
    }
    
    if (brendaData.institution_id) {
      const tenantsCount = await client.query(`
        SELECT COUNT(*) as count FROM tenants WHERE institution_id = $1
      `, [brendaData.institution_id]);
      
      if (parseInt(tenantsCount.rows[0].count) === 0) {
        issues.push('❌ Instituição da Brenda não tem nenhum tenant associado');
      }
    }

    if (tenantUsers.rows.length === 0) {
      issues.push('⚠️  Brenda não tem associações em tenant_users');
    }

    if (instUsers.rows.length === 0) {
      issues.push('⚠️  Brenda não tem associações em institution_users');
    }

    if (issues.length > 0) {
      console.log('\n🔴 PROBLEMAS ENCONTRADOS:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ Tudo parece estar correto!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await neonPool.end();
  }
}

debugBrendaTenants()
  .then(() => {
    console.log('\n✅ Debug concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug falhou:', error.message);
    process.exit(1);
  });
