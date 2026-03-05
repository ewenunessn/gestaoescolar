/**
 * Script para verificar pedidos com faturamento e seus status
 * Objetivo: Identificar se há pedidos com status "concluído" que só têm faturamento mas não recebimento completo
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verificarPedidos() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando pedidos com faturamento...\n');
    
    // 1. Listar todos os pedidos com faturamento
    const pedidosComFaturamento = await client.query(`
      SELECT 
        p.id,
        p.numero,
        p.status,
        p.data_pedido,
        p.competencia_mes_ano,
        COUNT(DISTINCT fp.id) as total_faturamentos,
        COUNT(DISTINCT pi.id) as total_itens_pedido,
        COUNT(DISTINCT fi.id) as total_itens_faturados,
        COUNT(DISTINCT r.id) as total_recebimentos,
        COALESCE(SUM(DISTINCT pi.quantidade), 0) as quantidade_total_pedido,
        COALESCE(SUM(r.quantidade_recebida), 0) as quantidade_total_recebida,
        COALESCE(SUM(fi.quantidade_alocada), 0) as quantidade_total_faturada
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      LEFT JOIN faturamentos_pedidos fp ON p.id = fp.pedido_id
      LEFT JOIN faturamentos_itens fi ON fp.id = fi.faturamento_pedido_id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE fp.id IS NOT NULL
      GROUP BY p.id, p.numero, p.status, p.data_pedido, p.competencia_mes_ano
      ORDER BY p.data_pedido DESC
      LIMIT 20
    `);
    
    if (pedidosComFaturamento.rows.length === 0) {
      console.log('❌ Nenhum pedido com faturamento encontrado\n');
      return;
    }
    
    console.log(`📊 Encontrados ${pedidosComFaturamento.rows.length} pedidos com faturamento:\n`);
    
    let pedidosComProblema = 0;
    
    for (const pedido of pedidosComFaturamento.rows) {
      const percentualRecebido = pedido.quantidade_total_pedido > 0 
        ? (parseFloat(pedido.quantidade_total_recebida) / parseFloat(pedido.quantidade_total_pedido) * 100).toFixed(2)
        : '0.00';
      
      const percentualFaturado = pedido.quantidade_total_pedido > 0
        ? (parseFloat(pedido.quantidade_total_faturada) / parseFloat(pedido.quantidade_total_pedido) * 100).toFixed(2)
        : '0.00';
      
      const temProblema = pedido.status === 'concluido' && parseFloat(percentualRecebido) < 100;
      
      if (temProblema) {
        pedidosComProblema++;
      }
      
      const icone = temProblema ? '⚠️ ' : '✅';
      
      console.log(`${icone} Pedido: ${pedido.numero} (ID: ${pedido.id})`);
      console.log(`   Status: ${pedido.status}`);
      console.log(`   Data: ${pedido.data_pedido}`);
      console.log(`   Competência: ${pedido.competencia_mes_ano}`);
      console.log(`   Faturamentos: ${pedido.total_faturamentos}`);
      console.log(`   Itens no pedido: ${pedido.total_itens_pedido}`);
      console.log(`   Itens faturados: ${pedido.total_itens_faturados}`);
      console.log(`   Recebimentos: ${pedido.total_recebimentos}`);
      console.log(`   Quantidade pedido: ${pedido.quantidade_total_pedido}`);
      console.log(`   Quantidade faturada: ${pedido.quantidade_total_faturada} (${percentualFaturado}%)`);
      console.log(`   Quantidade recebida: ${pedido.quantidade_total_recebida} (${percentualRecebido}%)`);
      
      if (temProblema) {
        console.log(`   ⚠️  PROBLEMA: Status "concluído" mas só ${percentualRecebido}% recebido!`);
      }
      
      console.log('');
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Total de pedidos com faturamento: ${pedidosComFaturamento.rows.length}`);
    console.log(`   Pedidos com possível problema: ${pedidosComProblema}`);
    
    if (pedidosComProblema > 0) {
      console.log(`\n⚠️  Encontrados ${pedidosComProblema} pedidos com status "concluído" mas recebimento incompleto!`);
    } else {
      console.log(`\n✅ Todos os pedidos com status "concluído" têm recebimento completo!`);
    }
    
    // 2. Verificar se há pedidos recentes que mudaram de status após criar faturamento
    console.log(`\n\n🔍 Verificando histórico de mudanças de status...\n`);
    
    const pedidosRecentes = await client.query(`
      SELECT 
        p.id,
        p.numero,
        p.status,
        p.created_at,
        p.updated_at,
        fp.data_faturamento,
        (fp.data_faturamento - p.created_at) as tempo_ate_faturamento,
        (p.updated_at - fp.data_faturamento) as tempo_apos_faturamento
      FROM pedidos p
      JOIN faturamentos_pedidos fp ON p.id = fp.pedido_id
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND p.status = 'concluido'
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    
    if (pedidosRecentes.rows.length > 0) {
      console.log(`📊 Pedidos recentes com status "concluído":\n`);
      
      for (const pedido of pedidosRecentes.rows) {
        console.log(`Pedido: ${pedido.numero}`);
        console.log(`   Criado em: ${pedido.created_at}`);
        console.log(`   Faturamento em: ${pedido.data_faturamento}`);
        console.log(`   Última atualização: ${pedido.updated_at}`);
        console.log(`   Tempo até faturamento: ${pedido.tempo_ate_faturamento}`);
        console.log(`   Tempo após faturamento: ${pedido.tempo_apos_faturamento}`);
        console.log('');
      }
    } else {
      console.log('✅ Nenhum pedido recente com status "concluído" encontrado\n');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verificarPedidos()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verificação falhou:', error);
    process.exit(1);
  });
