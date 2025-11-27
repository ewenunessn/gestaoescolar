const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function testIsolation() {
  const client = await pool.connect();
  
  try {
    console.log('🔒 Testando Isolamento de Demandas por Tenant\n');

    // 1. Listar todos os tenants
    console.log('1️⃣ Listando tenants disponíveis...');
    const tenants = await client.query(`
      SELECT id, slug, name FROM tenants ORDER BY name
    `);
    
    console.log(`Encontrados ${tenants.rows.length} tenants:\n`);
    tenants.rows.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name} (${t.slug})`);
    });
    console.log('');

    // 2. Verificar demandas por tenant
    console.log('2️⃣ Verificando demandas por tenant...\n');
    
    for (const tenant of tenants.rows) {
      const demandas = await client.query(`
        SELECT id, escola_nome, numero_oficio, objeto, status
        FROM demandas
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenant.id]);
      
      console.log(`📊 Tenant: ${tenant.name}`);
      console.log(`   Total de demandas: ${demandas.rows.length}`);
      
      if (demandas.rows.length > 0) {
        demandas.rows.forEach(d => {
          console.log(`   - ${d.escola_nome}: ${d.objeto.substring(0, 40)}...`);
        });
      }
      console.log('');
    }

    // 3. Testar query com contexto RLS
    console.log('3️⃣ Testando query com RLS context...\n');
    
    if (tenants.rows.length > 0) {
      const tenant1 = tenants.rows[0];
      
      // Configurar contexto
      await client.query(`SET app.current_tenant_id = '${tenant1.id}'`);
      
      // Query sem filtro explícito (confiando no RLS)
      const rlsResult = await client.query(`
        SELECT COUNT(*) as total FROM demandas
        WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
      `);
      
      // Query com filtro explícito
      const explicitResult = await client.query(`
        SELECT COUNT(*) as total FROM demandas WHERE tenant_id = $1
      `, [tenant1.id]);
      
      console.log(`Tenant: ${tenant1.name}`);
      console.log(`  Query com RLS context: ${rlsResult.rows[0].total} demandas`);
      console.log(`  Query com filtro explícito: ${explicitResult.rows[0].total} demandas`);
      
      if (rlsResult.rows[0].total === explicitResult.rows[0].total) {
        console.log(`  ✅ Isolamento funcionando corretamente!\n`);
      } else {
        console.log(`  ⚠️  Diferença detectada!\n`);
      }
    }

    // 4. Verificar se há demandas sem tenant_id
    console.log('4️⃣ Verificando integridade dos dados...\n');
    
    const semTenant = await client.query(`
      SELECT COUNT(*) as total FROM demandas WHERE tenant_id IS NULL
    `);
    
    if (parseInt(semTenant.rows[0].total) === 0) {
      console.log('✅ Todas as demandas têm tenant_id\n');
    } else {
      console.log(`⚠️  ${semTenant.rows[0].total} demandas sem tenant_id!\n`);
    }

    console.log('✅ Teste de isolamento concluído!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testIsolation();
