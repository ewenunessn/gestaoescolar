const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Neon');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '20260315_create_funcoes_usuarios.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executando migration...');
    await client.query(sql);
    console.log('✅ Migration executada com sucesso!');

    // Verificar se as tabelas foram criadas
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('funcoes', 'funcao_permissoes')
      ORDER BY table_name
    `);
    console.log('📋 Tabelas criadas:', checkTables.rows.map(r => r.table_name));

    // Verificar dados inseridos
    const checkModulos = await client.query('SELECT COUNT(*) as total FROM modulos');
    console.log('📊 Total de módulos:', checkModulos.rows[0].total);

    const checkNiveis = await client.query('SELECT COUNT(*) as total FROM niveis_permissao');
    console.log('📊 Total de níveis de permissão:', checkNiveis.rows[0].total);

    const checkFuncoes = await client.query('SELECT COUNT(*) as total FROM funcoes');
    console.log('📊 Total de funções:', checkFuncoes.rows[0].total);

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

runMigration()
  .then(() => {
    console.log('✅ Processo concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Processo falhou:', error);
    process.exit(1);
  });
