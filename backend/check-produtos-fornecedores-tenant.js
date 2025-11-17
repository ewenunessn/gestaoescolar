const db = require('./dist/database');

async function checkProdutosFornecedores() {
  try {
    const tenantId = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    
    console.log('🔍 Verificando produtos...\n');
    
    // Produtos com tenant
    const produtosComTenant = await db.query(`
      SELECT COUNT(*) as total
      FROM produtos
      WHERE tenant_id = $1
    `, [tenantId]);
    console.log('✅ Produtos com tenant:', produtosComTenant.rows[0].total);
    
    // Produtos sem tenant
    const produtosSemTenant = await db.query(`
      SELECT COUNT(*) as total
      FROM produtos
      WHERE tenant_id IS NULL
    `);
    console.log('⚠️  Produtos SEM tenant:', produtosSemTenant.rows[0].total);
    
    // Total de produtos
    const totalProdutos = await db.query(`SELECT COUNT(*) as total FROM produtos`);
    console.log('📊 Total de produtos:', totalProdutos.rows[0].total);
    
    console.log('\n🔍 Verificando fornecedores...\n');
    
    // Fornecedores com tenant
    const fornecedoresComTenant = await db.query(`
      SELECT COUNT(*) as total
      FROM fornecedores
      WHERE tenant_id = $1
    `, [tenantId]);
    console.log('✅ Fornecedores com tenant:', fornecedoresComTenant.rows[0].total);
    
    // Fornecedores sem tenant
    const fornecedoresSemTenant = await db.query(`
      SELECT COUNT(*) as total
      FROM fornecedores
      WHERE tenant_id IS NULL
    `);
    console.log('⚠️  Fornecedores SEM tenant:', fornecedoresSemTenant.rows[0].total);
    
    // Total de fornecedores
    const totalFornecedores = await db.query(`SELECT COUNT(*) as total FROM fornecedores`);
    console.log('📊 Total de fornecedores:', totalFornecedores.rows[0].total);
    
    console.log('\n🔍 Verificando contratos...\n');
    
    // Contratos com tenant
    const contratosComTenant = await db.query(`
      SELECT COUNT(*) as total
      FROM contratos
      WHERE tenant_id = $1
    `, [tenantId]);
    console.log('✅ Contratos com tenant:', contratosComTenant.rows[0].total);
    
    // Contratos sem tenant
    const contratosSemTenant = await db.query(`
      SELECT COUNT(*) as total
      FROM contratos
      WHERE tenant_id IS NULL
    `);
    console.log('⚠️  Contratos SEM tenant:', contratosSemTenant.rows[0].total);
    
    // Total de contratos
    const totalContratos = await db.query(`SELECT COUNT(*) as total FROM contratos`);
    console.log('📊 Total de contratos:', totalContratos.rows[0].total);
    
    // Listar alguns produtos para ver
    console.log('\n📋 Primeiros 5 produtos:\n');
    const produtos = await db.query(`
      SELECT id, nome, tenant_id
      FROM produtos
      LIMIT 5
    `);
    produtos.rows.forEach(p => {
      console.log(`  - ${p.nome} (tenant: ${p.tenant_id || 'NULL'})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

checkProdutosFornecedores();
