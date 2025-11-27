/**
 * Script para verificar e corrigir tenant_id em escolas e produtos
 * para resolver o erro 403 no módulo de estoque-escola
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

async function fixEstoqueEscolaTenant() {
  try {
    console.log('🔍 Verificando tenant_id em escolas e produtos...\n');

    // 1. Verificar escolas sem tenant_id
    const escolasSemTenant = await db.query(`
      SELECT id, nome, tenant_id 
      FROM escolas 
      WHERE tenant_id IS NULL
      ORDER BY id
    `);

    console.log(`📊 Escolas sem tenant_id: ${escolasSemTenant.rows.length}`);
    if (escolasSemTenant.rows.length > 0) {
      console.log('Escolas:', escolasSemTenant.rows.map(e => `${e.id} - ${e.nome}`).join('\n'));
    }

    // 2. Verificar produtos sem tenant_id
    const produtosSemTenant = await db.query(`
      SELECT id, nome, tenant_id 
      FROM produtos 
      WHERE tenant_id IS NULL
      ORDER BY id
    `);

    console.log(`\n📊 Produtos sem tenant_id: ${produtosSemTenant.rows.length}`);
    if (produtosSemTenant.rows.length > 0) {
      console.log('Primeiros 10 produtos:', produtosSemTenant.rows.slice(0, 10).map(p => `${p.id} - ${p.nome}`).join('\n'));
    }

    // 3. Buscar tenant padrão ou primeiro tenant disponível
    const tenants = await db.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE status = 'active'
      ORDER BY created_at ASC
      LIMIT 5
    `);

    console.log(`\n🏢 Tenants disponíveis: ${tenants.rows.length}`);
    tenants.rows.forEach(t => {
      console.log(`  - ${t.name} (${t.slug}) - ID: ${t.id}`);
    });

    if (tenants.rows.length === 0) {
      console.log('\n❌ Nenhum tenant encontrado! Crie um tenant primeiro.');
      return;
    }

    // Usar o primeiro tenant disponível
    const tenantPadrao = tenants.rows[0];
    console.log(`\n✅ Usando tenant: ${tenantPadrao.name} (${tenantPadrao.id})`);

    // 4. Perguntar se deve corrigir
    console.log('\n⚠️  ATENÇÃO: Este script irá atualizar o tenant_id de todas as escolas e produtos sem tenant.');
    console.log(`   Tenant que será usado: ${tenantPadrao.name} (${tenantPadrao.id})`);
    console.log('\n   Para confirmar, execute novamente com o parâmetro --fix');
    
    if (!process.argv.includes('--fix')) {
      console.log('\n📋 Modo de visualização apenas. Use --fix para aplicar as correções.');
      return;
    }

    console.log('\n🔧 Aplicando correções...\n');

    // 5. Atualizar escolas
    if (escolasSemTenant.rows.length > 0) {
      const updateEscolas = await db.query(`
        UPDATE escolas 
        SET tenant_id = $1, updated_at = NOW()
        WHERE tenant_id IS NULL
        RETURNING id, nome
      `, [tenantPadrao.id]);

      console.log(`✅ ${updateEscolas.rows.length} escolas atualizadas com tenant_id`);
      updateEscolas.rows.forEach(e => {
        console.log(`   - Escola ${e.id}: ${e.nome}`);
      });
    }

    // 6. Atualizar produtos
    if (produtosSemTenant.rows.length > 0) {
      const updateProdutos = await db.query(`
        UPDATE produtos 
        SET tenant_id = $1, updated_at = NOW()
        WHERE tenant_id IS NULL
        RETURNING id, nome
      `, [tenantPadrao.id]);

      console.log(`\n✅ ${updateProdutos.rows.length} produtos atualizados com tenant_id`);
      if (updateProdutos.rows.length <= 20) {
        updateProdutos.rows.forEach(p => {
          console.log(`   - Produto ${p.id}: ${p.nome}`);
        });
      } else {
        console.log(`   (Mostrando primeiros 20 de ${updateProdutos.rows.length})`);
        updateProdutos.rows.slice(0, 20).forEach(p => {
          console.log(`   - Produto ${p.id}: ${p.nome}`);
        });
      }
    }

    // 7. Verificar estoque_escolas
    const estoqueEscolas = await db.query(`
      SELECT 
        ee.id,
        ee.escola_id,
        ee.produto_id,
        e.nome as escola_nome,
        e.tenant_id as escola_tenant,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant
      FROM estoque_escolas ee
      LEFT JOIN escolas e ON e.id = ee.escola_id
      LEFT JOIN produtos p ON p.id = ee.produto_id
      WHERE e.tenant_id IS NULL OR p.tenant_id IS NULL
      LIMIT 10
    `);

    if (estoqueEscolas.rows.length > 0) {
      console.log(`\n⚠️  Encontrados ${estoqueEscolas.rows.length} registros de estoque com escola ou produto sem tenant:`);
      estoqueEscolas.rows.forEach(ee => {
        console.log(`   - Estoque ${ee.id}: Escola ${ee.escola_id} (${ee.escola_nome}) - Produto ${ee.produto_id} (${ee.produto_nome})`);
        console.log(`     Escola tenant: ${ee.escola_tenant || 'NULL'}, Produto tenant: ${ee.produto_tenant || 'NULL'}`);
      });
    }

    // 8. Verificar estoque_lotes
    const estoqueLotes = await db.query(`
      SELECT 
        el.id,
        el.escola_id,
        el.produto_id,
        el.lote,
        e.nome as escola_nome,
        e.tenant_id as escola_tenant,
        p.nome as produto_nome,
        p.tenant_id as produto_tenant
      FROM estoque_lotes el
      LEFT JOIN escolas e ON e.id = el.escola_id
      LEFT JOIN produtos p ON p.id = el.produto_id
      WHERE e.tenant_id IS NULL OR p.tenant_id IS NULL
      LIMIT 10
    `);

    if (estoqueLotes.rows.length > 0) {
      console.log(`\n⚠️  Encontrados ${estoqueLotes.rows.length} lotes com escola ou produto sem tenant:`);
      estoqueLotes.rows.forEach(el => {
        console.log(`   - Lote ${el.id} (${el.lote}): Escola ${el.escola_id} - Produto ${el.produto_id}`);
        console.log(`     Escola tenant: ${el.escola_tenant || 'NULL'}, Produto tenant: ${el.produto_tenant || 'NULL'}`);
      });
    }

    console.log('\n✅ Correções aplicadas com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Verifique se o tenant_id no localStorage do frontend está correto');
    console.log('   2. Faça logout e login novamente no sistema');
    console.log('   3. Tente registrar uma movimentação de estoque novamente');

  } catch (error) {
    console.error('❌ Erro ao corrigir tenant:', error);
  } finally {
    await db.end();
  }
}

// Executar
fixEstoqueEscolaTenant();
