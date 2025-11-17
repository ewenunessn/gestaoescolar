const db = require('./dist/database');

async function fixTenantIds() {
  try {
    const tenantId = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    
    console.log('🔧 Atualizando fornecedores...\n');
    
    const fornecedoresResult = await db.query(`
      UPDATE fornecedores
      SET tenant_id = $1
      WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'
      RETURNING id, nome
    `, [tenantId]);
    
    console.log(`✅ ${fornecedoresResult.rows.length} fornecedores atualizados:`);
    fornecedoresResult.rows.forEach(f => console.log(`  - ${f.nome}`));
    
    console.log('\n🔧 Atualizando contratos...\n');
    
    const contratosResult = await db.query(`
      UPDATE contratos
      SET tenant_id = $1
      WHERE tenant_id IS NULL
      RETURNING id, numero
    `, [tenantId]);
    
    console.log(`✅ ${contratosResult.rows.length} contratos atualizados:`);
    contratosResult.rows.forEach(c => console.log(`  - Contrato ${c.numero}`));
    
    console.log('\n✅ Atualização concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixTenantIds();
