const db = require('./dist/database');

async function migrateToEscolaTeste() {
  try {
    // Buscar tenant Escola de Teste
    const tenantResult = await db.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE slug = 'escola-teste' OR name ILIKE '%escola%teste%'
    `);
    
    if (tenantResult.rows.length === 0) {
      console.log('❌ Tenant "Escola de Teste" não encontrado');
      
      // Listar todos os tenants
      const allTenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY name');
      console.log('\n📋 Tenants disponíveis:');
      allTenants.rows.forEach(t => {
        console.log(`  - ${t.name} (${t.slug}) - ID: ${t.id}`);
      });
      process.exit(1);
    }
    
    const tenantId = tenantResult.rows[0].id;
    console.log('✅ Tenant encontrado:', tenantResult.rows[0].name);
    console.log('📋 ID:', tenantId);
    
    // Atualizar fornecedores
    console.log('\n🔧 Migrando fornecedores...');
    const fornecedores = await db.query(`
      UPDATE fornecedores
      SET tenant_id = $1
      RETURNING id, nome
    `, [tenantId]);
    console.log(`✅ ${fornecedores.rows.length} fornecedores migrados`);
    fornecedores.rows.forEach(f => console.log(`  - ${f.nome}`));
    
    // Atualizar contratos
    console.log('\n🔧 Migrando contratos...');
    const contratos = await db.query(`
      UPDATE contratos
      SET tenant_id = $1
      RETURNING id, numero
    `, [tenantId]);
    console.log(`✅ ${contratos.rows.length} contratos migrados`);
    contratos.rows.forEach(c => console.log(`  - Contrato ${c.numero}`));
    
    // Atualizar produtos
    console.log('\n🔧 Migrando produtos...');
    const produtos = await db.query(`
      UPDATE produtos
      SET tenant_id = $1
      RETURNING id, nome
    `, [tenantId]);
    console.log(`✅ ${produtos.rows.length} produtos migrados`);
    
    // Atualizar contrato_produtos
    console.log('\n🔧 Verificando contrato_produtos...');
    const contratoProdutos = await db.query(`
      SELECT COUNT(*) as total FROM contrato_produtos
    `);
    console.log(`📊 Total de contrato_produtos: ${contratoProdutos.rows[0].total}`);
    
    console.log('\n✅ Migração concluída para Escola de Teste!');
    console.log(`\n📋 Tenant ID: ${tenantId}`);
    console.log('📋 Nome: Escola de Teste');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

migrateToEscolaTeste();
