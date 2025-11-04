/**
 * Script para manter apenas o tenant "Escola de Teste" e remover os outros
 */

const db = require('./dist/database');

const TENANT_TO_KEEP = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f'; // Escola de Teste

async function cleanupTenants() {
  try {
    console.log('🧹 Limpando tenants - mantendo apenas "Escola de Teste"...\n');

    // Primeiro, listar todos os tenants
    const allTenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY name');
    console.log('📋 Tenants encontrados:');
    allTenants.rows.forEach(tenant => {
      const isKeeping = tenant.id === TENANT_TO_KEEP;
      console.log(`   ${isKeeping ? '✅ MANTER' : '❌ REMOVER'} - ${tenant.name} (${tenant.slug})`);
    });
    console.log('');

    // Obter lista de tenants para remover
    const tenantsToRemove = allTenants.rows.filter(tenant => tenant.id !== TENANT_TO_KEEP);
    
    if (tenantsToRemove.length === 0) {
      console.log('✅ Nenhum tenant para remover!');
      return;
    }

    console.log(`🗑️  Removendo ${tenantsToRemove.length} tenants...\n`);

    for (const tenant of tenantsToRemove) {
      console.log(`🏢 Removendo tenant: ${tenant.name}...`);

      try {
        // 1. Remover dados relacionados ao tenant
        console.log('   📋 Removendo modalidades...');
        const modalidadesResult = await db.query('DELETE FROM modalidades WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${modalidadesResult.rowCount || 0} modalidades removidas`);

        console.log('   🏫 Removendo escolas...');
        const escolasResult = await db.query('DELETE FROM escolas WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${escolasResult.rowCount || 0} escolas removidas`);

        console.log('   📦 Removendo produtos...');
        const produtosResult = await db.query('DELETE FROM produtos WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${produtosResult.rowCount || 0} produtos removidos`);

        console.log('   🍽️  Removendo refeições...');
        const refeicoesResult = await db.query('DELETE FROM refeicoes WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${refeicoesResult.rowCount || 0} refeições removidas`);

        console.log('   🏭 Removendo fornecedores...');
        const fornecedoresResult = await db.query('DELETE FROM fornecedores WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${fornecedoresResult.rowCount || 0} fornecedores removidos`);

        console.log('   📄 Removendo contratos...');
        const contratosResult = await db.query('DELETE FROM contratos WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${contratosResult.rowCount || 0} contratos removidos`);

        console.log('   📅 Removendo cardápios...');
        const cardapiosResult = await db.query('DELETE FROM cardapios WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${cardapiosResult.rowCount || 0} cardápios removidos`);

        // 2. Remover usuários associados ao tenant
        console.log('   👥 Removendo associações de usuários...');
        const tenantUsersResult = await db.query('DELETE FROM tenant_users WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${tenantUsersResult.rowCount || 0} associações removidas`);

        // 3. Finalmente, remover o tenant
        console.log('   🏢 Removendo tenant...');
        const tenantResult = await db.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
        console.log(`      ✅ Tenant removido`);

        console.log(`   🎉 ${tenant.name} removido com sucesso!\n`);

      } catch (error) {
        console.error(`   ❌ Erro ao remover ${tenant.name}:`, error.message);
      }
    }

    // Verificar resultado final
    console.log('🔍 Verificando resultado final...');
    const remainingTenants = await db.query('SELECT id, name, slug FROM tenants ORDER BY name');
    console.log(`📊 Tenants restantes: ${remainingTenants.rows.length}`);
    remainingTenants.rows.forEach(tenant => {
      console.log(`   ✅ ${tenant.name} (${tenant.slug})`);
    });

    // Verificar dados do tenant mantido
    console.log('\n📊 Dados do tenant mantido:');
    const modalidades = await db.query('SELECT COUNT(*) as count FROM modalidades WHERE tenant_id = $1', [TENANT_TO_KEEP]);
    const escolas = await db.query('SELECT COUNT(*) as count FROM escolas WHERE tenant_id = $1', [TENANT_TO_KEEP]);
    const produtos = await db.query('SELECT COUNT(*) as count FROM produtos WHERE tenant_id = $1', [TENANT_TO_KEEP]);
    
    console.log(`   📋 Modalidades: ${modalidades.rows[0].count}`);
    console.log(`   🏫 Escolas: ${escolas.rows[0].count}`);
    console.log(`   📦 Produtos: ${produtos.rows[0].count}`);

    console.log('\n🎉 Limpeza concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  } finally {
    process.exit(0);
  }
}

cleanupTenants();