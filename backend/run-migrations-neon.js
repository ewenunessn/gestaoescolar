/**
 * Script para executar migrações no banco Neon (produção)
 * Execute este script para aplicar as migrações no ambiente de produção
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco Neon
const pool = new Pool({
  host: 'ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_PDfBTKRsi29G',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration(migrationFile, description) {
  console.log(`🔄 Executando migração: ${description}...`);
  
  try {
    // Ler o arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migração
    await pool.query(sql);
    
    console.log(`✅ Migração executada com sucesso: ${description}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro na migração ${description}:`, error.message);
    
    if (error.message.includes('already exists')) {
      console.log('💡 Info: A alteração já existe no banco de dados');
      return true;
    }
    
    return false;
  }
}

async function runAllMigrations() {
  console.log('🚀 Iniciando migrações no banco Neon...\n');
  
  const migrations = [
    {
      file: 'make-motivo-optional.sql',
      description: 'Tornar campo motivo opcional nas movimentações'
    },
    {
      file: 'add-data-validade-entrada-estoque-escolas.sql',
      description: 'Adicionar colunas data_validade e data_entrada na tabela estoque_escolas'
    }
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.description);
    if (success) successCount++;
    console.log(''); // Linha em branco para separar
  }
  
  console.log(`📊 Resumo: ${successCount}/${migrations.length} migrações executadas com sucesso`);
  
  if (successCount === migrations.length) {
    console.log('🎉 Todas as migrações foram aplicadas com sucesso no Neon!');
  } else {
    console.log('⚠️  Algumas migrações falharam. Verifique os logs acima.');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runAllMigrations()
    .then(() => {
      console.log('\n🔚 Processo de migração finalizado.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal:', error.message);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { runAllMigrations, runMigration };