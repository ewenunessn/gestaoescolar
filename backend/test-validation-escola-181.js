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

async function testValidation() {
  const client = await pool.connect();
  
  try {
    const escolaId = 181;
    const produtoId = 40; // Arroz
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    
    console.log('🔍 Testando validação de tenant...\n');
    console.log(`Escola ID: ${escolaId}`);
    console.log(`Produto ID: ${produtoId}`);
    console.log(`Tenant ID: ${tenantId}\n`);
    
    // 1. Verificar escola
    const escolaResult = await client.query(`
      SELECT id, nome, tenant_id, ativo
      FROM escolas
      WHERE id = $1
    `, [escolaId]);
    
    console.log('📍 Escola:');
    if (escolaResult.rows.length > 0) {
      const e = escolaResult.rows[0];
      console.log(`  ✅ Encontrada: ${e.nome}`);
      console.log(`     Tenant: ${e.tenant_id}`);
      console.log(`     Ativo: ${e.ativo}`);
      console.log(`     Tenant Match: ${e.tenant_id === tenantId ? '✅' : '❌'}`);
    } else {
      console.log('  ❌ Não encontrada');
    }
    console.log('');
    
    // 2. Verificar produto
    const produtoResult = await client.query(`
      SELECT id, nome, tenant_id, ativo
      FROM produtos
      WHERE id = $1
    `, [produtoId]);
    
    console.log('📦 Produto:');
    if (produtoResult.rows.length > 0) {
      const p = produtoResult.rows[0];
      console.log(`  ✅ Encontrado: ${p.nome}`);
      console.log(`     Tenant: ${p.tenant_id}`);
      console.log(`     Ativo: ${p.ativo}`);
      console.log(`     Tenant Match: ${p.tenant_id === tenantId ? '✅' : '❌'}`);
    } else {
      console.log('  ❌ Não encontrado');
    }
    console.log('');
    
    // 3. Testar a query de validação exata
    console.log('🔍 Testando query de validação (validateSchoolProductTenantConsistency):\n');
    
    const validationResult = await client.query(`
      SELECT 
        e.id as escola_id,
        p.id as produto_id,
        e.tenant_id as escola_tenant,
        p.tenant_id as produto_tenant
      FROM escolas e
      CROSS JOIN produtos p
      WHERE e.id = $1 AND p.id = $2 
        AND e.tenant_id = $3 AND p.tenant_id = $3
        AND e.ativo = true AND p.ativo = true
    `, [escolaId, produtoId, tenantId]);
    
    if (validationResult.rows.length > 0) {
      console.log('✅ VALIDAÇÃO PASSOU!');
      console.log('   A movimentação deveria funcionar.');
    } else {
      console.log('❌ VALIDAÇÃO FALHOU!');
      console.log('   Esta é a causa do erro 403.\n');
      
      // Diagnosticar o motivo
      const escola = escolaResult.rows[0];
      const produto = produtoResult.rows[0];
      
      console.log('📋 Diagnóstico:');
      if (!escola) {
        console.log('   ❌ Escola não encontrada');
      } else if (escola.tenant_id !== tenantId) {
        console.log(`   ❌ Escola tem tenant diferente: ${escola.tenant_id}`);
      } else if (!escola.ativo) {
        console.log('   ❌ Escola está inativa');
      } else {
        console.log('   ✅ Escola OK');
      }
      
      if (!produto) {
        console.log('   ❌ Produto não encontrado');
      } else if (produto.tenant_id !== tenantId) {
        console.log(`   ❌ Produto tem tenant diferente: ${produto.tenant_id}`);
      } else if (!produto.ativo) {
        console.log('   ❌ Produto está inativo');
      } else {
        console.log('   ✅ Produto OK');
      }
    }
    console.log('');
    
    // 4. Testar query alternativa (com OR tenant_id IS NULL)
    console.log('🔍 Testando query alternativa (permitindo NULL):\n');
    
    const alternativeResult = await client.query(`
      SELECT 
        e.id as escola_id,
        p.id as produto_id,
        e.tenant_id as escola_tenant,
        p.tenant_id as produto_tenant
      FROM escolas e
      CROSS JOIN produtos p
      WHERE e.id = $1 AND p.id = $2 
        AND (e.tenant_id = $3 OR e.tenant_id IS NULL)
        AND (p.tenant_id = $3 OR p.tenant_id IS NULL)
        AND e.ativo = true AND p.ativo = true
    `, [escolaId, produtoId, tenantId]);
    
    if (alternativeResult.rows.length > 0) {
      console.log('✅ Query alternativa PASSOU!');
      console.log('   Sugestão: Modificar a validação para aceitar tenant_id NULL.');
    } else {
      console.log('❌ Query alternativa também FALHOU!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testValidation();
