/**
 * Script para verificar a escola ID 121 e seu estoque
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

async function checkEscola121() {
  try {
    console.log('🔍 Verificando escola ID 121...\n');

    // 1. Verificar se a escola existe
    const escola = await db.query(`
      SELECT id, nome, tenant_id, ativo
      FROM escolas
      WHERE id = 121
    `);

    if (escola.rows.length === 0) {
      console.log('❌ Escola 121 não encontrada!');
      return;
    }

    const escolaData = escola.rows[0];
    console.log('📍 Escola:', {
      id: escolaData.id,
      nome: escolaData.nome,
      tenant_id: escolaData.tenant_id,
      ativo: escolaData.ativo
    });

    // 2. Verificar o tenant
    if (escolaData.tenant_id) {
      const tenant = await db.query(`
        SELECT id, name, slug, status
        FROM tenants
        WHERE id = $1
      `, [escolaData.tenant_id]);

      if (tenant.rows.length > 0) {
        console.log('\n🏢 Tenant:', {
          id: tenant.rows[0].id,
          name: tenant.rows[0].name,
          slug: tenant.rows[0].slug,
          status: tenant.rows[0].status
        });
      }
    }

    // 3. Verificar estoque da escola
    const estoque = await db.query(`
      SELECT 
        ee.id,
        ee.produto_id,
        ee.quantidade_atual,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant_id,
        p.ativo as produto_ativo
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.escola_id = 121
      ORDER BY ee.id
      LIMIT 10
    `);

    console.log(`\n📦 Estoque da escola (primeiros 10 itens): ${estoque.rows.length} itens`);
    if (estoque.rows.length === 0) {
      console.log('   ⚠️  Nenhum item no estoque!');
    } else {
      estoque.rows.forEach(item => {
        const tenantMatch = item.produto_tenant_id === escolaData.tenant_id;
        console.log(`\n   Item ${item.id}:`);
        console.log(`   - Produto: ${item.produto_nome} (ID: ${item.produto_id})`);
        console.log(`   - Quantidade: ${item.quantidade_atual}`);
        console.log(`   - Produto ativo: ${item.produto_ativo}`);
        console.log(`   - Tenant match: ${tenantMatch ? '✅' : '❌'}`);
      });
    }

    // 4. Verificar produtos ativos do tenant
    const produtosAtivos = await db.query(`
      SELECT COUNT(*) as total
      FROM produtos
      WHERE tenant_id = $1 AND ativo = true
    `, [escolaData.tenant_id]);

    console.log(`\n📊 Produtos ativos no tenant: ${produtosAtivos.rows[0].total}`);

    // 5. Verificar se há produtos que deveriam estar no estoque
    const produtosSemEstoque = await db.query(`
      SELECT p.id, p.nome
      FROM produtos p
      WHERE p.tenant_id = $1 
        AND p.ativo = true
        AND NOT EXISTS (
          SELECT 1 FROM estoque_escolas ee 
          WHERE ee.produto_id = p.id AND ee.escola_id = 121
        )
      LIMIT 5
    `, [escolaData.tenant_id]);

    if (produtosSemEstoque.rows.length > 0) {
      console.log(`\n⚠️  ${produtosSemEstoque.rows.length} produtos ativos sem registro no estoque:`);
      produtosSemEstoque.rows.forEach(p => {
        console.log(`   - ${p.nome} (ID: ${p.id})`);
      });
      console.log('\n💡 Execute: POST /api/estoque-escola/escola/121/inicializar');
    }

    // 6. Verificar query que o backend usa
    console.log('\n🔍 Testando query do backend...');
    const queryBackend = await db.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        COALESCE(ee.id, 0) as estoque_id
      FROM produtos p
      LEFT JOIN estoque_escolas ee ON (ee.produto_id = p.id AND ee.escola_id = $1)
      WHERE p.ativo = true 
        AND p.tenant_id = $2
      ORDER BY p.nome
      LIMIT 5
    `, [121, escolaData.tenant_id]);

    console.log(`\n📋 Resultado da query do backend: ${queryBackend.rows.length} itens`);
    if (queryBackend.rows.length === 0) {
      console.log('   ❌ Query retornou vazio!');
      console.log('   Possíveis causas:');
      console.log('   1. Nenhum produto ativo no tenant');
      console.log('   2. Tenant_id incorreto');
    } else {
      queryBackend.rows.forEach(item => {
        console.log(`   - ${item.produto_nome}: ${item.quantidade_atual} ${item.unidade}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkEscola121();
