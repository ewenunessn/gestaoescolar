const db = require('./dist/database');

(async () => {
  try {
    console.log('Verificando tabelas relacionadas ao estoque...');
    
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%estoque%' OR table_name LIKE '%moviment%')
      ORDER BY table_name
    `);
    
    console.log('\nTabelas encontradas:');
    if (result.rows.length === 0) {
      console.log('Nenhuma tabela encontrada com esses critérios.');
    } else {
      result.rows.forEach(row => {
        console.log('- ' + row.table_name);
      });
    }
    
    // Verificar todas as tabelas disponíveis
    console.log('\nTodas as tabelas disponíveis:');
    const allTables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    allTables.rows.forEach(row => {
      console.log('- ' + row.table_name);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    process.exit(0);
  }
})();