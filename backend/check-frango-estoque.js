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

async function checkFrangoEstoque() {
  try {
    console.log('🔍 Verificando estoque de Frango na escola 84...\n');

    const escolaId = 84;
    const produtoNome = 'Frango';

    // 1. Buscar produto Frango
    const produto = await db.query(`
      SELECT id, nome, unidade FROM produtos WHERE nome ILIKE '%frango%'
    `);

    if (produto.rows.length === 0) {
      console.log('❌ Produto Frango não encontrado!');
      return;
    }

    const produtoId = produto.rows[0].id;
    console.log(`📦 Produto: ${produto.rows[0].nome} (ID: ${produtoId})`);

    // 2. Verificar estoque_escolas
    const estoque = await db.query(`
      SELECT * FROM estoque_escolas 
      WHERE escola_id = $1 AND produto_id = $2
    `, [escolaId, produtoId]);

    console.log(`\n📊 Estoque Principal:`);
    if (estoque.rows.length === 0) {
      console.log('   ⚠️  Nenhum registro em estoque_escolas');
    } else {
      estoque.rows.forEach(e => {
        console.log(`   ID: ${e.id}`);
        console.log(`   Quantidade: ${e.quantidade_atual}`);
        console.log(`   Tenant: ${e.tenant_id}`);
        console.log(`   Atualizado: ${e.updated_at}`);
      });
    }

    // 3. Verificar lotes
    const lotes = await db.query(`
      SELECT * FROM estoque_lotes 
      WHERE escola_id = $1 AND produto_id = $2
      ORDER BY created_at DESC
    `, [escolaId, produtoId]);

    console.log(`\n📦 Lotes:`);
    if (lotes.rows.length === 0) {
      console.log('   ⚠️  Nenhum lote encontrado');
    } else {
      lotes.rows.forEach(l => {
        console.log(`   Lote: ${l.lote}`);
        console.log(`   Quantidade: ${l.quantidade_atual}`);
        console.log(`   Status: ${l.status}`);
        console.log(`   Tenant: ${l.tenant_id}`);
        console.log(`   Criado: ${l.created_at}`);
        console.log('');
      });
    }

    // 4. Verificar histórico
    const historico = await db.query(`
      SELECT * FROM estoque_escolas_historico 
      WHERE escola_id = $1 AND produto_id = $2
      ORDER BY data_movimentacao DESC
      LIMIT 5
    `, [escolaId, produtoId]);

    console.log(`📜 Histórico (últimas 5 movimentações):`);
    if (historico.rows.length === 0) {
      console.log('   ⚠️  Nenhuma movimentação registrada');
    } else {
      historico.rows.forEach(h => {
        console.log(`   ${h.tipo_movimentacao.toUpperCase()}: ${h.quantidade_movimentada} kg`);
        console.log(`   Anterior: ${h.quantidade_anterior} → Posterior: ${h.quantidade_posterior}`);
        console.log(`   Motivo: ${h.motivo}`);
        console.log(`   Data: ${h.data_movimentacao}`);
        console.log('');
      });
    }

    // 5. Calcular total
    const totalLotes = lotes.rows
      .filter(l => l.status === 'ativo')
      .reduce((sum, l) => sum + parseFloat(l.quantidade_atual || 0), 0);
    
    const totalEstoque = estoque.rows.length > 0 ? parseFloat(estoque.rows[0].quantidade_atual || 0) : 0;

    console.log(`\n📊 RESUMO:`);
    console.log(`   Estoque Principal: ${totalEstoque} kg`);
    console.log(`   Total em Lotes: ${totalLotes} kg`);
    console.log(`   TOTAL GERAL: ${totalEstoque + totalLotes} kg`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkFrangoEstoque();
