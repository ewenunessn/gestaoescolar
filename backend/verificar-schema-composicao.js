const db = require('./src/database.ts');

async function verificarSchema() {
  try {
    // Verificar colunas da tabela produto_composicao_nutricional
    const result = await db.pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'produto_composicao_nutricional'
      ORDER BY ordinal_position
    `);
    
    console.log('=== COLUNAS DA TABELA produto_composicao_nutricional ===');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    await db.pool.end();
  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

verificarSchema();
