require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'pedidos'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela pedidos:\n');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}`);
    });
    
    // Ver exemplo de dados
    const data = await pool.query('SELECT id, data_pedido, mes_competencia, ano_competencia FROM pedidos LIMIT 3');
    console.log('\n📊 Dados de exemplo:\n');
    data.rows.forEach(row => {
      console.log(`ID: ${row.id}, Data: ${row.data_pedido}, Competência: ${row.mes_competencia}/${row.ano_competencia}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();
