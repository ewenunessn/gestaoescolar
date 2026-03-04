/**
 * Script para verificar e corrigir nome da tabela pedido_itens no Neon
 * Verifica se existe pedidos_itens e renomeia para pedido_itens
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixTableName() {
  if (!process.env.NEON_DATABASE_URL) {
    console.log('⚠️  NEON_DATABASE_URL não configurada');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verificando tabelas de pedido_itens no Neon...\n');
    
    // Verificar quais tabelas existem
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('pedido_itens', 'pedidos_itens')
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas encontradas:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    const hasPedidoItens = tables.rows.some(r => r.table_name === 'pedido_itens');
    const hasPedidosItens = tables.rows.some(r => r.table_name === 'pedidos_itens');
    
    if (hasPedidoItens && !hasPedidosItens) {
      console.log('\n✅ Tabela correta (pedido_itens) já existe!');
      console.log('   Nenhuma ação necessária.');
      return;
    }
    
    if (!hasPedidoItens && hasPedidosItens) {
      console.log('\n⚠️  Encontrada tabela com nome incorreto: pedidos_itens');
      console.log('🔄 Renomeando para pedido_itens...');
      
      await client.query('BEGIN');
      
      // Renomear tabela
      await client.query('ALTER TABLE pedidos_itens RENAME TO pedido_itens');
      
      // Verificar e renomear constraints se necessário
      const constraints = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'pedido_itens'
          AND constraint_name LIKE '%pedidos_itens%'
      `);
      
      for (const constraint of constraints.rows) {
        const newName = constraint.constraint_name.replace('pedidos_itens', 'pedido_itens');
        console.log(`  Renomeando constraint: ${constraint.constraint_name} -> ${newName}`);
        await client.query(`ALTER TABLE pedido_itens RENAME CONSTRAINT ${constraint.constraint_name} TO ${newName}`);
      }
      
      // Verificar e renomear índices se necessário
      const indexes = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'pedido_itens'
          AND indexname LIKE '%pedidos_itens%'
      `);
      
      for (const index of indexes.rows) {
        const newName = index.indexname.replace('pedidos_itens', 'pedido_itens');
        console.log(`  Renomeando índice: ${index.indexname} -> ${newName}`);
        await client.query(`ALTER INDEX ${index.indexname} RENAME TO ${newName}`);
      }
      
      await client.query('COMMIT');
      
      console.log('\n✅ Tabela renomeada com sucesso!');
      console.log('   pedidos_itens -> pedido_itens');
      return;
    }
    
    if (hasPedidoItens && hasPedidosItens) {
      console.log('\n⚠️  ATENÇÃO: Ambas as tabelas existem!');
      console.log('   - pedido_itens (correta)');
      console.log('   - pedidos_itens (duplicada)');
      
      // Verificar se pedidos_itens tem dados
      const count = await client.query('SELECT COUNT(*) as total FROM pedidos_itens');
      const total = parseInt(count.rows[0].total);
      
      if (total === 0) {
        console.log(`\n   pedidos_itens está vazia (${total} registros)`);
        console.log('   Pode ser removida com segurança.');
        console.log('\n   Execute: DROP TABLE pedidos_itens CASCADE;');
      } else {
        console.log(`\n   ⚠️  pedidos_itens tem ${total} registros!`);
        console.log('   Verifique qual tabela está sendo usada antes de remover.');
      }
      return;
    }
    
    if (!hasPedidoItens && !hasPedidosItens) {
      console.log('\n❌ Nenhuma tabela de pedido_itens encontrada!');
      console.log('   Execute a migration de criação de pedidos.');
      return;
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixTableName()
  .then(() => {
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
