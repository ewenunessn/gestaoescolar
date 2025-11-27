const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Usar as mesmas credenciais do .env ou padrão
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');
    console.log('🔄 Executando migration de permissões...\n');
    
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations/022_create_user_permissions.sql'),
      'utf8'
    );
    
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!\n');
    console.log('📋 Estrutura criada:');
    console.log('   ✓ Tabela: modulos (15 módulos cadastrados)');
    console.log('   ✓ Tabela: niveis_permissao (4 níveis)');
    console.log('   ✓ Tabela: usuario_permissoes\n');
    console.log('📝 Níveis de permissão disponíveis:');
    console.log('   0 - Nenhum (sem acesso)');
    console.log('   1 - Leitura (visualizar)');
    console.log('   2 - Escrita (editar)');
    console.log('   3 - Admin (acesso total)\n');
    
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
