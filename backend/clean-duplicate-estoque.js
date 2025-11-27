0/**
 * Script para limpar registros duplicados de estoque em tenants antigos
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

async function cleanDuplicateEstoque() {
  try {
    console.log('🧹 Limpando registros duplicados de estoque...\n');

    const tenantCorreto = '6b95b81f-8d1f-44b0-912c-68c2fdde9841'; // Secretaria de Benevides
    const tenantAntigo = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f'; // Escola de Teste

    // 1. Verificar registros duplicados em estoque_escolas
    const duplicados = await db.query(`
      SELECT 
        ee.id,
        ee.escola_id,
        ee.produto_id,
        ee.quantidade_atual,
        ee.tenant_id,
        e.nome as escola_nome,
        p.nome as produto_nome
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.tenant_id != $1
      ORDER BY ee.escola_id, ee.produto_id
    `, [tenantCorreto]);

    console.log(`📊 Registros de estoque em tenants antigos: ${duplicados.rows.length}\n`);

    if (duplicados.rows.length === 0) {
      console.log('✅ Não há registros duplicados!\n');
      return;
    }

    console.log('Registros encontrados:');
    duplicados.rows.forEach(d => {
      console.log(`   - Escola ${d.escola_id} (${d.escola_nome})`);
      console.log(`     Produto ${d.produto_id} (${d.produto_nome})`);
      console.log(`     Quantidade: ${d.quantidade_atual}`);
      console.log(`     Tenant: ${d.tenant_id === tenantAntigo ? 'Escola de Teste (ANTIGO)' : 'Outro'}`);
      console.log('');
    });

    if (!process.argv.includes('--delete')) {
      console.log('⚠️  Para deletar esses registros, execute com --delete\n');
      return;
    }

    console.log('🗑️  Deletando registros...\n');

    // 2. Deletar registros do tenant antigo
    const deleted = await db.query(`
      DELETE FROM estoque_escolas
      WHERE tenant_id != $1
      RETURNING id, escola_id, produto_id
    `, [tenantCorreto]);

    console.log(`✅ ${deleted.rows.length} registros deletados\n`);

    // 3. Verificar lotes duplicados
    const lotesDuplicados = await db.query(`
      SELECT 
        el.id,
        el.escola_id,
        el.produto_id,
        el.lote,
        el.quantidade_atual,
        el.tenant_id,
        e.nome as escola_nome,
        p.nome as produto_nome
      FROM estoque_lotes el
      JOIN escolas e ON e.id = el.escola_id
      JOIN produtos p ON p.id = el.produto_id
      WHERE el.tenant_id != $1
      ORDER BY el.escola_id, el.produto_id
    `, [tenantCorreto]);

    console.log(`📦 Lotes em tenants antigos: ${lotesDuplicados.rows.length}\n`);

    if (lotesDuplicados.rows.length > 0) {
      console.log('Lotes encontrados:');
      lotesDuplicados.rows.forEach(l => {
        console.log(`   - Lote ${l.lote}`);
        console.log(`     Escola ${l.escola_id} (${l.escola_nome})`);
        console.log(`     Produto ${l.produto_id} (${l.produto_nome})`);
        console.log(`     Quantidade: ${l.quantidade_atual}`);
        console.log('');
      });

      // Deletar lotes do tenant antigo
      const deletedLotes = await db.query(`
        DELETE FROM estoque_lotes
        WHERE tenant_id != $1
        RETURNING id
      `, [tenantCorreto]);

      console.log(`✅ ${deletedLotes.rows.length} lotes deletados\n`);
    }

    // 4. Verificar histórico duplicado
    const historicoDuplicado = await db.query(`
      SELECT COUNT(*) as total
      FROM estoque_escolas_historico eeh
      JOIN escolas e ON e.id = eeh.escola_id
      WHERE e.tenant_id != $1
    `, [tenantCorreto]);

    if (parseInt(historicoDuplicado.rows[0].total) > 0) {
      console.log(`📜 Histórico em tenants antigos: ${historicoDuplicado.rows[0].total}`);
      
      // Deletar histórico do tenant antigo
      const deletedHistorico = await db.query(`
        DELETE FROM estoque_escolas_historico eeh
        USING escolas e
        WHERE eeh.escola_id = e.id AND e.tenant_id != $1
        RETURNING eeh.id
      `, [tenantCorreto]);

      console.log(`✅ ${deletedHistorico.rows.length} registros de histórico deletados\n`);
    }

    console.log('✅ Limpeza concluída!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Recarregue a página no frontend');
    console.log('   2. Os dados agora devem aparecer corretamente');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

cleanDuplicateEstoque();
