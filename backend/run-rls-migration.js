/**
 * Script para executar migração de Row Level Security (RLS)
 * Execute com: node run-rls-migration.js
 */

const fs = require('fs');
const path = require('path');

// Importar configuração do banco baseada no ambiente
const db = process.env.VERCEL === '1' ? require("./dist/database-vercel") : require("./dist/database");

async function runRLSMigration() {
  try {
    console.log('🚀 Iniciando migração de Row Level Security (RLS)...');
    
    // Testar conexão
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Falha na conexão com o banco de dados');
    }
    
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', '003_implement_row_level_security.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executando migração: 003_implement_row_level_security.sql');
    
    // Executar migração
    console.log('  Executando migração completa...');
    await db.query(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar status do RLS
    const rlsStatusResult = await db.query(`
      SELECT * FROM rls_status ORDER BY tablename
    `);
    
    console.log('📊 Status do Row Level Security:');
    rlsStatusResult.rows.forEach(row => {
      const status = row.rls_enabled ? '✅ Ativo' : '❌ Inativo';
      console.log(`  ${row.tablename}: ${status} (${row.policy_count} políticas)`);
    });
    
    // Verificar funções criadas
    const functionsResult = await db.query(`
      SELECT 
        proname as function_name,
        pg_get_function_arguments(oid) as arguments
      FROM pg_proc 
      WHERE proname IN ('set_tenant_context', 'get_current_tenant_id', 'clear_tenant_context')
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY proname
    `);
    
    console.log('🔧 Funções de tenant criadas:');
    functionsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.function_name}(${row.arguments})`);
    });
    
    // Verificar políticas criadas
    const policiesResult = await db.query(`
      SELECT 
        tablename,
        policyname,
        cmd,
        qual
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND policyname LIKE 'tenant_isolation_%'
      ORDER BY tablename, policyname
    `);
    
    console.log('🛡️  Políticas RLS criadas:');
    const policiesByTable = {};
    policiesResult.rows.forEach(row => {
      if (!policiesByTable[row.tablename]) {
        policiesByTable[row.tablename] = [];
      }
      policiesByTable[row.tablename].push(row.policyname);
    });
    
    Object.keys(policiesByTable).forEach(table => {
      console.log(`  ${table}: ${policiesByTable[table].length} política(s)`);
    });
    
    // Testar contexto de tenant
    console.log('🧪 Testando contexto de tenant...');
    
    try {
      // Testar função de contexto
      const contextTest = await db.query(`SELECT get_current_tenant_id() as current_tenant`);
      console.log(`  Tenant atual: ${contextTest.rows[0].current_tenant || 'Não definido'}`);
      
      // Testar definição de contexto
      await db.query(`SELECT set_tenant_context('00000000-0000-0000-0000-000000000000')`);
      const contextAfterSet = await db.query(`SELECT get_current_tenant_id() as current_tenant`);
      console.log(`  Tenant após set_tenant_context: ${contextAfterSet.rows[0].current_tenant}`);
      
      // Testar consulta com RLS
      const schoolsTest = await db.query(`SELECT COUNT(*) as total FROM escolas`);
      console.log(`  Escolas visíveis com RLS: ${schoolsTest.rows[0].total}`);
      
    } catch (error) {
      console.log(`  ⚠️  Erro no teste de contexto: ${error.message}`);
    }
    
    console.log('\n🎉 Migração de RLS concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. Atualizar controllers para usar tenant context');
    console.log('2. Testar isolamento de dados entre tenants');
    console.log('3. Implementar middleware de tenant nos endpoints');
    
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
runRLSMigration();