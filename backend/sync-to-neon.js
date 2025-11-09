/**
 * Script para sincronizar migrations do PostgreSQL local para o Neon
 * 
 * Este script executa todas as migrations necessárias no banco Neon
 * para garantir que ele tenha as mesmas tabelas que o PostgreSQL local
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do Neon (produção)
const neonConfig = {
  connectionString: process.env.DATABASE_URL_NEON || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
};

// Lista de migrations críticas que devem ser executadas no Neon
const criticalMigrations = [
  '014_create_institutions_hierarchy.sql',
  '015_create_system_admins.sql',
  '016_add_institution_plans.sql'
];

// Lista de migrations opcionais (já podem existir)
const optionalMigrations = [
  '001_create_tenant_tables.sql',
  '002_add_tenant_id_simple.sql',
  '011_add_tenant_to_estoque_tables.sql',
  '012_inventory_tenant_data_migration.sql',
  '013_optimize_inventory_performance.sql'
];

async function checkTableExists(client, tableName) {
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function executeMigration(client, migrationFile) {
  const migrationPath = path.join(__dirname, 'migrations', migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  Migration não encontrada: ${migrationFile}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(`\n📄 Executando: ${migrationFile}`);
  console.log(`   Tamanho: ${(sql.length / 1024).toFixed(2)} KB`);
  
  try {
    await client.query(sql);
    console.log(`✅ Sucesso: ${migrationFile}`);
    return true;
  } catch (error) {
    console.error(`❌ Erro em ${migrationFile}:`, error.message);
    
    // Se for erro de "já existe", não é crítico
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate key') ||
        error.message.includes('does not exist')) {
      console.log(`⚠️  Aviso: Tabela/objeto já existe ou não encontrado - continuando...`);
      return true;
    }
    
    return false;
  }
}

async function checkMigrationStatus(client) {
  console.log('\n🔍 Verificando status das tabelas no Neon...\n');
  
  const tables = [
    'institutions',
    'institution_users',
    'institution_contracts',
    'institution_audit_log',
    'system_admins',
    'system_admin_audit_log',
    'institution_plans',
    'tenants',
    'tenant_users',
    'usuarios',
    'escolas',
    'produtos',
    'contratos'
  ];
  
  const status = {};
  
  for (const table of tables) {
    const exists = await checkTableExists(client, table);
    status[table] = exists;
    console.log(`${exists ? '✅' : '❌'} ${table.padEnd(30)} ${exists ? 'EXISTS' : 'MISSING'}`);
  }
  
  return status;
}

async function syncToNeon() {
  console.log('🚀 Iniciando sincronização com Neon...\n');
  console.log('📡 Conectando ao Neon...');
  
  const client = new Client(neonConfig);
  
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon!\n');
    
    // Verificar status atual
    const statusBefore = await checkMigrationStatus(client);
    
    console.log('\n📦 Executando migrations críticas...\n');
    
    // Executar migrations críticas
    for (const migration of criticalMigrations) {
      await executeMigration(client, migration);
    }
    
    console.log('\n📦 Executando migrations opcionais...\n');
    
    // Executar migrations opcionais (ignorar erros)
    for (const migration of optionalMigrations) {
      await executeMigration(client, migration);
    }
    
    // Verificar status final
    console.log('\n🔍 Verificando status final...\n');
    const statusAfter = await checkMigrationStatus(client);
    
    // Resumo
    console.log('\n📊 RESUMO DA SINCRONIZAÇÃO\n');
    console.log('Tabelas criadas:');
    
    let created = 0;
    for (const table in statusAfter) {
      if (!statusBefore[table] && statusAfter[table]) {
        console.log(`  ✅ ${table}`);
        created++;
      }
    }
    
    if (created === 0) {
      console.log('  ℹ️  Nenhuma tabela nova criada (todas já existiam)');
    }
    
    console.log(`\n✅ Sincronização concluída! ${created} tabelas criadas.`);
    
  } catch (error) {
    console.error('\n❌ Erro na sincronização:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Conexão encerrada.');
  }
}

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_NEON) {
  console.error('❌ Erro: DATABASE_URL ou DATABASE_URL_NEON não configurado!');
  console.log('\nConfigure a variável de ambiente:');
  console.log('  export DATABASE_URL="postgresql://user:pass@host/db"');
  console.log('  ou');
  console.log('  export DATABASE_URL_NEON="postgresql://user:pass@host/db"');
  process.exit(1);
}

// Executar
syncToNeon().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
