const fs = require('fs');
const path = require('path');
const db = require('./dist/database.js');

async function executarMigracaoFaturamento() {
  console.log('🚀 Executando migração das tabelas de faturamento...\n');
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'src/migrations/create_faturamento_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Arquivo de migração carregado');
    console.log('🔧 Executando comandos SQL...\n');
    
    // Dividir o SQL em comandos individuais
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    for (const command of commands) {
      if (command.trim()) {
        console.log(`Executando: ${command.substring(0, 50)}...`);
        await db.query(command);
      }
    }
    
    console.log('\n✅ Migração executada com sucesso!');
    
    // Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    
    const tabelas = ['faturamentos', 'faturamento_itens'];
    
    for (const tabela of tabelas) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tabela]);
      
      if (result.rows[0].exists) {
        console.log(`✅ Tabela '${tabela}' criada com sucesso`);
        
        // Mostrar estrutura da tabela
        const estrutura = await db.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [tabela]);
        
        console.log(`📋 Estrutura da tabela '${tabela}':`);
        estrutura.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
        console.log('');
      } else {
        console.log(`❌ Tabela '${tabela}' não foi criada`);
      }
    }
    
    // Verificar índices
    console.log('🔍 Verificando índices criados...');
    const indices = await db.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND (tablename = 'faturamentos' OR tablename = 'faturamento_itens')
      ORDER BY tablename, indexname;
    `);
    
    console.log('📋 Índices criados:');
    indices.rows.forEach(idx => {
      console.log(`  - ${idx.indexname} (${idx.tablename})`);
    });
    
    console.log('\n🎉 Sistema de faturamento pronto para uso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar migração
if (require.main === module) {
  executarMigracaoFaturamento()
    .then(() => {
      console.log('\n✅ Migração concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na migração:', error);
      process.exit(1);
    });
}

module.exports = { executarMigracaoFaturamento };