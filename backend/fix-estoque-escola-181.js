require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function fixEstoque() {
  const client = await pool.connect();
  
  try {
    const escolaId = 181;
    const produtoId = 40; // Arroz
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    
    console.log('🔧 Corrigindo estoque da escola 181 - Produto Arroz...\n');
    
    await client.query('BEGIN');
    
    // 1. Zerar todos os lotes
    console.log('1️⃣ Zerando lotes...');
    const updateLotes = await client.query(`
      UPDATE estoque_lotes
      SET quantidade_atual = 0, status = 'esgotado'
      WHERE escola_id = $1 AND produto_id = $2 AND tenant_id = $3
    `, [escolaId, produtoId, tenantId]);
    console.log(`   ✅ ${updateLotes.rowCount} lotes atualizados\n`);
    
    // 2. Zerar estoque principal
    console.log('2️⃣ Zerando estoque principal...');
    const updateEstoque = await client.query(`
      UPDATE estoque_escolas
      SET quantidade_atual = 0
      WHERE escola_id = $1 AND produto_id = $2 AND tenant_id = $3
    `, [escolaId, produtoId, tenantId]);
    console.log(`   ✅ ${updateEstoque.rowCount} registros atualizados\n`);
    
    // 3. Limpar histórico (opcional - comentado para manter auditoria)
    // console.log('3️⃣ Limpando histórico...');
    // const deleteHistorico = await client.query(`
    //   DELETE FROM estoque_escolas_historico
    //   WHERE escola_id = $1 AND produto_id = $2 AND tenant_id = $3
    // `, [escolaId, produtoId, tenantId]);
    // console.log(`   ✅ ${deleteHistorico.rowCount} registros removidos\n`);
    
    await client.query('COMMIT');
    
    console.log('✅ Estoque corrigido com sucesso!');
    console.log('\n💡 Agora você pode fazer novas movimentações a partir do zero.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixEstoque();
