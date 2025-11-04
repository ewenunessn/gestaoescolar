/**
 * Script seguro para manter apenas o tenant "Escola de Teste" e remover os outros
 * Remove dependências na ordem correta para evitar violações de chave estrangeira
 */

const db = require('./dist/database');

const TENANT_TO_KEEP = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f'; // Escola de Teste

async function cleanupTenantsSafe() {
  try {
    console.log('🧹 Limpeza segura de tenants - mantendo apenas "Escola de Teste"...\n');

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
        // Ordem correta para evitar violações de FK:
        // 1. Remover dados dependentes primeiro
        
        console.log('   📋 Removendo escola_modalidades...');
        const escolaModalidadesResult = await db.query(`
          DELETE FROM escola_modalidades 
          WHERE escola_id IN (SELECT id FROM escolas WHERE tenant_id = $1)
        `, [tenant.id]);
        console.log(`      ✅ ${escolaModalidadesResult.rowCount || 0} associações escola-modalidade removidas`);

        console.log('   📦 Removendo produto_modalidades...');
        const produtoModalidadesResult = await db.query(`
          DELETE FROM produto_modalidades 
          WHERE produto_id IN (SELECT id FROM produtos WHERE tenant_id = $1)
        `, [tenant.id]);
        console.log(`      ✅ ${produtoModalidadesResult.rowCount || 0} associações produto-modalidade removidas`);

        console.log('   🍽️  Removendo refeicao_produtos...');
        const refeicaoProdutosResult = await db.query(`
          DELETE FROM refeicao_produtos 
          WHERE refeicao_id IN (SELECT id FROM refeicoes WHERE tenant_id = $1)
        `, [tenant.id]);
        console.log(`      ✅ ${refeicaoProdutosResult.rowCount || 0} associações refeição-produto removidas`);

        console.log('   📅 Removendo cardapio_refeicoes...');
        const cardapioRefeicoesResult = await db.query(`
          DELETE FROM cardapio_refeicoes 
          WHERE cardapio_id IN (SELECT id FROM cardapios WHERE tenant_id = $1)
        `, [tenant.id]);
        console.log(`      ✅ ${cardapioRefeicoesResult.rowCount || 0} associações cardápio-refeição removidas`);

        console.log('   📄 Removendo contrato_produtos...');
        const contratoProdutosResult = await db.query(`
          DELETE FROM contrato_produtos 
          WHERE contrato_id IN (SELECT id FROM contratos WHERE tenant_id = $1)
        `, [tenant.id]);
        console.log(`      ✅ ${contratoProdutosResult.rowCount || 0} produtos de contrato removidos`);

        console.log('   📊 Removendo pedidos...');
        const pedidosResult = await db.query('DELETE FROM pedidos WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${pedidosResult.rowCount || 0} pedidos removidos`);

        console.log('   📄 Removendo contratos...');
        const contratosResult = await db.query('DELETE FROM contratos WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${contratosResult.rowCount || 0} contratos removidos`);

        console.log('   🏭 Removendo fornecedores...');
        const fornecedoresResult = await db.query('DELETE FROM fornecedores WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${fornecedoresResult.rowCount || 0} fornecedores removidos`);

        console.log('   📅 Removendo cardápios...');
        const cardapiosResult = await db.query('DELETE FROM cardapios WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${cardapiosResult.rowCount || 0} cardápios removidos`);

        console.log('   🍽️  Removendo refeições...');
        const refeicoesResult = await db.query('DELETE FROM refeicoes WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${refeicoesResult.rowCount || 0} refeições removidas`);

        console.log('   📦 Removendo produtos...');
        const produtosResult = await db.query('DELETE FROM produtos WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${produtosResult.rowCount || 0} produtos removidos`);

        console.log('   📋 Removendo modalidades...');
        const modalidadesResult = await db.query('DELETE FROM modalidades WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${modalidadesResult.rowCount || 0} modalidades removidas`);

        console.log('   🏫 Removendo escolas...');
        const escolasResult = await db.query('DELETE FROM escolas WHERE tenant_id = $1', [tenant.id]);
        console.log(`      ✅ ${escolasResult.rowCount || 0} escolas removidas`);

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
        console.log('   ⚠️  Continuando com próximo tenant...\n');
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
    console.log('\n📊 Dados do tenant "Escola de Teste":');
    const modalidades = await db.query('SELECT COUNT(*) as count FROM modalidades WHERE tenant_id = $1', [TENANT_TO_KEEP]);
    const escolas = await db.query('SELECT COUNT(*) as count FROM escolas WHERE tenant_id = $1', [TENANT_TO_KEEP]);
    const produtos = await db.query('SELECT COUNT(*) as count FROM produtos WHERE tenant_id = $1', [TENANT_TO_KEEP]);
    
    console.log(`   📋 Modalidades: ${modalidades.rows[0].count}`);
    console.log(`   🏫 Escolas: ${escolas.rows[0].count}`);
    console.log(`   📦 Produtos: ${produtos.rows[0].count}`);

    console.log('\n🎉 Limpeza concluída com sucesso!');
    console.log('✅ Agora você tem apenas o tenant "Escola de Teste" com isolamento completo!');

  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  } finally {
    process.exit(0);
  }
}

cleanupTenantsSafe();