const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Estrutura da tabela PRODUTOS:');
    console.table(result.rows);
    
    const hasUnidade = result.rows.some(r => r.column_name === 'unidade');
    console.log('\n✅ Campo "unidade" existe?', hasUnidade ? 'SIM' : 'NÃO');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkSchema();
