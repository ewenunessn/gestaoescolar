/**
 * Script para remover campo unidade de contrato_produtos APENAS no Neon
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function aplicarNoNeon() {
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
    console.log('\n🔄 Aplicando migration no Neon...\n');
    
    await client.query('BEGIN');
    
    // Verificar se a coluna existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' 
        AND column_name = 'unidade'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('✅ Coluna unidade já foi removida do Neon');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log('📝 Removendo coluna unidade...');
    await client.query('ALTER TABLE contrato_produtos DROP COLUMN IF EXISTS unidade CASCADE');
    
    console.log('📝 Atualizando views...');
    
    // Atualizar view vw_pedidos_completos se existir
    const viewExists = await client.query(`
      SELECT 1 FROM information_schema.views 
      WHERE table_name = 'vw_pedidos_completos'
    `);
    
    if (viewExists.rows.length > 0) {
      await client.query('DROP VIEW IF EXISTS vw_pedidos_completos CASCADE');
      console.log('✅ View vw_pedidos_completos removida (será recriada se necessário)');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration aplicada com sucesso no Neon!');
    console.log('\n📌 Próximo passo: Fazer deploy no Vercel para atualizar o código');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao aplicar migration no Neon:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarNoNeon()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error.message);
    process.exit(1);
  });
