const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco LOCAL
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function limparConsumo() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando limpeza de consumo no banco LOCAL...\n');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'limpar-consumo-local.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o SQL
    await client.query('BEGIN');
    
    console.log('📝 Executando comandos SQL...\n');
    
    // 1. Limpar histórico
    const result1 = await client.query('DELETE FROM movimentacoes_consumo_modalidade');
    console.log(`✅ Movimentações apagadas: ${result1.rowCount}`);
    
    // 2. Resetar itens de faturamento
    const result2 = await client.query(`
      UPDATE faturamento_itens 
      SET consumo_registrado = false,
          data_consumo = NULL
    `);
    console.log(`✅ Itens de faturamento resetados: ${result2.rowCount}`);
    
    // 3. Resetar consumo nos contratos
    const result3 = await client.query(`
      UPDATE contrato_produtos_modalidades 
      SET quantidade_consumida = 0
    `);
    console.log(`✅ Contratos resetados: ${result3.rowCount}`);
    
    // 4. Resetar status dos faturamentos
    const result4 = await client.query(`
      UPDATE faturamentos 
      SET status = 'gerado' 
      WHERE status = 'consumido'
    `);
    console.log(`✅ Faturamentos resetados: ${result4.rowCount}`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Limpeza concluída com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`   - Movimentações apagadas: ${result1.rowCount}`);
    console.log(`   - Itens resetados: ${result2.rowCount}`);
    console.log(`   - Contratos resetados: ${result3.rowCount}`);
    console.log(`   - Faturamentos resetados: ${result4.rowCount}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao limpar consumo:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
limparConsumo()
  .then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  });
