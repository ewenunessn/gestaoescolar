/**
 * Script para corrigir dados órfãos (sem tenant_id)
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

async function fixOrphanData() {
  try {
    console.log('🔧 Corrigindo dados órfãos...\n');

    const tenantBenevides = '6b95b81f-8d1f-44b0-912c-68c2fdde9841';

    // 1. contrato_produtos
    const contratosProdutos = await db.query(`
      SELECT id FROM contrato_produtos WHERE tenant_id IS NULL
    `);
    
    if (contratosProdutos.rows.length > 0) {
      console.log(`📦 Corrigindo ${contratosProdutos.rows.length} contrato_produtos órfãos...`);
      await db.query(`
        UPDATE contrato_produtos SET tenant_id = $1 WHERE tenant_id IS NULL
      `, [tenantBenevides]);
      console.log('✅ contrato_produtos corrigidos\n');
    }

    // 2. cardapios
    const cardapios = await db.query(`
      SELECT id, nome FROM cardapios WHERE tenant_id IS NULL
    `);
    
    if (cardapios.rows.length > 0) {
      console.log(`📋 Corrigindo ${cardapios.rows.length} cardápios órfãos...`);
      cardapios.rows.forEach(c => {
        console.log(`   - Cardápio ${c.id}: ${c.nome || 'Sem nome'}`);
      });
      await db.query(`
        UPDATE cardapios SET tenant_id = $1 WHERE tenant_id IS NULL
      `, [tenantBenevides]);
      console.log('✅ cardapios corrigidos\n');
    }

    // 3. cardapio_refeicoes
    const cardapioRefeicoes = await db.query(`
      SELECT id FROM cardapio_refeicoes WHERE tenant_id IS NULL
    `);
    
    if (cardapioRefeicoes.rows.length > 0) {
      console.log(`🍽️  Corrigindo ${cardapioRefeicoes.rows.length} cardapio_refeicoes órfãos...`);
      await db.query(`
        UPDATE cardapio_refeicoes SET tenant_id = $1 WHERE tenant_id IS NULL
      `, [tenantBenevides]);
      console.log('✅ cardapio_refeicoes corrigidos\n');
    }

    // 4. refeicao_produtos
    const refeicaoProdutos = await db.query(`
      SELECT id FROM refeicao_produtos WHERE tenant_id IS NULL
    `);
    
    if (refeicaoProdutos.rows.length > 0) {
      console.log(`🥘 Corrigindo ${refeicaoProdutos.rows.length} refeicao_produtos órfãos...`);
      await db.query(`
        UPDATE refeicao_produtos SET tenant_id = $1 WHERE tenant_id IS NULL
      `, [tenantBenevides]);
      console.log('✅ refeicao_produtos corrigidos\n');
    }

    console.log('✅ Todos os dados órfãos foram corrigidos!');
    console.log('\n📊 Executando verificação final...\n');

    // Verificação final
    const verificacao = [
      { tabela: 'contrato_produtos', query: 'SELECT COUNT(*) as total FROM contrato_produtos WHERE tenant_id IS NULL' },
      { tabela: 'cardapios', query: 'SELECT COUNT(*) as total FROM cardapios WHERE tenant_id IS NULL' },
      { tabela: 'cardapio_refeicoes', query: 'SELECT COUNT(*) as total FROM cardapio_refeicoes WHERE tenant_id IS NULL' },
      { tabela: 'refeicao_produtos', query: 'SELECT COUNT(*) as total FROM refeicao_produtos WHERE tenant_id IS NULL' }
    ];

    let totalOrfaos = 0;
    for (const v of verificacao) {
      const result = await db.query(v.query);
      const count = parseInt(result.rows[0].total);
      totalOrfaos += count;
      const status = count === 0 ? '✅' : '❌';
      console.log(`${status} ${v.tabela}: ${count} órfãos`);
    }

    if (totalOrfaos === 0) {
      console.log('\n🎉 PERFEITO! Não há mais dados órfãos!');
      console.log('   Todos os dados estão associados ao tenant "Secretaria de Benevides"\n');
    } else {
      console.log(`\n⚠️  Ainda há ${totalOrfaos} dados órfãos`);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

fixOrphanData();
