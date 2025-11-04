const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true'
});

async function debugTenantFrontend() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugando dados do tenant no frontend...');
    
    // 1. Verificar se todos os dados estão no mesmo tenant
    console.log('\n1. Verificando distribuição atual dos dados...');
    
    const dataDistribution = await client.query(`
      SELECT 
        'Produtos' as tipo,
        t.name as tenant_name,
        COUNT(p.id) as total
      FROM tenants t
      LEFT JOIN produtos p ON p.tenant_id = t.id
      GROUP BY t.id, t.name
      
      UNION ALL
      
      SELECT 
        'Escolas' as tipo,
        t.name as tenant_name,
        COUNT(e.id) as total
      FROM tenants t
      LEFT JOIN escolas e ON e.tenant_id = t.id
      GROUP BY t.id, t.name
      
      UNION ALL
      
      SELECT 
        'Estoque' as tipo,
        t.name as tenant_name,
        COUNT(ee.id) as total
      FROM tenants t
      LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
      GROUP BY t.id, t.name
      
      ORDER BY tipo, tenant_name
    `);
    
    console.log('Distribuição atual:');
    dataDistribution.rows.forEach(row => {
      console.log(`  ${row.tipo} - ${row.tenant_name}: ${row.total}`);
    });
    
    // 2. Verificar se existe o problema: todos os dados no mesmo tenant
    const tenantCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT p.tenant_id) as tenants_produtos,
        COUNT(DISTINCT e.tenant_id) as tenants_escolas,
        COUNT(DISTINCT ee.tenant_id) as tenants_estoque
      FROM produtos p
      CROSS JOIN escolas e
      CROSS JOIN estoque_escolas ee
      WHERE p.tenant_id IS NOT NULL 
        AND e.tenant_id IS NOT NULL 
        AND ee.tenant_id IS NOT NULL
    `);
    
    const check = tenantCheck.rows[0];
    console.log('\n2. Análise do problema:');
    
    if (check.tenants_produtos === 1 && check.tenants_escolas === 1 && check.tenants_estoque === 1) {
      console.log('❌ PROBLEMA CONFIRMADO: Todos os dados estão no mesmo tenant!');
      console.log('   Isso explica por que você vê os mesmos dados em todos os tenants.');
      
      // Identificar qual tenant tem todos os dados
      const dominantTenant = await client.query(`
        SELECT t.name, t.slug, COUNT(p.id) as produtos
        FROM tenants t
        JOIN produtos p ON p.tenant_id = t.id
        GROUP BY t.id, t.name, t.slug
        ORDER BY produtos DESC
        LIMIT 1
      `);
      
      if (dominantTenant.rows.length > 0) {
        console.log(`   Todos os dados estão no tenant: ${dominantTenant.rows[0].name}`);
      }
      
    } else {
      console.log('✅ Dados estão distribuídos entre múltiplos tenants');
    }
    
    // 3. Propor solução
    console.log('\n3. Solução recomendada:');
    
    if (check.tenants_produtos === 1) {
      console.log('📋 Para corrigir o isolamento, execute:');
      console.log('   1. Execute o script: backend/force-tenant-isolation.sql');
      console.log('   2. Isso vai distribuir os dados entre diferentes tenants');
      console.log('   3. Reinicie o backend');
      console.log('   4. Limpe o cache do frontend');
      
      // Mostrar preview da distribuição que seria feita
      const totalProdutos = await client.query('SELECT COUNT(*) as total FROM produtos');
      const totalEscolas = await client.query('SELECT COUNT(*) as total FROM escolas');
      
      console.log('\n📊 Preview da distribuição:');
      console.log(`   Tenant A: ~${Math.floor(totalProdutos.rows[0].total / 2)} produtos, ~${Math.floor(totalEscolas.rows[0].total / 2)} escolas`);
      console.log(`   Tenant B: ~${Math.ceil(totalProdutos.rows[0].total / 2)} produtos, ~${Math.ceil(totalEscolas.rows[0].total / 2)} escolas`);
    }
    
    // 4. Verificar produtos específicos mencionados
    console.log('\n4. Verificando produtos específicos mencionados:');
    
    const specificProducts = await client.query(`
      SELECT 
        p.nome,
        t.name as tenant_name,
        SUM(ee.quantidade_atual) as quantidade_total
      FROM produtos p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      LEFT JOIN estoque_escolas ee ON ee.produto_id = p.id
      WHERE p.nome IN ('Arroz Branco', 'Banana', 'Carne Bovina Moída', 'Feijão Carioca', 'Frango', 'Leite Integral', 'Maçã')
      GROUP BY p.id, p.nome, t.name
      ORDER BY p.nome
    `);
    
    specificProducts.rows.forEach(product => {
      console.log(`   ${product.nome}: ${product.quantidade_total || 0} (Tenant: ${product.tenant_name || 'SEM TENANT'})`);
    });
    
    console.log('\n✅ Debug concluído!');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

debugTenantFrontend();