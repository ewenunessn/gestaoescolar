require('dotenv').config();
const db = require('./dist/database');

async function debugMovimentacao() {
  const client = await db.pool.connect();
  
  try {
    console.log('🔍 Verificando dados da escola 181 e produtos...\n');
    
    // 1. Verificar escola 181
    const escolaResult = await client.query(`
      SELECT id, nome, tenant_id, ativo 
      FROM escolas 
      WHERE id = 181
    `);
    
    if (escolaResult.rows.length === 0) {
      console.log('❌ Escola 181 não encontrada!');
      console.log('\n📋 Listando todas as escolas:');
      const todasEscolas = await client.query(`
        SELECT id, nome, tenant_id, ativo 
        FROM escolas 
        ORDER BY id
        LIMIT 20
      `);
      todasEscolas.rows.forEach(e => {
        console.log(`  - ID: ${e.id}, Nome: ${e.nome}, Tenant: ${e.tenant_id}, Ativo: ${e.ativo}`);
      });
      return;
    }
    
    console.log('📍 Escola 181:');
    console.log(escolaResult.rows[0]);
    console.log('');
    
    // 2. Verificar produtos da escola 181 no estoque
    const produtosResult = await client.query(`
      SELECT 
        p.id,
        p.nome,
        p.tenant_id,
        p.ativo,
        ee.quantidade_atual
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 181
      ORDER BY p.id
    `);
    
    console.log('📦 Produtos no estoque da escola 181:');
    produtosResult.rows.forEach(p => {
      console.log(`  - ID: ${p.id}, Nome: ${p.nome}, Tenant: ${p.tenant_id}, Ativo: ${p.ativo}, Qtd: ${p.quantidade_atual}`);
    });
    console.log('');
    
    // 3. Verificar se há produtos com tenant_id NULL
    const produtosNullResult = await client.query(`
      SELECT 
        p.id,
        p.nome,
        p.tenant_id
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 181 AND p.tenant_id IS NULL
    `);
    
    if (produtosNullResult.rows.length > 0) {
      console.log('⚠️  Produtos com tenant_id NULL:');
      produtosNullResult.rows.forEach(p => {
        console.log(`  - ID: ${p.id}, Nome: ${p.nome}`);
      });
      console.log('');
    }
    
    // 4. Simular a validação que está falhando
    const escolaTenantId = escolaResult.rows[0].tenant_id;
    
    console.log(`🔍 Simulando validação com tenant_id: ${escolaTenantId}\n`);
    
    for (const produto of produtosResult.rows) {
      const validationResult = await client.query(`
        SELECT 
          e.id as escola_id,
          p.id as produto_id,
          e.tenant_id as escola_tenant,
          p.tenant_id as produto_tenant
        FROM escolas e
        CROSS JOIN produtos p
        WHERE e.id = 181 AND p.id = $1 
          AND e.tenant_id = $2 AND p.tenant_id = $2
          AND e.ativo = true AND p.ativo = true
      `, [produto.id, escolaTenantId]);
      
      if (validationResult.rows.length === 0) {
        console.log(`❌ Produto ${produto.id} (${produto.nome}) FALHA na validação`);
        console.log(`   Escola tenant: ${escolaTenantId}, Produto tenant: ${produto.tenant_id}`);
      } else {
        console.log(`✅ Produto ${produto.id} (${produto.nome}) PASSA na validação`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
  }
}

debugMovimentacao();
