/**
 * Script para executar migração de criação das tabelas de tenant
 * Execute com: node run-tenant-migration.js
 */

const fs = require('fs');
const path = require('path');

// Importar configuração do banco baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./dist/database-vercel") : require("./dist/database");

async function runTenantMigration() {
  try {
    console.log('🚀 Iniciando migração de tenant...');
    
    // Testar conexão
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Falha na conexão com o banco de dados');
    }
    
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', '001_create_tenant_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executando migração: 001_create_tenant_tables.sql');
    
    // Executar migração diretamente (não em transação para DDL)
    console.log('  Executando migração completa...');
    await db.query(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('tenants', 'tenant_configurations', 'tenant_users', 'tenant_audit_log')
      ORDER BY table_name
    `);
    
    console.log('📊 Tabelas criadas:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Verificar tenant padrão
    const defaultTenantResult = await db.query(`
      SELECT id, slug, name, status 
      FROM tenants 
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `);
    
    if (defaultTenantResult.rows.length > 0) {
      const tenant = defaultTenantResult.rows[0];
      console.log(`🏢 Tenant padrão criado: ${tenant.name} (${tenant.slug}) - Status: ${tenant.status}`);
    }
    
    // Verificar configurações padrão
    const configsResult = await db.query(`
      SELECT category, key, value 
      FROM tenant_configurations 
      WHERE tenant_id = '00000000-0000-0000-0000-000000000000'
      ORDER BY category, key
    `);
    
    console.log(`⚙️  Configurações padrão criadas: ${configsResult.rows.length} itens`);
    
    console.log('\n🎉 Migração de tenant concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Implementar middleware de tenant');
    console.log('2. Adicionar tenant_id às tabelas existentes');
    console.log('3. Implementar Row Level Security (RLS)');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    console.error('\nDetalhes do erro:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fechar conexão
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

// Executar migração
runTenantMigration();