/**
 * Script para atualizar status de pedidos existentes
 * Mapeia status antigos para novos
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Mapeamento de status antigos para novos
const STATUS_MAP = {
  'rascunho': 'pendente',
  'pendente': 'pendente',
  'aprovado': 'pendente',
  'em_separacao': 'pendente',
  'enviado': 'recebido_parcial',
  'entregue': 'concluido',
  'cancelado': 'cancelado'
};

async function updateStatus(pool, dbName) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔧 Atualizando status de pedidos em ${dbName}...\n`);
    
    // Buscar pedidos com status antigos
    const pedidos = await client.query(`
      SELECT id, numero, status
      FROM pedidos
      WHERE status NOT IN ('pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado')
      ORDER BY id
    `);

    if (pedidos.rows.length === 0) {
      console.log('✅ Todos os pedidos já estão com status atualizados');
      return;
    }

    console.log(`📋 ${pedidos.rows.length} pedido(s) para atualizar\n`);

    for (const pedido of pedidos.rows) {
      const statusAntigo = pedido.status;
      const statusNovo = STATUS_MAP[statusAntigo] || 'pendente';
      
      await client.query(`
        UPDATE pedidos 
        SET status = $1,
            observacoes = COALESCE(observacoes, '') || '\n[Migração]: Status alterado de "${statusAntigo}" para "${statusNovo}"'
        WHERE id = $2
      `, [statusNovo, pedido.id]);

      console.log(`  ✅ ${pedido.numero}: ${statusAntigo} → ${statusNovo}`);
    }

    console.log(`\n✅ ${pedidos.rows.length} pedido(s) atualizado(s) em ${dbName}`);

    // Mostrar resumo
    const resumo = await client.query(`
      SELECT status, COUNT(*) as total
      FROM pedidos
      GROUP BY status
      ORDER BY status
    `);

    console.log('\n📊 Resumo de status:');
    for (const row of resumo.rows) {
      console.log(`  - ${row.status}: ${row.total}`);
    }

  } catch (error) {
    console.error(`❌ Erro em ${dbName}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Atualizando status de pedidos...');

  // LOCAL
  if (process.env.DATABASE_URL) {
    const localPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    await updateStatus(localPool, 'LOCAL');
    await localPool.end();
  } else {
    console.log('⚠️  DATABASE_URL não configurada, pulando LOCAL');
  }

  // NEON
  if (process.env.NEON_DATABASE_URL) {
    const neonPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await updateStatus(neonPool, 'NEON');
    await neonPool.end();
  } else {
    console.log('⚠️  NEON_DATABASE_URL não configurada, pulando NEON');
  }

  console.log('\n✅ Atualização concluída em ambos os bancos!');
}

main()
  .then(() => {
    console.log('\n🎉 Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
