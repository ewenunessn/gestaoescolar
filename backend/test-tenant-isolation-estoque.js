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

async function testTenantIsolation() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Testando isolamento de tenant no estoque...');
    
    // 1. Verificar se existem tenants
    console.log('\n1. Verificando tenants disponíveis...');
    const tenants = await client.query(`
      SELECT id, name, slug FROM tenants ORDER BY name
    `);
    
    console.log('Tenants encontrados:');
    tenants.rows.forEach(tenant => {
      console.log(`  - ${tenant.name} (${tenant.slug}) - ID: ${tenant.id}`);
    });
    
    if (tenants.rows.length < 2) {
      console.log('⚠️ Precisa de pelo menos 2 tenants para testar isolamento');
      return;
    }
    
    // 2. Testar dados por tenant
    console.log('\n2. Testando dados por tenant...');
    
    for (const tenant of tenants.rows) {
      console.log(`\n--- Tenant: ${tenant.name} ---`);
      
      // Contar escolas
      const escolasCount = await client.query(`
        SELECT COUNT(*) as total FROM escolas 
        WHERE tenant_id = $1 OR (tenant_id IS NULL AND $2 = (SELECT id FROM tenants WHERE slug = 'sistema-principal'))
      `, [tenant.id, tenant.id]);
      
      // Contar produtos
      const produtosCount = await client.query(`
        SELECT COUNT(*) as total FROM produtos 
        WHERE tenant_id = $1 OR (tenant_id IS NULL AND $2 = (SELECT id FROM tenants WHERE slug = 'sistema-principal'))
      `, [tenant.id, tenant.id]);
      
      // Contar estoque
      const estoqueCount = await client.query(`
        SELECT COUNT(*) as total FROM estoque_escolas 
        WHERE tenant_id = $1 OR (tenant_id IS NULL AND $2 = (SELECT id FROM tenants WHERE slug = 'sistema-principal'))
      `, [tenant.id, tenant.id]);
      
      // Contar lotes
      const lotesCount = await client.query(`
        SELECT COUNT(*) as total FROM estoque_lotes 
        WHERE tenant_id = $1 OR (tenant_id IS NULL AND $2 = (SELECT id FROM tenants WHERE slug = 'sistema-principal'))
      `, [tenant.id, tenant.id]);
      
      // Contar histórico
      const historicoCount = await client.query(`
        SELECT COUNT(*) as total FROM estoque_escolas_historico 
        WHERE tenant_id = $1 OR (tenant_id IS NULL AND $2 = (SELECT id FROM tenants WHERE slug = 'sistema-principal'))
      `, [tenant.id, tenant.id]);
      
      console.log(`  Escolas: ${escolasCount.rows[0].total}`);
      console.log(`  Produtos: ${produtosCount.rows[0].total}`);
      console.log(`  Estoque: ${estoqueCount.rows[0].total}`);
      console.log(`  Lotes: ${lotesCount.rows[0].total}`);
      console.log(`  Histórico: ${historicoCount.rows[0].total}`);
    }
    
    // 3. Verificar registros sem tenant_id (órfãos)
    console.log('\n3. Verificando registros órfãos (sem tenant_id)...');
    
    const tables = ['escolas', 'produtos', 'estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico'];
    
    for (const table of tables) {
      const orphanCount = await client.query(`
        SELECT COUNT(*) as total FROM ${table} WHERE tenant_id IS NULL
      `);
      
      if (orphanCount.rows[0].total > 0) {
        console.log(`⚠️ ${table}: ${orphanCount.rows[0].total} registros sem tenant_id`);
      } else {
        console.log(`✅ ${table}: Todos os registros têm tenant_id`);
      }
    }
    
    // 4. Testar uma query simulando o controller
    console.log('\n4. Testando query do controller...');
    
    const escolaTeste = await client.query(`
      SELECT id, nome, tenant_id FROM escolas LIMIT 1
    `);
    
    if (escolaTeste.rows.length > 0) {
      const escola = escolaTeste.rows[0];
      console.log(`Testando com escola: ${escola.nome} (ID: ${escola.id})`);
      
      // Simular query do controller com filtro de tenant
      const estoqueResult = await client.query(`
        SELECT 
          ee.id,
          p.nome as produto_nome,
          ee.quantidade_atual,
          e.nome as escola_nome
        FROM produtos p
        CROSS JOIN escolas e
        LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = e.id AND (ee.tenant_id = $2 OR ee.tenant_id IS NULL))
        WHERE p.ativo = true 
          AND e.id = $1 
          AND e.ativo = true
          AND (p.tenant_id = $2 OR p.tenant_id IS NULL)
          AND (e.tenant_id = $2 OR e.tenant_id IS NULL)
        LIMIT 5
      `, [escola.id, escola.tenant_id]);
      
      console.log(`Resultados encontrados: ${estoqueResult.rows.length}`);
      estoqueResult.rows.forEach(row => {
        console.log(`  - ${row.produto_nome}: ${row.quantidade_atual || 0}`);
      });
    }
    
    // 5. Verificar se RLS está habilitado
    console.log('\n5. Verificando Row Level Security (RLS)...');
    
    const rlsStatus = await client.query(`
      SELECT 
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'escolas', 'produtos')
      ORDER BY tablename
    `);
    
    rlsStatus.rows.forEach(row => {
      const status = row.rowsecurity ? '✅ Habilitado' : '❌ Desabilitado';
      console.log(`  ${row.tablename}: ${status}`);
    });
    
    console.log('\n✅ Teste de isolamento concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testTenantIsolation();