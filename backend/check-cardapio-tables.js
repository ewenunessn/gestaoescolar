const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkCardapioNovo() {
  try {
    console.log('📋 Estrutura cardapio_refeicoes_dia:\n');
    
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cardapio_refeicoes_dia' 
      ORDER BY ordinal_position
    `);
    
    cols.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));
    
    console.log('\n📝 Dados de exemplo:');
    const dados = await pool.query(`
      SELECT crd.*, r.nome as refeicao_nome, cm.nome as cardapio_nome
      FROM cardapio_refeicoes_dia crd
      LEFT JOIN refeicoes r ON r.id = crd.refeicao_id
      LEFT JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      LIMIT 5
    `);
    
    console.log(JSON.stringify(dados.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkCardapioNovo();
