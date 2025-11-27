/**
 * Script para verificar o contexto de tenant em uma requisição específica
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};

async function checkTenantContext() {
  try {
    console.log('🔍 Verificando contexto de tenant...\n');

    // Pegar escola_id 84 mencionada no erro
    const escolaId = 84;

    // 1. Verificar a escola
    const escola = await db.query(`
      SELECT id, nome, tenant_id, ativo
      FROM escolas
      WHERE id = $1
    `, [escolaId]);

    if (escola.rows.length === 0) {
      console.log(`❌ Escola ${escolaId} não encontrada!`);
      return;
    }

    const escolaData = escola.rows[0];
    console.log('📍 Escola:', {
      id: escolaData.id,
      nome: escolaData.nome,
      tenant_id: escolaData.tenant_id,
      ativo: escolaData.ativo
    });

    // 2. Verificar o tenant da escola
    if (escolaData.tenant_id) {
      const tenant = await db.query(`
        SELECT id, name, slug, status
        FROM tenants
        WHERE id = $1
      `, [escolaData.tenant_id]);

      if (tenant.rows.length > 0) {
        console.log('\n🏢 Tenant da escola:', {
          id: tenant.rows[0].id,
          name: tenant.rows[0].name,
          slug: tenant.rows[0].slug,
          status: tenant.rows[0].status
        });
      } else {
        console.log(`\n❌ Tenant ${escolaData.tenant_id} não encontrado!`);
      }
    } else {
      console.log('\n⚠️  Escola não tem tenant_id!');
    }

    // 3. Verificar produtos da escola no estoque
    const produtosEstoque = await db.query(`
      SELECT 
        ee.id,
        ee.produto_id,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant_id,
        ee.quantidade_atual
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = $1
      LIMIT 5
    `, [escolaId]);

    console.log(`\n📦 Produtos no estoque da escola (primeiros 5):`);
    if (produtosEstoque.rows.length === 0) {
      console.log('   Nenhum produto no estoque');
    } else {
      produtosEstoque.rows.forEach(p => {
        const tenantMatch = p.produto_tenant_id === escolaData.tenant_id;
        console.log(`   - Produto ${p.produto_id}: ${p.produto_nome}`);
        console.log(`     Tenant: ${p.produto_tenant_id} ${tenantMatch ? '✅' : '❌ INCOMPATÍVEL'}`);
        console.log(`     Quantidade: ${p.quantidade_atual}`);
      });
    }

    // 4. Verificar se há produtos com tenant diferente
    const produtosIncompativeis = await db.query(`
      SELECT 
        ee.id,
        ee.produto_id,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant_id,
        e.tenant_id as escola_tenant_id
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.escola_id = $1
        AND p.tenant_id != e.tenant_id
    `, [escolaId]);

    if (produtosIncompativeis.rows.length > 0) {
      console.log(`\n⚠️  PROBLEMA: ${produtosIncompativeis.rows.length} produtos com tenant incompatível:`);
      produtosIncompativeis.rows.forEach(p => {
        console.log(`   - Produto ${p.produto_id}: ${p.produto_nome}`);
        console.log(`     Produto tenant: ${p.produto_tenant_id}`);
        console.log(`     Escola tenant: ${p.escola_tenant_id}`);
      });
    } else {
      console.log('\n✅ Todos os produtos têm tenant compatível com a escola');
    }

    // 5. Verificar usuários que podem acessar essa escola
    const usuarios = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.tenant_id,
        u.tipo
      FROM usuarios u
      WHERE u.tenant_id = $1
        AND u.ativo = true
      LIMIT 5
    `, [escolaData.tenant_id]);

    console.log(`\n👥 Usuários do tenant (primeiros 5):`);
    if (usuarios.rows.length === 0) {
      console.log('   Nenhum usuário encontrado');
    } else {
      usuarios.rows.forEach(u => {
        console.log(`   - ${u.nome} (${u.email})`);
        console.log(`     ID: ${u.id}, Tipo: ${u.tipo}`);
      });
    }

    // 6. Sugestões
    console.log('\n📝 Diagnóstico:');
    if (!escolaData.tenant_id) {
      console.log('   ❌ A escola não tem tenant_id definido');
      console.log('   💡 Execute: node backend/fix-estoque-escola-tenant.js --fix');
    } else if (produtosIncompativeis.rows.length > 0) {
      console.log('   ❌ Há produtos com tenant incompatível');
      console.log('   💡 Os produtos precisam ter o mesmo tenant_id da escola');
    } else {
      console.log('   ✅ Configuração de tenant parece correta');
      console.log('   💡 Verifique se o frontend está enviando o X-Tenant-ID correto');
      console.log(`   💡 Tenant esperado: ${escolaData.tenant_id}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkTenantContext();
