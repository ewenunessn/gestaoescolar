const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function debugQuantidadeEntregue() {
  try {
    console.log('🔍 Verificando dados de entregas...\n');

    // Buscar itens com histórico de entregas
    const result = await pool.query(`
      SELECT 
        gpe.id,
        p.nome as produto_nome,
        e.nome as escola_nome,
        gpe.quantidade as quantidade_programada,
        gpe.unidade,
        gpe.quantidade_total_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        gpe.entrega_confirmada,
        (
          SELECT json_agg(
            json_build_object(
              'id', he.id,
              'quantidade_entregue', he.quantidade_entregue,
              'data_entrega', he.data_entrega,
              'nome_quem_entregou', he.nome_quem_entregou,
              'nome_quem_recebeu', he.nome_quem_recebeu
            ) ORDER BY he.data_entrega DESC
          )
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        ) as historico_entregas,
        (
          SELECT COALESCE(SUM(he.quantidade_entregue), 0)
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        ) as soma_historico
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.para_entrega = true
        AND EXISTS (
          SELECT 1 FROM historico_entregas he 
          WHERE he.guia_produto_escola_id = gpe.id
        )
      ORDER BY gpe.id DESC
      LIMIT 10
    `);

    console.log(`📊 Encontrados ${result.rows.length} itens com histórico de entregas:\n`);

    for (const item of result.rows) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Item ID: ${item.id}`);
      console.log(`   Produto: ${item.produto_nome}`);
      console.log(`   Escola: ${item.escola_nome}`);
      console.log(`   Programado: ${item.quantidade_programada} ${item.unidade}`);
      console.log(`   quantidade_total_entregue (coluna): ${item.quantidade_total_entregue}`);
      console.log(`   soma_historico (calculado): ${item.soma_historico}`);
      console.log(`   saldo_pendente: ${item.saldo_pendente}`);
      console.log(`   entrega_confirmada: ${item.entrega_confirmada}`);
      
      if (item.quantidade_total_entregue !== item.soma_historico) {
        console.log(`   ⚠️  INCONSISTÊNCIA: coluna (${item.quantidade_total_entregue}) != soma (${item.soma_historico})`);
      }
      
      if (item.historico_entregas) {
        console.log(`   📋 Histórico (${item.historico_entregas.length} entregas):`);
        item.historico_entregas.forEach((h, i) => {
          console.log(`      ${i + 1}. ${h.quantidade_entregue} ${item.unidade} - ${h.nome_quem_entregou} → ${h.nome_quem_recebeu} (${new Date(h.data_entrega).toLocaleString('pt-BR')})`);
        });
      }
      console.log('');
    }

    // Verificar se há inconsistências
    const inconsistencias = await pool.query(`
      SELECT 
        gpe.id,
        p.nome as produto_nome,
        gpe.quantidade_total_entregue,
        (
          SELECT COALESCE(SUM(he.quantidade_entregue), 0)
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        ) as soma_real
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      WHERE gpe.para_entrega = true
        AND gpe.quantidade_total_entregue != (
          SELECT COALESCE(SUM(he.quantidade_entregue), 0)
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        )
    `);

    if (inconsistencias.rows.length > 0) {
      console.log('\n⚠️  INCONSISTÊNCIAS ENCONTRADAS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      for (const inc of inconsistencias.rows) {
        console.log(`Item ${inc.id} (${inc.produto_nome}):`);
        console.log(`  Coluna: ${inc.quantidade_total_entregue}`);
        console.log(`  Soma real: ${inc.soma_real}`);
        console.log('');
      }
      
      console.log('\n🔧 Para corrigir, execute:');
      console.log('   node backend/scripts/fix-quantidade-total-entregue.js\n');
    } else {
      console.log('\n✅ Nenhuma inconsistência encontrada!\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugQuantidadeEntregue();
