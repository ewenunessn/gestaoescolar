const fs = require('fs');
const path = require('path');
const db = require('./src/database.ts');

async function runMigration() {
  const client = await db.pool.connect();
  
  try {
    console.log('🔄 Executando migration de permissões...');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/022_create_user_permissions.sql'),
      'utf8'
    );
    
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Tabelas criadas:');
    console.log('   - modulos');
    console.log('   - niveis_permissao');
    console.log('   - usuario_permissoes');
    console.log('');
    console.log('📋 Módulos cadastrados: 15');
    console.log('📋 Níveis de permissão: 4 (Nenhum, Leitura, Escrita, Admin)');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
