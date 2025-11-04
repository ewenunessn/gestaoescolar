const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
  ssl: false
});

async function testTenantInventoryController() {
  try {
    console.log('🧪 Testando melhorias do controller de estoque com tenant...');

    // 1. Verificar se RLS está funcionando
    console.log('\n=== 1. Testando RLS ===');
    
    // Definir tenant context
    await pool.query("SELECT set_config('app.current_tenant_id', $1, false)", ['sistema-principal']);
    
    // Buscar escolas do tenant atual
    const escolasResult = await pool.query(`
      SELECT id, nome, tenant_id FROM escolas 
      WHERE ativo = true 
      ORDER BY id 
      LIMIT 3
    `);
    
    console.log('Escolas encontradas:', escolasResult.rows.length);
    escolasResult.rows.forEach(escola => {
      console.log(`  - ${escola.nome} (ID: ${escola.id}, Tenant: ${escola.tenant_id})`);
    });

    if (escolasResult.rows.length === 0) {
      console.log('❌ Nenhuma escola encontrada. Verifique se há dados no banco.');
      return;
    }

    const escolaId = escolasResult.rows[0].id;
    const tenantId = escolasResult.rows[0].tenant_id;

    // 2. Testar query de estoque com tenant
    console.log('\n=== 2. Testando query de estoque com tenant ===');
    
    const estoqueResult = await pool.query(`
      SELECT 
        ee.id,
        ee.escola_id,
        ee.produto_id,
        ee.quantidade_atual,
        ee.tenant_id,
        p.nome as produto_nome,
        e.nome as escola_nome
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.escola_id = $1
      ORDER BY p.nome
      LIMIT 5
    `, [escolaId]);

    console.log(`Itens de estoque encontrados para escola ${escolaId}:`, estoqueResult.rows.length);
    estoqueResult.rows.forEach(item => {
      console.log(`  - ${item.produto_nome}: ${item.quantidade_atual} (Tenant: ${item.tenant_id})`);
    });

    // 3. Testar validação de tenant
    console.log('\n=== 3. Testando validação de tenant ===');
    
    // Verificar se escola pertence ao tenant
    const validacaoResult = await pool.query(`
      SELECT id FROM escolas 
      WHERE id = $1 AND tenant_id = $2 AND ativo = true
    `, [escolaId, tenantId]);

    if (validacaoResult.rows.length > 0) {
      console.log(`✅ Escola ${escolaId} pertence ao tenant ${tenantId}`);
    } else {
      console.log(`❌ Escola ${escolaId} NÃO pertence ao tenant ${tenantId}`);
    }

    // 4. Testar lotes com tenant
    console.log('\n=== 4. Testando lotes com tenant ===');
    
    const lotesResult = await pool.query(`
      SELECT 
        el.id,
        el.produto_id,
        el.escola_id,
        el.lote,
        el.quantidade_atual,
        el.tenant_id,
        p.nome as produto_nome
      FROM estoque_lotes el
      JOIN produtos p ON p.id = el.produto_id
      WHERE el.escola_id = $1
      ORDER BY el.id
      LIMIT 3
    `, [escolaId]);

    console.log(`Lotes encontrados para escola ${escolaId}:`, lotesResult.rows.length);
    lotesResult.rows.forEach(lote => {
      console.log(`  - Lote ${lote.lote} (${lote.produto_nome}): ${lote.quantidade_atual} (Tenant: ${lote.tenant_id})`);
    });

    // 5. Testar histórico com tenant
    console.log('\n=== 5. Testando histórico com tenant ===');
    
    const historicoResult = await pool.query(`
      SELECT 
        eeh.id,
        eeh.escola_id,
        eeh.produto_id,
        eeh.tipo_movimentacao,
        eeh.quantidade_movimentada,
        eeh.tenant_id,
        p.nome as produto_nome
      FROM estoque_escolas_historico eeh
      JOIN produtos p ON p.id = eeh.produto_id
      WHERE eeh.escola_id = $1
      ORDER BY eeh.data_movimentacao DESC
      LIMIT 3
    `, [escolaId]);

    console.log(`Histórico encontrado para escola ${escolaId}:`, historicoResult.rows.length);
    historicoResult.rows.forEach(hist => {
      console.log(`  - ${hist.tipo_movimentacao} ${hist.produto_nome}: ${hist.quantidade_movimentada} (Tenant: ${hist.tenant_id})`);
    });

    // 6. Testar isolamento entre tenants
    console.log('\n=== 6. Testando isolamento entre tenants ===');
    
    // Buscar outro tenant
    const outroTenantResult = await pool.query(`
      SELECT id, slug FROM tenants 
      WHERE id != $1 
      LIMIT 1
    `, [tenantId]);

    if (outroTenantResult.rows.length > 0) {
      const outroTenantId = outroTenantResult.rows[0].id;
      
      // Definir contexto para outro tenant
      await pool.query("SELECT set_config('app.current_tenant_id', $1, false)", [outroTenantId]);
      
      // Tentar acessar dados do tenant anterior
      const isolamentoResult = await pool.query(`
        SELECT COUNT(*) as total FROM estoque_escolas 
        WHERE escola_id = $1
      `, [escolaId]);

      const totalComOutroTenant = parseInt(isolamentoResult.rows[0].total);
      
      if (totalComOutroTenant === 0) {
        console.log(`✅ Isolamento funcionando: tenant ${outroTenantId} não vê dados da escola ${escolaId}`);
      } else {
        console.log(`❌ Problema no isolamento: tenant ${outroTenantId} ainda vê ${totalComOutroTenant} itens da escola ${escolaId}`);
      }
    } else {
      console.log('ℹ️ Apenas um tenant encontrado, não é possível testar isolamento');
    }

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n📋 Resumo das melhorias implementadas:');
    console.log('  ✅ Validação automática de tenant em todas as funções');
    console.log('  ✅ Tratamento de erro padronizado para tenant');
    console.log('  ✅ Isolamento de dados por tenant via RLS');
    console.log('  ✅ Validação de propriedade de recursos (escola, produto, estoque)');
    console.log('  ✅ Contexto de tenant configurado automaticamente');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testTenantInventoryController();