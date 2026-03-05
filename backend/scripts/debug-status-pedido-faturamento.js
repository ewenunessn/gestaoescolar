/**
 * Script para debugar o problema de status do pedido ao criar faturamento
 * 
 * Problema relatado:
 * - Ao criar faturamento, o status do pedido muda para "concluído"
 * - Não deveria mudar, pois só deve ser concluído quando RECEBER tudo
 * - Ao tentar mudar de "concluído" para "pendente" dá erro
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function debugarStatusPedido() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Investigando problema de status do pedido...\n');
    
    // 1. Buscar pedidos com faturamento mas sem recebimento completo
    console.log('📊 Buscando pedidos com faturamento mas status incorreto...\n');
    
    const pedidosComProblema = await client.query(`
      SELECT 
        p.id,
        p.numero,
        p.status,
        p.data_pedido,
        COUNT(DISTINCT fp.id) as total_faturamentos,
        COUNT(DISTINCT pi.id) as total_itens,
        COUNT(DISTINCT r.id) as total_recebimentos,
        COALESCE(SUM(pi.quantidade), 0) as quantidade_pedido,
        COALESCE(SUM(r.quantidade_recebida), 0) as quantidade_recebida
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      LEFT JOIN faturamentos_pedidos fp ON p.id = fp.pedido_id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE p.status = 'concluido'
      GROUP BY p.id, p.numero, p.status, p.data_pedido
      HAVING 
        COUNT(DISTINCT fp.id) > 0 
        AND (
          COALESCE(SUM(r.quantidade_recebida), 0) < COALESCE(SUM(pi.quantidade), 0)
          OR COUNT(DISTINCT r.id) = 0
        )
      ORDER BY p.data_pedido DESC
      LIMIT 10
    `);
    
    if (pedidosComProblema.rows.length === 0) {
      console.log('✅ Nenhum pedido com status incorreto encontrado!\n');
    } else {
      console.log(`⚠️  Encontrados ${pedidosComProblema.rows.length} pedidos com possível problema:\n`);
      
      pedidosComProblema.rows.forEach(pedido => {
        console.log(`Pedido: ${pedido.numero} (ID: ${pedido.id})`);
        console.log(`  Status: ${pedido.status}`);
        console.log(`  Faturamentos: ${pedido.total_faturamentos}`);
        console.log(`  Itens: ${pedido.total_itens}`);
        console.log(`  Recebimentos: ${pedido.total_recebimentos}`);
        console.log(`  Quantidade pedido: ${pedido.quantidade_pedido}`);
        console.log(`  Quantidade recebida: ${pedido.quantidade_recebida}`);
        console.log(`  Percentual recebido: ${pedido.quantidade_pedido > 0 ? ((pedido.quantidade_recebida / pedido.quantidade_pedido) * 100).toFixed(2) : 0}%`);
        console.log('');
      });
    }
    
    // 2. Verificar se há triggers ou funções que alteram status automaticamente
    console.log('🔍 Verificando triggers na tabela pedidos...\n');
    
    const triggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'pedidos'
      ORDER BY trigger_name
    `);
    
    if (triggers.rows.length === 0) {
      console.log('✅ Nenhum trigger encontrado na tabela pedidos\n');
    } else {
      console.log(`⚠️  Encontrados ${triggers.rows.length} triggers:\n`);
      triggers.rows.forEach(trigger => {
        console.log(`Trigger: ${trigger.trigger_name}`);
        console.log(`  Evento: ${trigger.event_manipulation}`);
        console.log(`  Ação: ${trigger.action_statement}`);
        console.log('');
      });
    }
    
    // 3. Verificar se há triggers nas tabelas relacionadas
    console.log('🔍 Verificando triggers em tabelas relacionadas...\n');
    
    const triggersRelacionados = await client.query(`
      SELECT 
        event_object_table,
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table IN ('faturamentos_pedidos', 'faturamentos_itens', 'recebimentos')
      ORDER BY event_object_table, trigger_name
    `);
    
    if (triggersRelacionados.rows.length === 0) {
      console.log('✅ Nenhum trigger encontrado nas tabelas relacionadas\n');
    } else {
      console.log(`Encontrados ${triggersRelacionados.rows.length} triggers:\n`);
      triggersRelacionados.rows.forEach(trigger => {
        console.log(`Tabela: ${trigger.event_object_table}`);
        console.log(`  Trigger: ${trigger.trigger_name}`);
        console.log(`  Evento: ${trigger.event_manipulation}`);
        console.log(`  Ação: ${trigger.action_statement}`);
        console.log('');
      });
    }
    
    // 4. Testar mudança de status
    console.log('🧪 Testando mudança de status de concluído para pendente...\n');
    
    await client.query('BEGIN');
    
    // Criar pedido de teste
    const pedidoTeste = await client.query(`
      INSERT INTO pedidos (numero, status, valor_total, competencia_mes_ano, usuario_criacao_id)
      VALUES ('DEBUG-' || EXTRACT(EPOCH FROM NOW())::TEXT, 'concluido', 100, '2026-03', 1)
      RETURNING id, numero, status
    `);
    
    const pedidoId = pedidoTeste.rows[0].id;
    console.log(`✅ Pedido de teste criado: ${pedidoTeste.rows[0].numero}`);
    console.log(`   Status inicial: ${pedidoTeste.rows[0].status}\n`);
    
    // Tentar mudar status
    try {
      const resultado = await client.query(`
        UPDATE pedidos
        SET status = 'pendente', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, numero, status
      `, [pedidoId]);
      
      console.log(`✅ Status alterado com sucesso!`);
      console.log(`   Status novo: ${resultado.rows[0].status}\n`);
    } catch (error) {
      console.log(`❌ Erro ao alterar status: ${error.message}\n`);
    }
    
    await client.query('ROLLBACK');
    console.log('🔄 Rollback executado (pedido de teste removido)\n');
    
    console.log('✅ Investigação concluída!');
    
  } catch (error) {
    console.error('❌ Erro na investigação:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

debugarStatusPedido()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
