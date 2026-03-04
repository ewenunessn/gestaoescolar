/**
 * Script para adicionar PRIMARY KEY em pedido_itens no NEON
 */

const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function addPK() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Adicionando PRIMARY KEY em pedido_itens...\n');
    
    await client.query(`ALTER TABLE pedido_itens ADD PRIMARY KEY (id)`);
    console.log('✅ PRIMARY KEY adicionada em pedido_itens');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⏭️  PRIMARY KEY já existe em pedido_itens');
    } else {
      console.error('❌ Erro:', error.message);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

addPK()
  .then(() => {
    console.log('\n🎉 Concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
