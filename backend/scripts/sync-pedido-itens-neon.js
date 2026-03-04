/**
 * Script para sincronizar estrutura de pedido_itens no NEON
 * Adiciona constraints, FKs e índices que existem no LOCAL
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function syncNeon() {
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
    console.log('\n🔧 Sincronizando estrutura de pedido_itens no NEON...\n');
    
    // 1. Adicionar CHECK constraints
    console.log('📋 Adicionando CHECK constraints...');
    
    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_quantidade_check 
        CHECK (quantidade > 0)
      `);
      console.log('  ✅ pedido_itens_quantidade_check');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  pedido_itens_quantidade_check já existe');
      } else {
        throw e;
      }
    }

    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_preco_unitario_check 
        CHECK (preco_unitario >= 0)
      `);
      console.log('  ✅ pedido_itens_preco_unitario_check');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  pedido_itens_preco_unitario_check já existe');
      } else {
        throw e;
      }
    }

    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_valor_total_check 
        CHECK (valor_total >= 0)
      `);
      console.log('  ✅ pedido_itens_valor_total_check');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  pedido_itens_valor_total_check já existe');
      } else {
        throw e;
      }
    }

    // 2. Adicionar Foreign Keys
    console.log('\n🔗 Adicionando Foreign Keys...');
    
    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_pedido_id_fkey 
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
      `);
      console.log('  ✅ FK pedido_id -> pedidos(id)');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  FK pedido_id já existe');
      } else {
        throw e;
      }
    }

    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_contrato_produto_id_fkey 
        FOREIGN KEY (contrato_produto_id) REFERENCES contrato_produtos(id) ON DELETE RESTRICT
      `);
      console.log('  ✅ FK contrato_produto_id -> contrato_produtos(id)');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  FK contrato_produto_id já existe');
      } else {
        throw e;
      }
    }

    try {
      await client.query(`
        ALTER TABLE pedido_itens 
        ADD CONSTRAINT pedido_itens_produto_id_fkey 
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
      `);
      console.log('  ✅ FK produto_id -> produtos(id)');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('  ⏭️  FK produto_id já existe');
      } else {
        throw e;
      }
    }

    // 3. Adicionar índices
    console.log('\n📇 Adicionando índices...');
    
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido 
        ON pedido_itens(pedido_id)
      `);
      console.log('  ✅ idx_pedido_itens_pedido');
    } catch (e) {
      console.log('  ⏭️  idx_pedido_itens_pedido já existe');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pedido_itens_contrato_produto 
        ON pedido_itens(contrato_produto_id)
      `);
      console.log('  ✅ idx_pedido_itens_contrato_produto');
    } catch (e) {
      console.log('  ⏭️  idx_pedido_itens_contrato_produto já existe');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pedido_itens_produto 
        ON pedido_itens(produto_id)
      `);
      console.log('  ✅ idx_pedido_itens_produto');
    } catch (e) {
      console.log('  ⏭️  idx_pedido_itens_produto já existe');
    }

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pedido_itens_tenant_id 
        ON pedido_itens(tenant_id)
      `);
      console.log('  ✅ idx_pedido_itens_tenant_id');
    } catch (e) {
      console.log('  ⏭️  idx_pedido_itens_tenant_id já existe');
    }

    console.log('\n✅ Sincronização concluída!');
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncNeon()
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
