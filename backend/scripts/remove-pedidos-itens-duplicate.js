/**
 * Script para remover tabela duplicada pedidos_itens do Neon
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function removeDuplicate() {
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
    console.log('\n🗑️  Removendo tabela duplicada pedidos_itens...\n');
    
    // Verificar se a tabela existe
    const check = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'pedidos_itens'
    `);
    
    if (check.rows.length === 0) {
      console.log('✅ Tabela pedidos_itens não existe (já foi removida)');
      return;
    }
    
    // Verificar se tem dados
    const count = await client.query('SELECT COUNT(*) as total FROM pedidos_itens');
    const total = parseInt(count.rows[0].total);
    
    if (total > 0) {
      console.log(`⚠️  ATENÇÃO: pedidos_itens tem ${total} registros!`);
      console.log('   Abortando remoção por segurança.');
      console.log('   Verifique os dados antes de remover.');
      return;
    }
    
    console.log('📝 Removendo tabela pedidos_itens (vazia)...');
    await client.query('DROP TABLE pedidos_itens CASCADE');
    
    console.log('✅ Tabela pedidos_itens removida com sucesso!');
    console.log('\n📌 Tabela correta (pedido_itens) permanece intacta.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

removeDuplicate()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
