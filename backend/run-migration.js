const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco Neon');

    const migrationPath = path.join(__dirname, 'src/migrations/20250127_create_configuracoes_sistema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executando migração...');
    await client.query(sql);
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'configuracoes_sistema'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Tabela configuracoes_sistema criada com sucesso!');
      
      // Verificar configurações inseridas
      const configs = await client.query('SELECT * FROM configuracoes_sistema');
      console.log(`✅ ${configs.rows.length} configuração(ões) inserida(s)`);
      configs.rows.forEach(config => {
        console.log(`   - ${config.chave}: ${config.valor} (${config.descricao})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
