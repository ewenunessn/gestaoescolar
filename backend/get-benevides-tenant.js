const db = require('./dist/database');

async function getTenant() {
  try {
    const result = await db.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE slug = 'benevides' OR name ILIKE '%benevides%'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tenant Benevides encontrado:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      const tenantId = result.rows[0].id;
      
      // Atualizar fornecedores
      console.log('\n🔧 Atualizando fornecedores para Benevides...');
      const fornecedores = await db.query(`
        UPDATE fornecedores
        SET tenant_id = $1
        RETURNING id, nome
      `, [tenantId]);
      console.log(`✅ ${fornecedores.rows.length} fornecedores atualizados`);
      
      // Atualizar contratos
      console.log('\n🔧 Atualizando contratos para Benevides...');
      const contratos = await db.query(`
        UPDATE contratos
        SET tenant_id = $1
        RETURNING id, numero
      `, [tenantId]);
      console.log(`✅ ${contratos.rows.length} contratos atualizados`);
      
      // Atualizar produtos
      console.log('\n🔧 Atualizando produtos para Benevides...');
      const produtos = await db.query(`
        UPDATE produtos
        SET tenant_id = $1
        RETURNING id, nome
      `, [tenantId]);
      console.log(`✅ ${produtos.rows.length} produtos atualizados`);
      
      console.log('\n✅ Tudo atualizado para o tenant Benevides!');
      console.log(`\n📋 Use este tenant ID: ${tenantId}`);
    } else {
      console.log('❌ Tenant Benevides não encontrado');
      
      // Listar todos os tenants
      const allTenants = await db.query('SELECT id, name, slug FROM tenants');
      console.log('\n📋 Tenants disponíveis:');
      allTenants.rows.forEach(t => {
        console.log(`  - ${t.name} (${t.slug}) - ID: ${t.id}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

getTenant();
