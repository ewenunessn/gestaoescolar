const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
});

async function verificarEstrutura() {
  try {
    // Verificar estrutura da tabela historico_entregas
    const histResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'historico_entregas'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ESTRUTURA DA TABELA historico_entregas ===\n');
    histResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar estrutura da tabela produtos
    const prodResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ESTRUTURA DA TABELA produtos ===\n');
    prodResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar estrutura da tabela guia_produto_escola
    const guiaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guia_produto_escola'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== ESTRUTURA DA TABELA guia_produto_escola ===\n');
    guiaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarEstrutura();
