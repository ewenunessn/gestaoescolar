require('dotenv').config();
const { Pool } = require('pg');

// Usar variáveis individuais do .env
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function debugMovimentacao() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando dados da escola 181 e produtos (LOCAL)...\n');
    
    // 1. Verificar escola 181
    const escolaResult = await client.query(`
      SELECT id, nome, tenant_id, ativo 
      FROM escolas 
      WHERE id = 181
    `);
    
    if (escolaResult.rows.length === 0) {
      console.log('❌ Escola 181 não encontrada!');
      console.log('\n📋 Listando escolas próximas ao ID 181:');
      const escolasProximas = await client.query(`
        SELECT id, nome, tenant_id, ativo 
        FROM escolas 
        WHERE id >= 175 AND id <= 185
        ORDER BY id
      `);
      escolasProximas.rows.forEach(e => {
        console.log(`  - ID: ${e.id}, Nome: ${e.nome}, Tenant: ${e.tenant_id}, Ativo: ${e.ativo}`);
      });
      return;
    }
    
    const escola = escolaResult.rows[0];
    console.log('📍 Escola 181:');
    console.log(`  ID: ${escola.id}`);
    console.log(`  Nome: ${escola.nome}`);
    console.log(`  Tenant ID: ${escola.tenant_id}`);
    console.log(`  Ativo: ${escola.ativo}`);
    console.log('');
    
    // 2. Verificar produtos da escola 181 no estoque
    const produtosResult = await client.query(`
      SELECT 
        p.id,
        p.nome,
        p.tenant_id,
        p.ativo,
        ee.quantidade_atual,
        ee.tenant_id as estoque_tenant_id
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 181
      ORDER BY p.id
      LIMIT 10
    `);
    
    console.log('📦 Produtos no estoque da escola 181:');
    if (produtosResult.rows.length === 0) {
      console.log('  (nenhum produto no estoque)');
    } else {
      produtosResult.rows.forEach(p => {
        console.log(`  - ID: ${p.id}, Nome: ${p.nome}`);
        console.log(`    Produto Tenant: ${p.tenant_id}, Estoque Tenant: ${p.estoque_tenant_id}`);
        console.log(`    Ativo: ${p.ativo}, Qtd: ${p.quantidade_atual}`);
      });
    }
    console.log('');
    
    // 3. Verificar se há produtos com tenant_id NULL
    const produtosNullResult = await client.query(`
      SELECT 
        p.id,
        p.nome,
        p.tenant_id as produto_tenant,
        ee.tenant_id as estoque_tenant
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 181 
        AND (p.tenant_id IS NULL OR ee.tenant_id IS NULL)
    `);
    
    if (produtosNullResult.rows.length > 0) {
      console.log('⚠️  Produtos ou estoque com tenant_id NULL:');
      produtosNullResult.rows.forEach(p => {
        console.log(`  - ID: ${p.id}, Nome: ${p.nome}`);
        console.log(`    Produto Tenant: ${p.produto_tenant}, Estoque Tenant: ${p.estoque_tenant}`);
      });
      console.log('');
    }
    
    // 4. Simular a validação que está falhando
    const escolaTenantId = escola.tenant_id;
    
    if (!escolaTenantId) {
      console.log('❌ Escola 181 não tem tenant_id definido!');
      return;
    }
    
    console.log(`🔍 Simulando validação com tenant_id: ${escolaTenantId}\n`);
    
    for (const produto of produtosResult.rows) {
      // Esta é a query exata que está sendo usada no validateSchoolProductTenantConsistency
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
        console.log(`   Motivo: Escola tenant: ${escolaTenantId}, Produto tenant: ${produto.tenant_id}`);
        
        // Verificar qual é o problema específico
        if (produto.tenant_id === null) {
          console.log(`   ⚠️  Produto tem tenant_id NULL`);
        } else if (produto.tenant_id !== escolaTenantId) {
          console.log(`   ⚠️  Produto tem tenant diferente: ${produto.tenant_id}`);
        }
      } else {
        console.log(`✅ Produto ${produto.id} (${produto.nome}) PASSA na validação`);
      }
    }
    
    // 5. Verificar usuário logado (se houver)
    console.log('\n🔍 Verificando usuários do tenant...');
    const usuariosResult = await client.query(`
      SELECT id, nome, email, tenant_id, ativo
      FROM usuarios
      WHERE tenant_id = $1
      LIMIT 5
    `, [escolaTenantId]);
    
    console.log(`Usuários do tenant ${escolaTenantId}:`);
    usuariosResult.rows.forEach(u => {
      console.log(`  - ID: ${u.id}, Nome: ${u.nome}, Email: ${u.email}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

debugMovimentacao();
