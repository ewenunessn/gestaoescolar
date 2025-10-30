/**
 * Script para testar o reset no banco Neon
 */

const { Pool } = require('pg');

// Configuração do banco Neon
const pool = new Pool({
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_PDfBTKRsi29G',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testReset() {
  console.log('🧪 Testando função de reset no Neon...\n');
  
  try {
    // Verificar quantidades antes do reset
    console.log('📊 Contando registros antes do reset...');
    
    const beforeCounts = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM estoque_escolas'),
      pool.query('SELECT COUNT(*) as count FROM estoque_lotes'),
      pool.query('SELECT COUNT(*) as count FROM estoque_movimentacoes'),
      pool.query('SELECT COUNT(*) as count FROM estoque_escolas_historico')
    ]);
    
    console.log(`   - Estoques: ${beforeCounts[0].rows[0].count}`);
    console.log(`   - Lotes: ${beforeCounts[1].rows[0].count}`);
    console.log(`   - Movimentações: ${beforeCounts[2].rows[0].count}`);
    console.log(`   - Histórico: ${beforeCounts[3].rows[0].count}`);
    
    console.log('\n🔄 Executando reset...');
    
    // Simular o reset (sem fazer backup para teste)
    await pool.query('BEGIN');
    
    try {
      // Deletar movimentações de lotes primeiro
      const deleteMovimentacoes = await pool.query('DELETE FROM estoque_movimentacoes');
      
      // Deletar histórico
      const deleteHistorico = await pool.query('DELETE FROM estoque_escolas_historico');
      
      // Deletar lotes
      const deleteLotes = await pool.query('DELETE FROM estoque_lotes');
      
      // Deletar estoques
      const deleteEstoques = await pool.query('DELETE FROM estoque_escolas');
      
      await pool.query('COMMIT');
      
      console.log('✅ Reset executado com sucesso!');
      console.log(`   - Movimentações deletadas: ${deleteMovimentacoes.rowCount}`);
      console.log(`   - Histórico deletado: ${deleteHistorico.rowCount}`);
      console.log(`   - Lotes deletados: ${deleteLotes.rowCount}`);
      console.log(`   - Estoques deletados: ${deleteEstoques.rowCount}`);
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
    // Verificar quantidades após o reset
    console.log('\n📊 Contando registros após o reset...');
    
    const afterCounts = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM estoque_escolas'),
      pool.query('SELECT COUNT(*) as count FROM estoque_lotes'),
      pool.query('SELECT COUNT(*) as count FROM estoque_movimentacoes'),
      pool.query('SELECT COUNT(*) as count FROM estoque_escolas_historico')
    ]);
    
    console.log(`   - Estoques: ${afterCounts[0].rows[0].count}`);
    console.log(`   - Lotes: ${afterCounts[1].rows[0].count}`);
    console.log(`   - Movimentações: ${afterCounts[2].rows[0].count}`);
    console.log(`   - Histórico: ${afterCounts[3].rows[0].count}`);
    
    console.log('\n🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testReset();
}

module.exports = { testReset };