/**
 * Debug para verificar a distribuição exata dos dados por tenant
 */

const db = process.env.VERCEL === '1' ? require("./src/database-vercel") : require("./database");

async function debugTenantDataDistribution() {
  console.log('🔍 Analisando distribuição de dados por tenant...\n');

  try {
    // 1. Verificar tenants
    const tenants = await db.query('SELECT id, slug, name FROM tenants ORDER BY name');
    console.log('📋 Tenants disponíveis:');
    tenants.rows.forEach(t => {
      console.log(`  - ${t.name} (${t.slug}) - ID: ${t.id}`);
    });

    // 2. Verificar produtos por tenant
    console.log('\n📦 Produtos por tenant:');
    const produtos = await db.query(`
      SELECT 
        tenant_id,
        COUNT(*) as total,
        STRING_AGG(nome, ', ' ORDER BY nome) as produtos
      FROM produtos 
      WHERE ativo = true
      GROUP BY tenant_id
      ORDER BY tenant_id
    `);
    
    produtos.rows.forEach(row => {
      const tenant = tenants.rows.find(t => t.id === row.tenant_id);
      console.log(`  Tenant: ${tenant ? tenant.name : 'NULL'} (${row.tenant_id || 'NULL'})`);
      console.log(`    Total: ${row.total}`);
      console.log(`    Produtos: ${row.produtos.substring(0, 100)}${row.produtos.length > 100 ? '...' : ''}`);
    });

    // 3. Verificar escolas por tenant
    console.log('\n🏫 Escolas por tenant:');
    const escolas = await db.query(`
      SELECT 
        tenant_id,
        COUNT(*) as total,
        STRING_AGG(nome, ', ' ORDER BY nome LIMIT 5) as escolas_sample
      FROM escolas 
      WHERE ativo = true
      GROUP BY tenant_id
      ORDER BY tenant_id
    `);
    
    escolas.rows.forEach(row => {
      const tenant = tenants.rows.find(t => t.id === row.tenant_id);
      console.log(`  Tenant: ${tenant ? tenant.name : 'NULL'} (${row.tenant_id || 'NULL'})`);
      console.log(`    Total: ${row.total}`);
      console.log(`    Amostra: ${row.escolas_sample}`);
    });

    // 4. Verificar estoque_escolas por tenant
    console.log('\n📊 Estoque por tenant:');
    const estoque = await db.query(`
      SELECT 
        ee.tenant_id,
        COUNT(*) as total_registros,
        SUM(ee.quantidade_atual) as quantidade_total,
        COUNT(DISTINCT ee.produto_id) as produtos_distintos,
        COUNT(DISTINCT ee.escola_id) as escolas_distintas
      FROM estoque_escolas ee
      GROUP BY ee.tenant_id
      ORDER BY ee.tenant_id
    `);
    
    estoque.rows.forEach(row => {
      const tenant = tenants.rows.find(t => t.id === row.tenant_id);
      console.log(`  Tenant: ${tenant ? tenant.name : 'NULL'} (${row.tenant_id || 'NULL'})`);
      console.log(`    Registros: ${row.total_registros}`);
      console.log(`    Quantidade total: ${row.quantidade_total}`);
      console.log(`    Produtos distintos: ${row.produtos_distintos}`);
      console.log(`    Escolas distintas: ${row.escolas_distintas}`);
    });

    // 5. Verificar compatibilidade entre produtos e estoque
    console.log('\n🔗 Compatibilidade produtos x estoque:');
    
    for (const tenant of tenants.rows) {
      console.log(`\n  Tenant: ${tenant.name} (${tenant.id})`);
      
      // Produtos do tenant
      const produtosTenant = await db.query(`
        SELECT COUNT(*) as total FROM produtos 
        WHERE (tenant_id = $1 OR tenant_id IS NULL) AND ativo = true
      `, [tenant.id]);
      
      // Escolas do tenant
      const escolasTenant = await db.query(`
        SELECT COUNT(*) as total FROM escolas 
        WHERE (tenant_id = $1 OR tenant_id IS NULL) AND ativo = true
      `, [tenant.id]);
      
      // Estoque do tenant
      const estoqueTenant = await db.query(`
        SELECT COUNT(*) as total, SUM(quantidade_atual) as quantidade 
        FROM estoque_escolas 
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
      `, [tenant.id]);
      
      // Estoque com produtos e escolas do mesmo tenant
      const estoqueCompativel = await db.query(`
        SELECT COUNT(*) as total, SUM(ee.quantidade_atual) as quantidade
        FROM estoque_escolas ee
        JOIN produtos p ON p.id = ee.produto_id
        JOIN escolas e ON e.id = ee.escola_id
        WHERE (ee.tenant_id = $1 OR ee.tenant_id IS NULL)
          AND (p.tenant_id = $1 OR p.tenant_id IS NULL)
          AND (e.tenant_id = $1 OR e.tenant_id IS NULL)
          AND p.ativo = true AND e.ativo = true
      `, [tenant.id]);
      
      console.log(`    Produtos disponíveis: ${produtosTenant.rows[0].total}`);
      console.log(`    Escolas disponíveis: ${escolasTenant.rows[0].total}`);
      console.log(`    Registros de estoque: ${estoqueTenant.rows[0].total}`);
      console.log(`    Quantidade total: ${estoqueTenant.rows[0].quantidade || 0}`);
      console.log(`    Estoque compatível: ${estoqueCompativel.rows[0].total}`);
      console.log(`    Quantidade compatível: ${estoqueCompativel.rows[0].quantidade || 0}`);
    }

    // 6. Testar a query otimizada para cada tenant
    console.log('\n🧪 Testando query otimizada:');
    
    for (const tenant of tenants.rows) {
      console.log(`\n  Testando tenant: ${tenant.name}`);
      
      try {
        const resultado = await db.query(`
          WITH estoque_agregado AS (
            SELECT 
              p.id as produto_id,
              p.nome as produto_nome,
              p.descricao as produto_descricao,
              p.unidade,
              p.categoria,
              COUNT(DISTINCT e.id) as total_escolas,
              COUNT(DISTINCT ee.escola_id) FILTER (WHERE ee.quantidade_atual > 0) as total_escolas_com_estoque,
              COALESCE(SUM(ee.quantidade_atual), 0) as total_quantidade
            FROM produtos p
            CROSS JOIN escolas e
            LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id)
            WHERE p.ativo = true AND e.ativo = true
              AND (p.tenant_id = $1 OR p.tenant_id IS NULL)
              AND (e.tenant_id = $1 OR e.tenant_id IS NULL)
              AND (ee.tenant_id = $1 OR ee.tenant_id IS NULL OR ee.tenant_id IS NULL)
            GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria
            HAVING COALESCE(SUM(ee.quantidade_atual), 0) > 0
          )
          SELECT COUNT(*) as total_produtos
          FROM estoque_agregado
        `, [tenant.id]);
        
        console.log(`    Produtos com estoque: ${resultado.rows[0].total_produtos}`);
      } catch (error) {
        console.log(`    Erro na query: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

debugTenantDataDistribution();