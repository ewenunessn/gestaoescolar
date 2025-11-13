const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixBrendaTenantAssociation() {
  const client = await neonPool.connect();
  
  try {
    console.log('🔧 Criando associação tenant_users para Brenda...\n');

    // 1. Buscar Brenda
    const brenda = await client.query(`
      SELECT id, nome, institution_id FROM usuarios WHERE email = 'ewertonsolon@gmail.com'
    `);

    if (brenda.rows.length === 0) {
      console.log('❌ Brenda não encontrada');
      return;
    }

    const brendaData = brenda.rows[0];
    console.log('✅ Brenda encontrada:', brendaData.nome);
    console.log('   Institution ID:', brendaData.institution_id);

    // 2. Buscar tenants da instituição
    const tenants = await client.query(`
      SELECT id, name, slug FROM tenants WHERE institution_id = $1
    `, [brendaData.institution_id]);

    console.log(`\n📋 Tenants da instituição: ${tenants.rows.length}`);

    if (tenants.rows.length === 0) {
      console.log('❌ Nenhum tenant encontrado para esta instituição');
      return;
    }

    // 3. Criar associações
    for (const tenant of tenants.rows) {
      console.log(`\n➕ Criando associação com tenant: ${tenant.name}`);
      
      try {
        await client.query(`
          INSERT INTO tenant_users (tenant_id, user_id, role, status)
          VALUES ($1, $2, 'tenant_admin', 'active')
          ON CONFLICT (tenant_id, user_id) DO UPDATE
          SET role = 'tenant_admin', status = 'active'
        `, [tenant.id, brendaData.id]);
        
        console.log('   ✅ Associação criada/atualizada');
      } catch (e) {
        console.log('   ⚠️  Erro:', e.message);
      }
    }

    // 4. Verificar associações finais
    console.log('\n📊 Verificando associações finais...');
    const finalAssoc = await client.query(`
      SELECT tu.*, t.name as tenant_name
      FROM tenant_users tu
      LEFT JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.user_id = $1
    `, [brendaData.id]);

    console.log(`\n✅ Total de associações: ${finalAssoc.rows.length}`);
    finalAssoc.rows.forEach(assoc => {
      console.log(`  • ${assoc.tenant_name}`);
      console.log(`    Role: ${assoc.role}`);
      console.log(`    Status: ${assoc.status}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await neonPool.end();
  }
}

fixBrendaTenantAssociation()
  .then(() => {
    console.log('\n✅ Correção concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Correção falhou:', error.message);
    process.exit(1);
  });
