const db = require('./dist/database');

async function verificarView() {
  try {
    console.log('🔍 Verificando se a view view_saldo_contratos_modalidades existe...\n');
    
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'view_saldo_contratos_modalidades'
      ) as existe;
    `);
    
    if (result.rows[0].existe) {
      console.log('✅ A view existe!');
      
      // Tentar fazer uma consulta simples
      console.log('\n🔍 Testando consulta na view...\n');
      const testResult = await db.query('SELECT * FROM view_saldo_contratos_modalidades LIMIT 1');
      console.log('✅ Consulta executada com sucesso!');
      console.log('Registros encontrados:', testResult.rows.length);
      
      if (testResult.rows.length > 0) {
        console.log('\nPrimeiro registro:');
        console.log(JSON.stringify(testResult.rows[0], null, 2));
      }
    } else {
      console.log('❌ A view NÃO existe!');
      console.log('\n📝 Execute a migration:');
      console.log('node run-migration.js create_saldo_contratos_modalidades.sql');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('\nDetalhes:', error);
  } finally {
    process.exit(0);
  }
}

verificarView();
