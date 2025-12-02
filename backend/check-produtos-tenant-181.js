require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function checkProdutos() {
  const client = await pool.connect();
  
  try {
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    
    console.log('🔍 Verificando produtos do tenant...\n');
    
    // 1. Produtos do tenant
    const produtosResult = await client.query(`
      SELECT id, nome, tenant_id, ativo
      FROM produtos
      WHERE tenant_id = $1
      ORDER BY id
      LIMIT 10
    `, [tenantId]);
    
    console.log(`📦 Produtos do tenant (${produtosResult.rows.length} encontrados):`);
    produtosResult.rows.forEach(p => {
      console.log(`  - ID: ${p.id}, Nome: ${p.nome}, Ativo: ${p.ativo}`);
    });
    console.log('');
    
    // 2. Produtos com tenant_id NULL
    const produtosNullResult = await client.query(`
      SELECT id, nome, tenant_id, ativo
      FROM produtos
      WHERE tenant_id IS NULL
      ORDER BY id
      LIMIT 10
    `);
    
    console.log(`📦 Produtos com tenant_id NULL (${produtosNullResult.rows.length} encontrados):`);
    produtosNullResult.rows.forEach(p => {
      console.log(`  - ID: ${p.id}, Nome: ${p.nome}, Ativo: ${p.ativo}`);
    });
    console.log('');
    
    // 3. Verificar se há estoque_escolas para a escola 181
    const estoqueResult = await client.query(`
      SELECT 
        ee.id,
        ee.produto_id,
        ee.quantidade_atual,
        ee.tenant_id as estoque_tenant,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant
      FROM estoque_escolas ee
      LEFT JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 181
      LIMIT 10
    `);
    
    console.log(`📦 Registros em estoque_escolas para escola 181 (${estoqueResult.rows.length} encontrados):`);
    estoqueResult.rows.forEach(e => {
      console.log(`  - Produto ID: ${e.produto_id}, Nome: ${e.produto_nome || 'N/A'}`);
      console.log(`    Qtd: ${e.quantidade_atual}, Estoque Tenant: ${e.estoque_tenant}, Produto Tenant: ${e.produto_tenant}`);
    });
    console.log('');
    
    // 4. Verificar se o problema é que os produtos têm tenant NULL
    if (estoqueResult.rows.length > 0) {
      const produtoComTenantNull = estoqueResult.rows.find(e => e.produto_tenant === null);
      if (produtoComTenantNull) {
        console.log('⚠️  PROBLEMA IDENTIFICADO:');
        console.log('   Há produtos no estoque com tenant_id NULL!');
        console.log('   Isso faz com que a validação falhe.\n');
        
        console.log('💡 SOLUÇÃO:');
        console.log('   Atualizar o tenant_id dos produtos para corresponder ao tenant da escola.\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProdutos();
