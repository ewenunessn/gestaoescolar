/**
 * Script para verificar tabela pedido_itens no banco LOCAL
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkLocal() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL não configurada');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando tabelas de pedido_itens no BANCO LOCAL...\n');
    
    // Verificar quais tabelas existem
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('pedido_itens', 'pedidos_itens')
      ORDER BY table_name
    `);
    
    if (tables.rows.length === 0) {
      console.log('❌ Nenhuma tabela de pedido_itens encontrada!');
      return;
    }
    
    console.log('📋 Tabelas encontradas:');
    for (const row of tables.rows) {
      const count = await client.query(`SELECT COUNT(*) as total FROM ${row.table_name}`);
      const total = parseInt(count.rows[0].total);
      console.log(`  - ${row.table_name} (${total} registros)`);
    }
    
    const hasPedidoItens = tables.rows.some(r => r.table_name === 'pedido_itens');
    const hasPedidosItens = tables.rows.some(r => r.table_name === 'pedidos_itens');
    
    console.log('\n📊 Status:');
    
    if (hasPedidoItens && !hasPedidosItens) {
      console.log('✅ Configuração correta!');
      console.log('   Usando: pedido_itens');
    } else if (!hasPedidoItens && hasPedidosItens) {
      console.log('⚠️  Tabela com nome incorreto!');
      console.log('   Encontrada: pedidos_itens');
      console.log('   Esperada: pedido_itens');
      console.log('\n💡 Solução: Renomear tabela');
      console.log('   ALTER TABLE pedidos_itens RENAME TO pedido_itens;');
    } else if (hasPedidoItens && hasPedidosItens) {
      console.log('⚠️  Ambas as tabelas existem!');
      console.log('   Código usa: pedido_itens');
      console.log('   Duplicada: pedidos_itens');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkLocal()
  .then(() => {
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
